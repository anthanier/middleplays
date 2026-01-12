import { db } from '@/db'
import { games, gameFieldDefinitions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/libs/logger'

/**
 * Retrieves a list of all active games.
 */
export async function listActiveGames() {
  try {
    const activeGames = await db.query.games.findMany({
      where: eq(games.isActive, true),
      orderBy: (games, { asc }) => [asc(games.name)],
    });
    return activeGames;
  } catch (error) {
    logger.error('Failed to retrieve active games', error);
    throw new Error('Could not fetch games list.');
  }
}

/**
 * Retrieves all field definitions for a specific game.
 * @param gameId - The ID of the game.
 */
export async function getGameFields(gameId: number) {
  try {
    const fieldDefinitions = await db.query.gameFieldDefinitions.findMany({
      where: eq(gameFieldDefinitions.gameId, gameId),
      orderBy: (fields, { asc }) => [asc(fields.displayOrder)],
    });

    if (fieldDefinitions.length === 0) {
      // It's not an error if a game has no fields, but it's good to know.
      // We first check if the game itself exists to provide a better error message.
      const gameExists = await db.query.games.findFirst({
        where: eq(games.id, gameId),
      });
      if (!gameExists) {
        throw new Error('Game not found.');
      }
    }
    
    return fieldDefinitions;
  } catch (error) {
    logger.error(`Failed to retrieve game fields for gameId: ${gameId}`, error);
    if (error instanceof Error && error.message === 'Game not found.') {
        throw error;
    }
    throw new Error('Could not fetch game fields.');
  }
}
