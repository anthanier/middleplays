import { Elysia } from 'elysia'
import { requireAuth } from '@/middlewares/auth'
import {
  createPurchaseSchema,
  createPurchaseResponseSchema,
} from './model'
import {
  createPurchase
} from './service'

export const transactionsModule = new Elysia({ prefix: '/transactions', name: 'transactions-module' })
  .use(requireAuth) // All routes in this module require authentication

  // ==================== CREATE NEW PURCHASE ====================
  .post(
    '/purchase',
    async ({ userId, body, set }) => {
      // userId is guaranteed to be present by requireAuth middleware
      const result = await createPurchase(userId!, body);
      
      set.status = 201; // 201 Created
      return {
        success: true,
        data: {
          transactionId: result.transactionId,
          paymentUrl: result.paymentUrl,
          expiresAt: result.expiresAt,
        },
      }
    },
    {
      body: createPurchaseSchema,
      response: createPurchaseResponseSchema,
      detail: {
        tags: ['Transactions'],
        summary: 'Initiate a purchase for a game account',
        description: 'Creates a transaction record and returns a payment link from the payment gateway.',
      },
    }
  )
