import { db } from '@/db'
import { gameAccounts, gameFieldDefinitions, games, users, userProfiles } from '@/db/schema'
import { eq, and, asc, desc, gte, lte, ilike, count } from 'drizzle-orm'
import { logger } from '@/libs/logger'
import { encryptCredentials } from '@/libs/crypto'
import type { CreatePostingRequest, ListPostingsQuery } from './model'

async function validatePostingDetails(gameId: number, details: Record<string, any>) {
  try {
    const fieldDefs = await db.query.gameFieldDefinitions.findMany({
      where: eq(gameFieldDefinitions.gameId, gameId),
    });

    if (fieldDefs.length === 0) {
      logger.warn(`No field definitions found for game ${gameId}`);
      return;
    }

    const requiredFields = fieldDefs.filter(f => f.isRequired);
    for (const field of requiredFields) {
      if (!(field.fieldName in details)) {
        throw new Error(`Required field '${field.fieldLabel}' is missing.`);
      }
      
      const value = details[field.fieldName];
      if (field.fieldType === 'number' && typeof value !== 'number') {
        throw new Error(`Field '${field.fieldLabel}' must be a number.`);
      }
    }

    logger.info(`Posting details validated successfully for game ${gameId}`);
  } catch (error) {
    logger.error('Failed to validate posting details', error);
    throw error;
  }
}

export async function createPosting(sellerId: string, data: CreatePostingRequest) {
  try {
    const game = await db.query.games.findFirst({
      where: eq(games.id, data.gameId),
    });
    
    if (!game || !game.isActive) {
      throw new Error('Game not found or inactive.');
    }

    await validatePostingDetails(data.gameId, data.details);

    const credentialsString = JSON.stringify(data.credentials);
    const encryptedCredentials = await encryptCredentials(credentialsString);

    // ✅ FIXED: Explicitly cast loginMethod to match enum type
    const [newPosting] = await db.insert(gameAccounts).values({
      sellerId,
      gameId: data.gameId,
      title: data.title,
      description: data.description || null,
      price: String(data.price),
      details: data.details,
      credentialsEncrypted: encryptedCredentials,
      loginMethod: data.loginMethod as 'moonton' | 'google' | 'facebook' | 'vk' | 'apple' | 'email',
      images: data.images,
      status: 'active',
    }).returning();

    if (!newPosting) {
      throw new Error('Failed to create posting.');
    }

    logger.info(`New posting created: ${newPosting.id} by seller ${sellerId}`);
    return newPosting;

  } catch (error) {
    logger.error('Failed to create posting', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Could not create posting.');
  }
}

export async function listPostings(query: ListPostingsQuery) {
  const { page = 1, limit = 20, gameId, sellerId, minPrice, maxPrice, sortBy = 'newest', search } = query;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(gameAccounts.status, 'active'),
  ];
  if (gameId) conditions.push(eq(gameAccounts.gameId, gameId));
  if (sellerId) conditions.push(eq(gameAccounts.sellerId, sellerId));
  if (minPrice) conditions.push(gte(gameAccounts.price, String(minPrice)));
  if (maxPrice) conditions.push(lte(gameAccounts.price, String(maxPrice)));
  if (search) conditions.push(ilike(gameAccounts.title, `%${search}%`));

  const where = and(...conditions);

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