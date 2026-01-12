import { Type, Static } from '@sinclair/typebox'

// ==================== SCHEMAS ====================

export const gameSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  slug: Type.String(),
  iconUrl: Type.Union([Type.String(), Type.Null()]),
  description: Type.Union([Type.String(), Type.Null()]),
})

export const gameFieldDefinitionSchema = Type.Object({
    id: Type.Number(),
    gameId: Type.Number(),
    fieldName: Type.String(),
    fieldLabel: Type.String(),
    fieldType: Type.String(),
    fieldOptions: Type.Union([Type.Any(), Type.Null()]), // JSONB can be array or object
    isRequired: Type.Boolean(),
    displayOrder: Type.Number(),
})


// ==================== RESPONSES ====================

export const listGamesResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Array(gameSchema)
})

export const listGameFieldsResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Array(gameFieldDefinitionSchema)
})

// ==================== PARAMS ====================

export const gameParamsSchema = Type.Object({
  gameId: Type.Number()
})

// ==================== TYPES ====================

export type ListGamesResponse = Static<typeof listGamesResponseSchema>
export type ListGameFieldsResponse = Static<typeof listGameFieldsResponseSchema>
export type GameParams = Static<typeof gameParamsSchema>
