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