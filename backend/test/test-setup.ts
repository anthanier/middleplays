import { Elysia } from 'elysia'
import { jwtPlugin } from '@/plugins/jwt'
import { errorHandler } from '@/plugins/error-handler'
import { db } from '@/db'
import { redis } from '@/libs/redis'
import { authModule } from '@/modules/auth'
import { usersModule } from '@/modules/users'
import { gamesModule } from '@/modules/games'
import { postingsModule } from '@/modules/postings'
import { transactionsModule } from '@/modules/transactions'

// ✅ FIXED: Function-based initialization (no global variable)
export function getApp() {
  return new Elysia()
    .use(errorHandler)
    .use(jwtPlugin)
    .decorate('db', db)
    .decorate('redis', redis)
    .use(authModule)
    .use(usersModule)
    .use(gamesModule)
    .use(postingsModule)
    .use(transactionsModule);
}

// ✅ Test helper: Clear rate limits before each test
export async function clearRateLimits() {
  try {
    // Find and delete all rate limit keys from Redis
    const keys = await redis.keys('ratelimit:*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
    // Ensure connection is still working
    await redis.ping()
  } catch (error) {
    console.warn('Warning: Failed to clear rate limits, continuing anyway:', error)
  }
}

// ✅ Test helper: Clear database before tests
export async function clearDatabase() {
  try {
    // Import tables for deletion
    const { users, userProfiles, transactions, gameAccounts, disputes, favorites, notifications, kycVerifications, emailVerificationTokens, games } = await import('@/db/schema')
    
    // Delete all data from tables in the correct order (respecting foreign keys)
    await db.delete(notifications)
    await db.delete(favorites)
    await db.delete(disputes)
    await db.delete(transactions)
    await db.delete(gameAccounts)  // Must delete before games
    await db.delete(kycVerifications)
    await db.delete(emailVerificationTokens)
    await db.delete(userProfiles)
    await db.delete(users)
    await db.delete(games)  // Delete games after all references are gone
  } catch (error) {
    console.error('Failed to clear database:', error)
  }
}