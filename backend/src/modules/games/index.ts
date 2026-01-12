import { Elysia } from 'elysia'
import {
  listGamesResponseSchema,
  listGameFieldsResponseSchema,
  gameParamsSchema,
} from './model'
import {
  listActiveGames,
  getGameFields
} from './service'

export const gamesModule = new Elysia({ prefix: '/games', name: 'games-module' })
  // This module is public, no authentication needed.

  // ==================== LIST ALL ACTIVE GAMES ====================
  .get(
    '/',
    async ({ set }) => {
      const games = await listActiveGames();
      set.status = 200;
      return {
        success: true,
        data: games,
      }
    },
    {
      response: listGamesResponseSchema,
      detail: {
        tags: ['Games'],
        summary: "Get a list of all active games",
      },
    }
  )

  // ==================== GET GAME-SPECIFIC FIELDS ====================
  .get(
    '/:gameId/fields',
    async ({ params, set }) => {
      const fields = await getGameFields(params.gameId);
      set.status = 200;
      return {
        success: true,
        data: fields,
      }
    },
    {
      params: gameParamsSchema,
      response: listGameFieldsResponseSchema,
      detail: {
        tags: ['Games'],
        summary: "Get the dynamic field definitions for a specific game",
      },
    }
  )
