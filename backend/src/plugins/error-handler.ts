import { Elysia } from 'elysia'
import { logger } from '@/libs/logger'

export const errorHandler = new Elysia({ name: 'error-handler' }).onError(
  ({ code, error, set }) => {
    // Safe error logging
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    logger.error(`[${code}] ${errorMessage}`, {
      stack: errorStack,
    })

    // Check for specific business logic errors (BEFORE switch statement)
    if (errorMessage.includes('Email already registered')) {
      set.status = 400
      return {
        success: false,
        error: 'Bad Request',
        message: 'Email already registered',
      }
    }

    if (errorMessage.includes('Invalid email or password')) {
      set.status = 400
      return {
        success: false,
        error: 'Bad Request',
        message: 'Invalid email or password',
      }
    }

    if (errorMessage.includes('Unauthorized')) {
      set.status = 401
      return {
        success: false,
        error: 'Unauthorized',
        message: errorMessage,
      }
    }

    switch (code) {
      case 'VALIDATION':
        set.status = 400
        return {
          success: false,
          error: 'Validation Error',
          message: errorMessage,
        }

      case 'NOT_FOUND':
        set.status = 404
        return {
          success: false,
          error: 'Not Found',
          message: errorMessage,
        }

      case 'PARSE':
        set.status = 400
        return {
          success: false,
          error: 'Parse Error',
          message: 'Invalid request body',
        }

      case 'INTERNAL_SERVER_ERROR':
        set.status = 500
        return {
          success: false,
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
        }

      case 'UNKNOWN':
      default:
        set.status = 500
        return {
          success: false,
          error: 'Server Error',
          message: errorMessage,
        }
    }
  }
)