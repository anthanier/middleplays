import { Elysia } from 'elysia'
import { requireVerifiedSeller } from '@/middlewares/auth'
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

export const postingsModule = new Elysia({ prefix: '/postings', name: 'postings-module' })

  // ==================== CREATE NEW POSTING ====================
  .use(requireVerifiedSeller) // ✅ FIXED: Use middleware first
  .post(
    '/',
    async ({ sellerUser, body, set }) => {
      // sellerUser is guaranteed to be present by the requireVerifiedSeller middleware
      const newPosting = await createPosting(sellerUser!.id, body);
      set.status = 201; // 201 Created
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
  
  // ==================== LIST POSTINGS ====================
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