import { Type, Static } from '@sinclair/typebox'

// ==================== SCHEMAS ====================

export const createPurchaseSchema = Type.Object({
  gameAccountId: Type.String({ format: 'uuid' }),
})


// ==================== RESPONSES ====================

export const createPurchaseResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    transactionId: Type.String(),
    paymentUrl: Type.String({ format: 'uri' }),
    expiresAt: Type.Date(),
  })
})


// ==================== TYPES ====================

export type CreatePurchaseRequest = Static<typeof createPurchaseSchema>
