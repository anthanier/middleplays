import { Elysia } from 'elysia'
import { requireAuth } from '@/middlewares/auth'
import {
  userProfileResponseSchema,
  updateProfileSchema,
  changePasswordSchema,
  genericSuccessResponseSchema,
} from './model'
import {
  getUserProfile,
  updateUserProfile,
  changeUserPassword
} from './service'

export const usersModule = new Elysia({ prefix: '/users', name: 'users-module' })
  .use(requireAuth) // All routes in this module require authentication

  // ==================== GET CURRENT USER PROFILE ====================
  .get(
    '/me',
    async ({ userId, set }) => {
      // userId is guaranteed to be present by requireAuth middleware
      const userProfile = await getUserProfile(userId!);
      
      // We need to format the data to match the response schema
      const { profile, ...user } = userProfile;
      
      set.status = 200;
      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
          profile: {
            fullName: profile.fullName,
            phone: profile.phone,
            avatarUrl: profile.avatarUrl,
            balance: profile.balance,
            totalSales: profile.totalSales,
            totalPurchases: profile.totalPurchases,
            rating: profile.rating,
          },
        },
      }
    },
    {
      response: userProfileResponseSchema,
      detail: {
        tags: ['Users'],
        summary: "Get the current authenticated user's profile",
      },
    }
  )

  // ==================== UPDATE CURRENT USER PROFILE ====================
  .put(
    '/me',
    async ({ userId, body, set }) => {
      await updateUserProfile(userId!, body);
      set.status = 200;
      return {
        success: true,
        message: 'Profile updated successfully.',
      }
    },
    {
      body: updateProfileSchema,
      response: genericSuccessResponseSchema,
      detail: {
        tags: ['Users'],
        summary: "Update the current user's profile",
      },
    }
  )

  // ==================== CHANGE PASSWORD ====================
  .put(
    '/me/password',
    async ({ userId, body, set }) => {
      await changeUserPassword(userId!, body);
      set.status = 200;
      return {
        success: true,
        message: 'Password changed successfully.',
      }
    },
    {
      body: changePasswordSchema,
      response: genericSuccessResponseSchema,
      detail: {
        tags: ['Users'],
        summary: 'Change the current user a password',
      },
    }
  )
