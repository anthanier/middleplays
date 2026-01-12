import { db } from '@/db'
import { users, emailVerificationTokens } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/libs/logger'
import { generateTokenWithHash } from '@/libs/crypto'

/**
 * Check if email already exists
 */
export async function emailExists(email: string): Promise<boolean> {
  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    })
    return !!existingUser
  } catch (error) {
    logger.error('Error checking email existence', error)
    throw error
  }
}

/**
 * Normalize email (lowercase and trim)
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

/**
 * Creates a new email verification token for a user, invalidating any old ones.
 * @returns The raw token to be sent to the user.
 */
export async function createEmailVerificationToken(userId: string): Promise<string> {
  try {
    const { token, hash } = await generateTokenWithHash();

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.insert(emailVerificationTokens).values({
      userId,
      tokenHash: hash,
      expiresAt,
    }).onConflictDoUpdate({
      target: emailVerificationTokens.userId,
      set: {
        tokenHash: hash,
        expiresAt,
      }
    });
    
    logger.info(`Generated email verification token for user ${userId}`);

    return token;
  } catch (error) {
    logger.error(`Failed to create email verification token for user ${userId}`, error);
    // Rethrow a generic error to not leak implementation details
    throw new Error('Failed to generate email verification token.');
  }
}
