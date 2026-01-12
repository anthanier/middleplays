import { Type, Static } from '@sinclair/typebox'

// From project summary: 3% platform fee + 2,500 IDR disbursement fee
const PLATFORM_FEE_PERCENTAGE = 0.03; // 3%
const DISBURSEMENT_FEE = 2500;

interface FeeCalculation {
  itemPrice: number;
  platformFeeAmount: number;
  disbursementFee: number;
  totalBuyerPaid: number;
  sellerReceived: number;
}

/**
 * Calculates the platform fees and final amounts for a transaction.
 * @param itemPrice The original price of the item set by the seller.
 * @returns An object with the detailed fee breakdown.
 */
export function calculateFees(itemPrice: number): FeeCalculation {
  if (itemPrice <= 0) {
    throw new Error("Item price must be positive.");
  }

  // Platform fee is 3% of the item price
  const platformFeeAmount = Math.round(itemPrice * PLATFORM_FEE_PERCENTAGE);

  // For now, payment gateway fee is assumed to be 0.
  // In a real scenario, this would be calculated based on the chosen payment method.
  // Xendit might add this to the invoice directly. We'll set the buyer total here.
  const paymentGatewayFee = 0;

  // The total amount the buyer has to pay
  const totalBuyerPaid = itemPrice + paymentGatewayFee;
  
  // The amount the seller receives after all deductions
  const sellerReceived = itemPrice - platformFeeAmount - DISBURSEMENT_FEE;

  return {
    itemPrice,
    platformFeeAmount,
    disbursementFee: DISBURSEMENT_FEE,
    totalBuyerPaid,
    sellerReceived,
  };
}
