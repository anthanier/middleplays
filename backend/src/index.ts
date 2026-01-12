import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'

// Config & validation
import { env, validateEnv } from '@/configs/env'

// Plugins
import { jwtPlugin } from '@/plugins/jwt'
import { errorHandler } from '@/plugins/error-handler'
import { globalRateLimit } from '@/plugins/rate-limit'

// Database & Redis
import { db, closeDatabase, checkDbConnection } from '@/db'
import { redis } from '@/libs/redis'
import { logger } from '@/libs/logger'

// Modules
import { authModule } from '@/modules/auth'
import { usersModule } from '@/modules/users'
import { gamesModule } from '@/modules/games'
import { postingsModule } from '@/modules/postings'
import { transactionsModule } from '@/modules/transactions'

// Validate environment on startup
validateEnv()

const app = new Elysia()
  // Global plugins
  .use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    })
  )
  .use(errorHandler)
  .use(jwtPlugin)
  .use(globalRateLimit)

  // Decorate context with db & redis
  .decorate('db', db)
  .decorate('redis', redis)

  // Health check
  .get('/health', async () => {
    const dbOk = await checkDbConnection()
    const redisOk = redis.status === 'ready'
    
    return {
      status: dbOk && redisOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      services: {
        database: dbOk ? 'ok' : 'error',
        redis: redisOk ? 'ok' : 'error',
      },
    }
  })

  // API info
  .get('/', () => ({
    name: 'Game Store API',
    version: '1.0.0',
    docs: '/health',
  }))

  // Mount modules
  .use(authModule)
  .use(usersModule)
  .use(gamesModule)
  .use(postingsModule)
  .use(transactionsModule)

  .listen(env.PORT)

// Startup logs
logger.success(`🦊 Elysia running at http://${app.server?.hostname}:${app.server?.port}`)
logger.info(`Environment: ${env.NODE_ENV}`)
logger.info(`Database: Connected`)

// Connect Redis with proper error handling
redis
  .connect()
  .then(() => logger.success('Redis: Connected'))
  .catch((err) => {
    logger.error('Redis connection failed', err)
    // In production, you might want to exit if Redis is critical
    if (env.NODE_ENV === 'production') {
      logger.warn('Continuing without Redis (rate limiting disabled)')
    }
  })

// Graceful shutdown handler (consolidated)
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, closing server...`)
  
  try {
    // Close Redis connection
    await redis.quit()
    logger.success('Redis connection closed')
    
    // Close database connection
    await closeDatabase()
    logger.success('Database connection closed')
    
    process.exit(0)
  } catch (error) {
    logger.error('Error during shutdown', error)
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

export type App = typeof app