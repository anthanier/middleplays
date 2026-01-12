import { Type, Static } from '@sinclair/typebox'

// ==================== REQUEST SCHEMAS ====================

export const registerRequestSchema = Type.Object({
  email: Type.String({
    format: 'email',
    minLength: 5,
    maxLength: 255,
  }),
  password: Type.String({
    minLength: 8,
    maxLength: 100,
    // ✅ FIXED: Now enforces 8+ chars AND uppercase, lowercase, number
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$',
    errorMessage: 'Password must be at least 8 characters with uppercase, lowercase, and number',
  }),
  fullName: Type.Optional(Type.String({
    minLength: 2,
    maxLength: 255,
  })),
  phone: Type.Optional(Type.String({
    minLength: 10,
    maxLength: 20,
    pattern: '^[0-9+\\-\\s()]+$',
  })),
})

export const loginRequestSchema = Type.Object({
  email: Type.String({
    format: 'email',
  }),
  password: Type.String({
    minLength: 1,
  }),
})

export const refreshTokenRequestSchema = Type.Object({
  refreshToken: Type.String({
    minLength: 1,
  }),
})

export const verifyEmailRequestSchema = Type.Object({
  token: Type.String({
    minLength: 1,
    description: 'The email verification token from the link.',
  }),
})

// ==================== RESPONSE SCHEMAS ====================

export const authResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    user: Type.Object({
      id: Type.String(),
      email: Type.String(),
      role: Type.String(),
      isEmailVerified: Type.Boolean(),
    }),
    accessToken: Type.String(),
    refreshToken: Type.String(),
  }),
})

export const refreshTokenResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    accessToken: Type.String(),
  }),
})

export const verifyEmailResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
})

// ==================== TYPES ====================

export type RegisterRequest = Static<typeof registerRequestSchema>
export type LoginRequest = Static<typeof loginRequestSchema>
export type RefreshTokenRequest = Static<typeof refreshTokenRequestSchema>
export type VerifyEmailRequest = Static<typeof verifyEmailRequestSchema>

export type AuthResponse = Static<typeof authResponseSchema>
export type RefreshTokenResponse = Static<typeof refreshTokenResponseSchema>
export type VerifyEmailResponse = Static<typeof verifyEmailResponseSchema>