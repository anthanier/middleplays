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
      try {
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
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        
        if (errorMessage.includes('no longer available') || errorMessage.includes('not available')) {
          set.status = 400
          return {
            success: false,
            error: 'Bad Request',
            message: 'This account is no longer available for purchase.',
          }
        }
        
        if (errorMessage.includes('cannot purchase your own')) {
          set.status = 400
          return {
            success: false,
            error: 'Bad Request',
            message: 'You cannot purchase your own posting.',
          }
        }
        
        throw error
      }
    },
    {
      body: createPurchaseSchema,
      detail: {
        tags: ['Transactions'],
        summary: 'Initiate a purchase for a game account',
        description: 'Creates a transaction record and returns a payment link from the payment gateway.',
      },
    }
  )
