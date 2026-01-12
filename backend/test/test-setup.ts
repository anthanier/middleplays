import { Elysia } from 'elysia'
import { env, validateEnv } from '@/configs/env' // Keep env and validateEnv if needed elsewhere, but not directly in app setup
import { jwtPlugin } from '@/plugins/jwt'
import { errorHandler } from '@/plugins/error-handler'
import { db } from '@/db'
import { redis } from '@/libs/redis'
import { authModule } from '@/modules/auth'
import { usersModule } from '@/modules/users'
import { gamesModule } from '@/modules/games'
import { postingsModule } from '@/modules/postings'
import { transactionsModule } from '@/modules/transactions'

let appInstance: Elysia | null = null; // Use null to indicate not yet initialized

export function getApp() {
  if (!appInstance) {
    appInstance = new Elysia()
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
  return appInstance;
}
