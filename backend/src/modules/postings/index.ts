import { Elysia } from 'elysia'
import { requireVerifiedSeller, requireAuth } from '@/middlewares/auth'
import {
  createPostingSchema,
  createPostingResponseSchema,
  listPostingsQuerySchema,
  listPostingsResponseSchema,
} from './model'
import {
  createPosting,
  listPostings,
} from './service'

// Protected sub-module for POST /postings (create)
const createPostingRoute = new Elysia()
  .use(requireVerifiedSeller)
  .post(
    '/',
    async ({ isVerifiedSeller, sellerUser, body, set }) => {
      if (!isVerifiedSeller || !sellerUser) {
        set.status = 403
        return {
          success: false,
          error: 'Forbidden',
          message: 'Access denied. Verified seller account required.',
        }
      }
      
      const newPosting = await createPosting(sellerUser.id, body);
      set.status = 201;
      return {
        success: true,
        data: {
          id: newPosting.id,
        },
      }
    },
    {
      body: createPostingSchema,
      response: createPostingResponseSchema,
      detail: {
        tags: ['Postings'],
        summary: 'Create a new game account posting',
        description: 'Creates a new posting for selling a game account. Requires verified seller status.',
      },
    }
  )

export const postingsModule = new Elysia({ prefix: '/postings', name: 'postings-module' })
  // Define protected routes first in sub-module
  .use(createPostingRoute)
  
  // Public routes - list postings
  .get(
    '/',
    async ({ query, set }) => {
      const result = await listPostings(query);
      set.status = 200;
      return {
        success: true,
        data: result.data,
        pagination: result.pagination,
      }
    },
    {
      query: listPostingsQuerySchema,
      response: listPostingsResponseSchema,
      detail: {
        tags: ['Postings'],
        summary: 'List, search, and filter game account postings',
      },
    }
  )