import Redis from 'ioredis'
import { env } from '@/configs/env'
import { logger } from './logger'

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  lazyConnect: true, // Don't connect immediately
})

// Connection event handlers
redis.on('connect', () => {
  logger.info('Redis connected')
})

redis.on('ready', () => {
  logger.success('Redis ready')
})

redis.on('error', (err) => {
  logger.error('Redis error', { message: err.message })
})

redis.on('close', () => {
  logger.warn('Redis connection closed')
})

// Helper functions
export const redisHelpers = {
  // Cache with expiry
  async setCache(key: string, value: any, ttlSeconds = 3600) {
    await redis.setex(key, ttlSeconds, JSON.stringify(value))
  },
  
  async getCache<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key)
      if (!data) return null
      return JSON.parse(data) as T
    } catch (error) {
      logger.warn('Failed to parse cache data', { key, error })
      // Delete corrupted cache
      await redis.del(key)
      return null
    }
  },
  
  async deleteCache(key: string) {
    await redis.del(key)
  },
  
  async deleteCachePattern(pattern: string) {
    // Use SCAN instead of KEYS to avoid blocking in production
    const stream = redis.scanStream({
      match: pattern,
      count: 100,
    })
    
    const keys: string[] = []
    stream.on('data', (resultKeys: string[]) => {
      keys.push(...resultKeys)
    })
    
    await new Promise<void>((resolve, reject) => {
      stream.on('end', resolve)
      stream.on('error', reject)
    })
    
    if (keys.length > 0) {
      // Delete in batches to avoid blocking
      const batchSize = 100
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize)
        await redis.del(...batch)
      }
    }
  },
}