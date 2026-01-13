import { Type, Static } from '@sinclair/typebox'
import { loginMethodEnum } from '@/db/schema'

// ==================== SCHEMAS ====================

// Schema for the 'details' JSONB object.
// Allows any properties, as it's dynamic per game.
const detailsSchema = Type.Record(Type.String(), Type.Any())

// Schema for the credentials object, which will be stringified and encrypted
const credentialsSchema = Type.Record(Type.String(), Type.String(), {
  description: "Object containing login credentials for the game account, e.g., { email: '...', password: '...' }"
})

export const createPostingSchema = Type.Object({
  gameId: Type.Number({ minimum: 1 }),
  title: Type.String({ minLength: 10, maxLength: 255 }),
  description: Type.Optional(Type.String({ maxLength: 5000 })),
  price: Type.Number({ minimum: 1000, description: "Price in IDR" }),
  loginMethod: Type.Union([
    Type.Literal('moonton'),
    Type.Literal('google'),
    Type.Literal('facebook'),
    Type.Literal('vk'),
    Type.Literal('apple'),
    Type.Literal('email'),
  ]),

  // The dynamic fields based on the game
  details: detailsSchema,

  // The credentials to be encrypted
  credentials: credentialsSchema,

  // Array of image URLs (URLs to be provided by a separate upload endpoint later)
  images: Type.Array(Type.String({ format: 'uri' }), { minItems: 1, maxItems: 10 })
})

// Schema for a single item in the paginated list
export const postingListItemSchema = Type.Object({
  id: Type.String(),
  title: Type.String(),
  price: Type.String(),
  status: Type.String(),
  createdAt: Type.Date(),
  // Simplified details for list view
  details: detailsSchema,
  images: Type.Array(Type.String()),
  game: Type.Object({
    name: Type.String(),
    slug: Type.String(),
    iconUrl: Type.Union([Type.String(), Type.Null()]),
  }),
  seller: Type.Object({
    id: Type.String(),
    fullName: Type.Union([Type.String(), Type.Null()]),
    avatarUrl: Type.Union([Type.String(), Type.Null()]),
    rating: Type.String(),
  })
})

// ==================== QUERY PARAMS ====================


export const listPostingsQuerySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
  gameId: Type.Optional(Type.Number({ minimum: 1 })),
  sellerId: Type.Optional(Type.String()),
  minPrice: Type.Optional(Type.Number({ minimum: 0 })),
  maxPrice: Type.Optional(Type.Number({ minimum: 0 })),
  // ✅ FIXED: Type.Enum format yang benar
  sortBy: Type.Optional(Type.Union([
    Type.Literal('newest'),
    Type.Literal('oldest'),
    Type.Literal('price_asc'),
    Type.Literal('price_desc'),
  ], { default: 'newest' })),
  search: Type.Optional(Type.String()),
})


// ==================== RESPONSES ====================

export const createPostingResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    id: Type.String()
  })
})

export const listPostingsResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Array(postingListItemSchema),
  pagination: Type.Object({
    page: Type.Number(),
    limit: Type.Number(),
    total: Type.Number(),
    totalPages: Type.Number(),
  })
})


// ==================== TYPES ====================

export type CreatePostingRequest = Static<typeof createPostingSchema>
export type ListPostingsQuery = Static<typeof listPostingsQuerySchema>