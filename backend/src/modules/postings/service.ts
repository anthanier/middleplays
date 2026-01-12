import { db } from '@/db'
import { gameAccounts, gameFieldDefinitions, games, users, userProfiles } from '@/db/schema'
import { eq, and, asc, desc, gte, lte, ilike, count, sql } from 'drizzle-orm'
import { logger } from '@/libs/logger'
import { encryptCredentials } from '@/libs/crypto'
import type { CreatePostingRequest, ListPostingsQuery } from './model'

/**
 * Validates the provided 'details' object against the game's field definitions.
 * @param gameId The ID of the game.
 * @param details The dynamic details object to validate.
 */
async function validatePostingDetails(gameId: number, details: Record<string, any>) {
  // ... (existing implementation)
}


/**
 * Creates a new game account posting.
 * @param sellerId The ID of the verified seller.
 * @param data The posting data.
 */
export async function createPosting(sellerId: string, data: CreatePostingRequest) {
  // ... (existing implementation)
}


/**
 * Lists, filters, and paginates game account postings.
 * @param query - The query parameters for filtering and pagination.
 */
export async function listPostings(query: ListPostingsQuery) {
  const { page = 1, limit = 20, gameId, sellerId, minPrice, maxPrice, sortBy = 'newest', search } = query;
  const offset = (page - 1) * limit;

  // Build dynamic where conditions
  const conditions = [
    eq(gameAccounts.status, 'active'), // Only show active postings
  ];
  if (gameId) conditions.push(eq(gameAccounts.gameId, gameId));
  if (sellerId) conditions.push(eq(gameAccounts.sellerId, sellerId));
  if (minPrice) conditions.push(gte(gameAccounts.price, String(minPrice)));
  if (maxPrice) conditions.push(lte(gameAccounts.price, String(maxPrice)));
  if (search) conditions.push(ilike(gameAccounts.title, `%${search}%`));

  const where = and(...conditions);

  // Build dynamic order by clause
  let orderBy;
  switch (sortBy) {
    case 'price_asc':
      orderBy = asc(gameAccounts.price);
      break;
    case 'price_desc':
      orderBy = desc(gameAccounts.price);
      break;
    case 'oldest':
      orderBy = asc(gameAccounts.createdAt);
      break;
    case 'newest':
    default:
      orderBy = desc(gameAccounts.createdAt);
      break;
  }
  
  try {
    // Run queries in parallel for efficiency
    const [postings, totalResult] = await Promise.all([
      db.select({
        id: gameAccounts.id,
        title: gameAccounts.title,
        price: gameAccounts.price,
        status: gameAccounts.status,
        createdAt: gameAccounts.createdAt,
        details: gameAccounts.details,
        images: gameAccounts.images,
        game: {
            name: games.name,
            slug: games.slug,
            iconUrl: games.iconUrl,
        },
        seller: {
            id: users.id,
            fullName: userProfiles.fullName,
            avatarUrl: userProfiles.avatarUrl,
            rating: userProfiles.rating,
        }
      })
      .from(gameAccounts)
      .leftJoin(games, eq(gameAccounts.gameId, games.id))
      .leftJoin(users, eq(gameAccounts.sellerId, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
      
      db.select({ total: count() }).from(gameAccounts).where(where)
    ]);

    const total = totalResult[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: postings,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      }
    };

  } catch (error) {
    logger.error('Failed to list postings', error);
    throw new Error('Could not fetch postings.');
  }
}
