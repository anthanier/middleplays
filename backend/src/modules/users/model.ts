import { Type, Static } from '@sinclair/typebox'

// ==================== SCHEMAS ====================

export const userProfileSchema = Type.Object({
  id: Type.String(),
  email: Type.String(),
  role: Type.String(),
  isEmailVerified: Type.Boolean(),
  createdAt: Type.Date(),
  profile: Type.Object({
    fullName: Type.Union([Type.String(), Type.Null()]),
    phone: Type.Union([Type.String(), Type.Null()]),
    avatarUrl: Type.Union([Type.String(), Type.Null()]),
    balance: Type.String(),
    totalSales: Type.Number(),
    totalPurchases: Type.Number(),
    rating: Type.String(),
  })
})

export const updateProfileSchema = Type.Object({
  fullName: Type.Optional(Type.String({ minLength: 2, maxLength: 255 })),
  phone: Type.Optional(Type.String({ minLength: 10, maxLength: 20, pattern: '^[0-9+\\-\\s()]+$' })),
})

export const changePasswordSchema = Type.Object({
  oldPassword: Type.String(),
  newPassword: Type.String({
    minLength: 8,
    maxLength: 100,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$',
    errorMessage: 'Password must be at least 8 characters with uppercase, lowercase, and number',
  }),
})

// ==================== RESPONSES ====================

export const userProfileResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: userProfileSchema
})

export const genericSuccessResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
})


// ==================== TYPES ====================

export type UserProfileResponse = Static<typeof userProfileResponseSchema>
export type UpdateProfileRequest = Static<typeof updateProfileSchema>
export type ChangePasswordRequest = Static<typeof changePasswordSchema>
