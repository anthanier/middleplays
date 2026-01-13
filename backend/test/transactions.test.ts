import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { getApp, clearRateLimits, clearDatabase } from './test-setup'
import { registerAndLoginUser } from './utils'
import { db } from '@/db'
import { games, gameAccounts, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'

describe('Transactions Module', () => {
  let sellerData: any;
  let buyerData: any;
  let gameData: any;
  let postingData: any;
  let app: any;
  let skipPostingCreation = false;

  beforeEach(async () => {
    await clearRateLimits()
    app = getApp(); // Get app instance for each test
    // 1. Create seller, buyer, and a game
    [sellerData, buyerData] = await Promise.all([
        registerAndLoginUser('verified_seller'),
        registerAndLoginUser('user'),
    ]);
    
    const uniqueGameName = `Transaction Test Game - ${createId()}`;
    const uniqueGameSlug = `transaction-test-game-${createId()}`;

    [gameData] = await db.insert(games).values({
      name: uniqueGameName,
      slug: uniqueGameSlug,
      isActive: true,
    }).returning();

    // 2. Seller creates a posting (unless we're testing already-sold scenario)
    if (!skipPostingCreation) {
      const createdPosting = await db.insert(gameAccounts).values({
          sellerId: sellerData.userId,
          gameId: gameData.id,
          title: `Account for Purchase Test - ${createId()}`,
          price: '125000',
          details: { power: 100 },
          credentialsEncrypted: 'dummy-encrypted-data',
          loginMethod: 'email',
          images: ['http://example.com/img.png'],
          status: 'active',
      }).returning();
      postingData = createdPosting[0];
    }
  });
  
  afterEach(async () => {
    // Don't delete games here - they might have references
    // The global clearDatabase will handle cleanup
  });

  it('should not allow a user to purchase their own posting', async () => {
    const res = await app.handle(
        new Request('http://localhost/transactions/purchase', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sellerData.accessToken}`
            },
            body: JSON.stringify({ gameAccountId: postingData.id }),
        })
    );

    expect(res.status).toBe(400); // Bad Request from error handler
    const body = await res.json();
    expect(body.message).toBe('You cannot purchase your own posting.');
  });
  
  it('should allow a user to purchase an available posting', async () => {
    const res = await app.handle(
        new Request('http://localhost/transactions/purchase', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${buyerData.accessToken}`
            },
            body: JSON.stringify({ gameAccountId: postingData.id }),
        })
    );
    
    expect(res.status).toBe(201);
    const body = await res.json();
    
    expect(body.success).toBe(true);
    expect(body.data.transactionId).toBeDefined();
    expect(body.data.paymentUrl).toContain('https://checkout.xendit.co/web/');
  });

  it('should not allow a user to purchase an already sold posting', async () => {
    // Mark the posting as sold manually
    await db.update(gameAccounts).set({ status: 'sold' }).where(eq(gameAccounts.id, postingData.id));
    
    const anotherBuyer = await registerAndLoginUser('user');
    const res = await app.handle(
        new Request('http://localhost/transactions/purchase', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${anotherBuyer.accessToken}`
            },
            body: JSON.stringify({ gameAccountId: postingData.id }),
        })
    );
    
    expect(res.status).toBe(400); // Bad Request - account no longer available
    const body = await res.json();
    expect(body.message).toBe('This account is no longer available for purchase.');
  });
});
