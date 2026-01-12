import { Elysia, t } from 'elysia'
import { jwtPlugin } from '@/plugins/jwt'
import { rateLimitPlugin } from '@/plugins/rate-limit'
import { logger } from '@/libs/logger'
import {
  registerRequestSchema,
  loginRequestSchema,
  refreshTokenRequestSchema,
  verifyEmailRequestSchema,
  authResponseSchema,
  refreshTokenResponseSchema,
  verifyEmailResponseSchema,
} from './model'
import { registerUser, loginUser, verifyRefreshToken, verifyEmail } from './service'

export const authModule = new Elysia({ prefix: '/auth', name: 'auth' })
  .use(jwtPlugin)
  .use(rateLimitPlugin)

  // ==================== REGISTER ====================
  .post(
    '/register',
    async ({ body, jwt, jwtRefresh, checkRateLimit, request }) => {
      // Rate limiting for registration
      const ip = request.headers.get('x-forwarded-for') || 'unknown'
      await checkRateLimit(`register:${ip}`, {
        max: 5, // 5 registrations
        window: 3600, // per hour
      })

      // Register user
      const user = await registerUser(body)

      // Generate tokens
      const accessToken = await jwt.sign({ userId: user.id, type: 'access' })
      const refreshToken = await jwtRefresh.sign({ userId: user.id, type: 'refresh' })

      logger.info(`User registered successfully: ${user.email}`)

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
          },
          accessToken,
          refreshToken,
        },
      }
    },
    {
      body: registerRequestSchema,
      detail: {
        tags: ['Auth'],
        summary: 'Register new user',
        description: 'Create a new user account with email and password',
      },
    }
  )

  // ==================== LOGIN ====================
  .post(
    '/login',
    async ({ body, jwt, jwtRefresh, checkRateLimit, request }) => {
      // Rate limiting for login
      const ip = request.headers.get('x-forwarded-for') || 'unknown'
      await checkRateLimit(`login:${body.email}`, {
        max: 5, // 5 login attempts
        window: 900, // per 15 minutes
      })

      // Login user
      const user = await loginUser(body)

      // Generate tokens
      const accessToken = await jwt.sign({ userId: user.id, type: 'access' })
      const refreshToken = await jwtRefresh.sign({ userId: user.id, type: 'refresh' })

      logger.info(`User logged in successfully: ${user.email}`)

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
          },
          accessToken,
          refreshToken,
        },
      }
    },
    {
      body: loginRequestSchema,
      detail: {
        tags: ['Auth'],
        summary: 'Login user',
        description: 'Authenticate user with email and password',
      },
    }
  )

  // ==================== REFRESH TOKEN ====================
  .post(
    '/refresh',
    async ({ body, jwtRefresh, jwt }) => {
      // Verify refresh token
      const user = await verifyRefreshToken(body.refreshToken, jwtRefresh)

      // Generate new access token
      const accessToken = await jwt.sign({ userId: user.id, type: 'access' })

      logger.info(`Token refreshed for user: ${user.email}`)

      return {
        success: true,
        data: {
          accessToken,
        },
      }
    },
    {
      body: refreshTokenRequestSchema,
      detail: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        description: 'Get new access token using refresh token',
      },
    }
  )

  // ==================== VERIFY EMAIL ====================
  .get(
    '/verify-email',
    async ({ query }) => {
      const result = await verifyEmail(query.token)

      // In a real frontend, you would redirect to a "success" page.
      // For an API, returning a success message is appropriate.
      return {
        success: result.success,
        message: result.message,
      }
    },
    {
      query: verifyEmailRequestSchema,
      response: verifyEmailResponseSchema,
      detail: {
        tags: ['Auth'],
        summary: 'Verify email',
        description: 'Verify user email with a token sent to their inbox.',
      },
    }
  )
