import { db } from '@/db'
import { users, userProfiles, emailVerificationTokens } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword, verifyPassword, hashToken } from '@/libs/crypto'
import { logger } from '@/libs/logger'
import type { RegisterRequest, LoginRequest } from './model'
import { emailExists, normalizeEmail, createEmailVerificationToken } from './utils'
import type { JWTPayloadSpec } from '@elysiajs/jwt'

interface JWTPayload extends JWTPayloadSpec {
  userId: string
  type: 'access' | 'refresh'
}

/**
 * Register new user
 */
export async function registerUser(data: RegisterRequest) {
  const normalizedEmail = normalizeEmail(data.email)

  // Check if email already exists
  if (await emailExists(normalizedEmail)) {
    throw new Error('Email already registered')
  }

  // Hash password
  const passwordHash = await hashPassword(data.password)

  // ✅ FIXED: Proper transaction error handling
  try {
    const result = await db.transaction(async (tx) => {
      // Insert user
      const [newUser] = await tx
        .insert(users)
        .values({
          email: normalizedEmail,
          passwordHash,
          role: 'user',
          isEmailVerified: false,
        })
        .returning()

      if (!newUser) {
        throw new Error('Failed to create user')
      }

      // Create user profile
      const [profile] = await tx
        .insert(userProfiles)
        .values({
          userId: newUser.id,
          fullName: data.fullName || null,
          phone: data.phone || null,
          balance: '0',
          totalSales: 0,
          totalPurchases: 0,
          rating: '0',
        })
        .returning()

      if (!profile) {
        throw new Error('Failed to create user profile')
      }

      return newUser
    })

    logger.info(`User registered: ${result.email}`)

    // Generate and "send" verification email (mock)
    try {
      const verificationToken = await createEmailVerificationToken(result.id)
      // In a real app, you'd send an email via a job queue (e.g., BullMQ)
      // For this project, we'll log it for demonstration purposes.
      logger.info(`
      ================================================
      VIRTUAL EMAIL - PLEASE VERIFY YOUR EMAIL
      ------------------------------------------------
      To: ${result.email}
      Verification Token: ${verificationToken}
      (This would typically be a link in an email)
      ================================================
    `)
    } catch (emailError) {
      logger.error(`Failed to send verification email for ${result.email}`, emailError)
      // We don't block the registration process if email sending fails.
      // The user can request a new verification email later.
    }

    return {
      id: result.id,
      email: result.email,
      role: result.role,
      isEmailVerified: result.isEmailVerified,
    }
  } catch (error) {
    // ✅ Handle PostgreSQL unique constraint violation
    if (error instanceof Error) {
      if (error.message.includes('unique constraint') || 
          error.message.includes('duplicate key')) {
        throw new Error('Email already registered')
      }
    }
    
    logger.error('Registration failed', error)
    throw new Error('Registration failed. Please try again.')
  }
}

/**
 * Login user
 */
export async function loginUser(data: LoginRequest) {
  const normalizedEmail = normalizeEmail(data.email)

  // Find user by email
  const user = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
    with: {
      profile: true,
    },
  })

  if (!user) {
    throw new Error('Invalid email or password')
  }

  // Verify password
  const isValid = await verifyPassword(data.password, user.passwordHash)
  if (!isValid) {
    throw new Error('Invalid email or password')
  }

  logger.info(`User logged in: ${user.email}`)

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
  }
}

/**
 * Verify refresh token and get user
 */
export async function verifyRefreshToken(
  token: string,
  jwtRefresh: { verify: (token: string) => Promise<JWTPayload | false> }
) {
  try {
    const payload = (await jwtRefresh.verify(token)) as unknown as JWTPayload | false

    if (!payload || payload.type !== 'refresh') {
      throw new Error('Invalid refresh token')
    }

    // Verify user still exists
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    })

    if (!user) {
      throw new Error('User not found')
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    }
  } catch (error) {
    logger.error('Refresh token verification failed', error)
    throw new Error('Invalid refresh token')
  }
}

/**
 * Verify email using the provided token.
 */
export async function verifyEmail(token: string) {
  if (!token || typeof token !== 'string') {
    throw new Error('Verification token is required.');
  }

  const hashedToken = hashToken(token);

  try {
    const result = await db.transaction(async (tx) => {
      // Find the token
      const verificationToken = await tx.query.emailVerificationTokens.findFirst({
        where: eq(emailVerificationTokens.tokenHash, hashedToken),
      });

      if (!verificationToken) {
        throw new Error('Invalid or expired verification token.');
      }

      // Check if token is expired
      if (new Date() > verificationToken.expiresAt) {
        // Clean up expired token
        await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, verificationToken.id));
        throw new Error('Invalid or expired verification token.');
      }

      // Update user's verification status
      const [updatedUser] = await tx.update(users)
        .set({ isEmailVerified: true, updatedAt: new Date() })
        .where(eq(users.id, verificationToken.userId))
        .returning();
      
      if (!updatedUser) {
        // This should not happen if the foreign key is set up correctly
        throw new Error('Failed to find user for verification.');
      }

      // Delete the used token
      await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, verificationToken.id));

      return updatedUser;
    });

    logger.info(`Email verified for user: ${result.email}`);
    return { success: true, message: 'Email verified successfully.' };

  } catch (error) {
    logger.error('Email verification failed', error);
    // Re-throw specific, safe errors to the user
    if (error instanceof Error && error.message.includes('token')) {
      throw error;
    }
    // Generic error for other unexpected issues
    throw new Error('Email verification failed. Please try again.');
  }
}