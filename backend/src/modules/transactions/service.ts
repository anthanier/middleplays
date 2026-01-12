import { db } from '@/db'
import { transactions, gameAccounts, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { logger } from '@/libs/logger'
import { calculateFees } from './utils'
import { createId } from '@paralleldrive/cuid2'
import type { CreatePurchaseRequest } from './model'
// MOCK Xendit client - in a real project, this would be in its own lib file.
import { xenditClient } from '@/libs/xendit'

/**
 * Creates a new purchase transaction for a game account.
 * @param buyerId The ID of the user making the purchase.
 * @param data The purchase request data, containing the gameAccountId.
 */
export async function createPurchase(buyerId: string, data: CreatePurchaseRequest) {
  const { gameAccountId } = data;

  try {
    // Use a transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // 1. Find and lock the account posting
      const posting = await tx.query.gameAccounts.findFirst({
        where: and(
          eq(gameAccounts.id, gameAccountId),
          eq(gameAccounts.status, 'active') // Ensure it's still available
        ),
      });

      if (!posting) {
        throw new Error('This account is no longer available for purchase.');
      }

      // 2. Validate the purchase
      if (posting.sellerId === buyerId) {
        throw new Error('You cannot purchase your own posting.');
      }
      
      const buyer = await tx.query.users.findFirst({ where: eq(users.id, buyerId) });
      if (!buyer) throw new Error('Buyer account not found.'); // Should not happen

      // 3. Calculate fees
      const price = Number(posting.price);
      const fees = calculateFees(price);

      // 4. Create the transaction record
      const transactionId = createId(); // Generate a unique transaction ID
      const [newTransaction] = await tx.insert(transactions).values({
        id: transactionId,
        buyerId,
        sellerId: posting.sellerId,
        gameAccountId: posting.id,
        itemPrice: String(fees.itemPrice),
        platformFeeAmount: String(fees.platformFeeAmount),
        disbursementFee: String(fees.disbursementFee),
        totalBuyerPaid: String(fees.totalBuyerPaid),
        sellerReceived: String(fees.sellerReceived),
        status: 'pending', // Pending until payment is confirmed
        paymentStatus: 'pending',
      }).returning();

      if (!newTransaction) {
        throw new Error('Failed to create transaction record.');
      }

      // 5. Update the game account status to prevent double-selling
      await tx.update(gameAccounts)
        .set({ status: 'sold' })
        .where(eq(gameAccounts.id, gameAccountId));
      
      logger.info(`Marked game account ${gameAccountId} as 'sold' pending payment.`);

      // 6. MOCK - Create an invoice with Xendit
      const xenditInvoice = await xenditClient.createInvoice({
        external_id: transactionId,
        amount: fees.totalBuyerPaid,
        payer_email: buyer.email,
        description: `Purchase of ${posting.title}`,
      });

      if (!xenditInvoice.invoice_url) {
        throw new Error('Failed to create payment link.');
      }
      
      // 7. Update transaction with payment gateway reference
      await tx.update(transactions)
        .set({ 
            paymentGatewayRef: xenditInvoice.id,
            // In a real app, expiry would come from Xendit
            // Here we set it to 1 hour from now.
            expiresAt: new Date(Date.now() + 3600 * 1000) 
        })
        .where(eq(transactions.id, transactionId));

      return {
        transactionId: newTransaction.id,
        paymentUrl: xenditInvoice.invoice_url,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      };
    });

    logger.info(`Purchase initiated for transaction ID: ${result.transactionId}`);
    return result;

  } catch (error) {
    logger.error('Purchase creation failed', error);
    if (error instanceof Error) {
      // Rethrow specific, safe error messages
      throw error;
    }
    throw new Error('Failed to initiate purchase. Please try again.');
  }
}
