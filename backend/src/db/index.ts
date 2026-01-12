import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { logger } from '@/libs/logger'

const connectionString = process.env.DATABASE_URL!

if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in environment variables')
}

// Query client (for regular queries)
const queryClient = postgres(connectionString, {
    max: 10, // connection pool size
    idle_timeout: 20,
    connect_timeout: 10
})

export const db = drizzle(queryClient, {schema})

// Migration client (for running migrations only)
export const migrationClient = postgres(connectionString, {
    max: 1
})

// Helper function to check database connection
export async function checkDbConnection(): Promise<boolean> {
  try {
    await queryClient`SELECT 1`
    return true
  } catch {
    return false
  }
}

// Transaction helper
export async function withTransaction<T>(
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  return await db.transaction(callback)
}

// Graceful shutdown helper (consolidated shutdown handler)
export async function closeDatabase() {
  await queryClient.end()
  await migrationClient.end()
}