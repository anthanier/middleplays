import { db } from '@/db'
import { users, userProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/libs/logger'
import { verifyPassword, hashPassword } from '@/libs/crypto'
import type { UpdateProfileRequest, ChangePasswordRequest } from './model'

/**
 * Get a user's full profile information.
 * @param userId - The ID of the user.
 */
export async function getUserProfile(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      profile: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Exclude sensitive data before returning
  const { passwordHash, ...safeUser } = user;

  if (!safeUser.profile) {
    throw new Error('User profile not found. Please contact support.');
  }

  return {
    ...safeUser,
    // Ensure profile is not null, even though we just checked.
    // This satisfies TypeScript's strict null checks.
    profile: safeUser.profile, 
  };
}

/**
 * Update a user's profile.
 * @param userId - The ID of the user.
 * @param data - The profile data to update.
 */
export async function updateUserProfile(userId: string, data: UpdateProfileRequest) {
  if (Object.keys(data).length === 0) {
    throw new Error('No fields to update.');
  }
  
  try {
    const [updatedProfile] = await db.update(userProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();

    if (!updatedProfile) {
      throw new Error('Profile not found or failed to update.');
    }

    logger.info(`User profile updated for user: ${userId}`);
    return updatedProfile;

  } catch (error) {
    logger.error(`Failed to update profile for user ${userId}`, error);
    throw new Error('Profile update failed.');
  }
}

/**
 * Change a user's password.
 * @param userId - The ID of the user.
 * @param data - The old and new password data.
 */
export async function changeUserPassword(userId: string, data: ChangePasswordRequest) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    // This should ideally not happen if the user is authenticated
    throw new Error('User not found');
  }

  // 1. Verify the old password
  const isOldPasswordValid = await verifyPassword(data.oldPassword, user.passwordHash);
  if (!isOldPasswordValid) {
    throw new Error('Invalid old password.');
  }

  // 2. Hash the new password
  const newPasswordHash = await hashPassword(data.newPassword);

  // 3. Update the user's password in the database
  try {
    await db.update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
    
    logger.info(`Password changed successfully for user: ${userId}`);

    // In a real application, you might want to send a notification email here.
    logger.info(`
      ================================================
      VIRTUAL EMAIL - PASSWORD CHANGE NOTIFICATION
      ------------------------------------------------
      To: ${user.email}
      Your password has been changed successfully.
      If you did not make this change, please contact support immediately.
      ================================================
    `);

  } catch (error) {
    logger.error(`Failed to change password for user ${userId}`, error);
    throw new Error('Failed to change password.');
  }
}
