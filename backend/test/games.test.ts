import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test'
import { getApp } from './test-setup'
import { db } from '@/db'
import { games, gameFieldDefinitions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'


describe('Games Module', () => {
  let createdGame: any;
  let app: any;

  beforeEach(async () => {
    app = getApp(); // Get app instance for each test
    const uniqueGameName = `Test Game - ${createId()}`;
    const uniqueGameSlug = `test-game-${createId()}`;

    [createdGame] = await db.insert(games).values({
      name: uniqueGameName,
      slug: uniqueGameSlug,
      description: 'A game for tests',
      iconUrl: 'http://example.com/icon.png',
      isActive: true,
    }).returning();

    await db.insert(gameFieldDefinitions).values([
      {
        gameId: createdGame.id,
        fieldName: 'level',
        fieldLabel: 'Level',
        fieldType: 'number',
        isRequired: true,
        displayOrder: 1,
      },
      {
        gameId: createdGame.id,
        fieldName: 'rank',
        fieldLabel: 'Rank',
        fieldType: 'select',
        fieldOptions: ['Bronze', 'Silver', 'Gold'],
        isRequired: true,
        displayOrder: 2,
      },
    ]);
  });
  
  afterEach(async () => {
    await db.delete(games).where(eq(games.id, createdGame.id));
  });


  it('should list all active games', async () => {
    const res = await app.handle(new Request('http://localhost/games/'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    
    // Check if our created game is in the list
    const foundGame = body.data.find((g: any) => g.id === createdGame.id);
    expect(foundGame).toBeDefined();
    expect(foundGame.name).toBe('Test Game For Testing');
  });

  it('should get field definitions for a specific game', async () => {
    const res = await app.handle(new Request(`http://localhost/games/${createdGame.id}/fields`));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(2);

    const levelField = body.data.find((f: any) => f.fieldName === 'level');
    expect(levelField).toBeDefined();
    expect(levelField.fieldType).toBe('number');
    
    const rankField = body.data.find((f: any) => f.fieldName === 'rank');
    expect(rankField).toBeDefined();
    expect(rankField.fieldType).toBe('select');
    expect(rankField.fieldOptions).toEqual(['Bronze', 'Silver', 'Gold']);
  });
});
