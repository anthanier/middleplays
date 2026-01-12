import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { getApp } from './test-setup'
import { registerAndLoginUser } from './utils'
import { db } from '@/db'
import { games, gameAccounts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'

describe('Postings Module', () => {
  let sellerData: any;
  let gameData: any;
  let createdPostingId: string;

  beforeEach(async () => {
    const app = getApp(); // Get app instance for each test
    // Create a verified seller and a game for our tests
    sellerData = await registerAndLoginUser('verified_seller');
    [gameData] = await db.insert(games).values({
      name: `Posting Test Game - ${createId()}`,
      slug: `posting-test-game-${createId()}`,
      isActive: true,
    }).returning();
  });

  afterEach(async () => {
    // Clean up created data
    if (gameData) await db.delete(games).where(eq(games.id, gameData.id));
    // The rest of the data (users, postings) can be left in the test DB
  });

  it('should not allow a regular user to create a posting', async () => {
    const app = getApp(); // Get app instance for each test
    const regularUser = await registerAndLoginUser('user');
    const postingData = {
        gameId: gameData.id,
        title: 'This should not be created',
        price: 10000,
        loginMethod: 'email',
        details: { level: 50 },
        credentials: { user: 'test', pass: 'test' },
        images: ['http://example.com/img.png']
    };

    const res = await app.handle(
        new Request('http://localhost/postings', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${regularUser.accessToken}`
            },
            body: JSON.stringify(postingData),
        })
    );

    expect(res.status).toBe(403); // Forbidden
    const body = await res.json();
    expect(body.message).toBe('Access denied. Verified seller account required.');
  });
  
  it('should allow a verified seller to create a posting', async () => {
    const app = getApp(); // Get app instance for each test
    const postingData = {
        gameId: gameData.id,
        title: 'Awesome Test Account for Sale',
        price: 50000,
        loginMethod: 'google',
        details: { rank: 'Epic', skins: 25 },
        credentials: { email: 'seller-test@game.com', password: 'SuperSecretPassword' },
        images: ['http://example.com/image1.png', 'http://example.com/image2.png']
    };

    const res = await app.handle(
        new Request('http://localhost/postings', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sellerData.accessToken}`
            },
            body: JSON.stringify(postingData),
        })
    );
    
    expect(res.status).toBe(201); // Created
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    createdPostingId = body.data.id;
  });

  it('should list all postings', async () => {
    const app = getApp(); // Get app instance for each test
    const res = await app.handle(new Request('http://localhost/postings'));
    expect(res.status).toBe(200);
    const body = await res.json();
    
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    
    const ourPosting = body.data.find((p: any) => p.id === createdPostingId);
    expect(ourPosting).toBeDefined();
    expect(ourPosting.title).toBe('Awesome Test Account for Sale');
    expect(ourPosting.game.slug).toBe('posting-test-game');
    expect(ourPosting.seller.id).toBe(sellerData.userId);
  });

  it('should filter postings by gameId', async () => {
    const app = getApp(); // Get app instance for each test
    const res = await app.handle(new Request(`http://localhost/postings?gameId=${gameData.id}`));
    const body = await res.json();
    
    expect(body.success).toBe(true);
    // All returned items should have the correct gameId
    const allMatch = body.data.every((p: any) => p.game.slug === 'posting-test-game');
    expect(allMatch).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });
});
