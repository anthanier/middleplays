import { Elysia } from 'elysia'
import { redis } from '@/libs/redis'
import { logger } from '@/libs/logger'

interface RateLimitOptions {
  max: number // Max requests
  window: number // Time window in seconds
}

// 1. Tambahkan { as: 'global' } pada derive
export const rateLimitPlugin = new Elysia({ name: 'rate-limit' }).derive(
  { as: 'global' },
  () => ({
    checkRateLimit: async (key: string, options: RateLimitOptions) => {
      const { max, window } = options
      const redisKey = `ratelimit:${key}`

      try {
        // Use Lua script for atomic operation (fix race condition)
        const script = `
          local current = redis.call('INCR', KEYS[1])
          if current == 1 then
            redis.call('EXPIRE', KEYS[1], ARGV[1])
          end
          return current
        `
        const current = await redis.eval(script, 1, redisKey, window.toString()) as number

        if (current > max) {
          throw new Error('Too many requests. Please try again later.')
        }

        return {
          current,
          remaining: Math.max(0, max - current),
          reset: await redis.ttl(redisKey),
        }
      } catch (error) {
        // If Redis fails, allow request (fail open)
        if (error instanceof Error && error.message.includes('Too many requests')) {
            throw error
        }
        logger.warn('Rate limit check failed, allowing request', { error })
        return { current: 0, remaining: max, reset: window }
      }
    },
  })
)

// 2. Tambahkan { as: 'global' } pada onBeforeHandle agar middleware ini terbawa saat di-use di index.ts
export const globalRateLimit = new Elysia({ name: 'global-rate-limit' })
  .use(rateLimitPlugin)
  .onBeforeHandle({ as: 'global' }, async ({ request, checkRateLimit }) => {
    // x-forwarded-for bisa mengembalikan string atau null, kita pastikan tipenya string
    const ip = request.headers.get('x-forwarded-for') || 'unknown'

    try {
      await checkRateLimit(`global:${ip}`, {
        max: 100, // 100 requests
        window: 60, // per 60 seconds
      })
    } catch (error) {
      // Re-throw error agar ditangkap oleh Elysia error handler
      throw error
    }
  })