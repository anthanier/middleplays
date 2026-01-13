import { getApp, clearRateLimits, clearDatabase } from './test/test-setup'
import { registerAndLoginUser } from './test/utils'
import { db } from '@/db'
import { games } from '@/db/schema'
import { createId } from '@paralleldrive/cuid2'

async function test() {
  await clearRateLimits()
  await clearDatabase()
  const app = getApp()
  
  const buyer = await registerAndLoginUser('user')
  const seller = await registerAndLoginUser('verified_seller')
  
  const [gameData] = await db.insert(games).values({
    name: `Trans Test - ${createId()}`,
    slug: `trans-test-${createId()}`,
    isActive: true,
  }).returning()
  
  // Create posting as seller
  const postingData = {
    gameId: gameData.id,
    title: 'Test Account',
    price: 125000,
    loginMethod: 'email',
    details: { level: 50 },
    credentials: { email: 'test@game.com', password: 'Password123!' },
    images: []
  }
  
  const createRes = await app.handle(
    new Request('http://localhost/postings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${seller.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postingData),
    })
  )
  
  console.log('Create posting status:', createRes.status)
  const postingBody = await createRes.json()
  console.log('Posting created:', postingBody)
  const postingId = postingBody.data.id
  
  // Try to purchase
  const purchaseRes = await app.handle(
    new Request('http://localhost/transactions/purchase', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${buyer.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ gameAccountId: postingId }),
    })
  )
  
  console.log('Purchase status:', purchaseRes.status)
  const text = await purchaseRes.text()
  console.log('Purchase response:', text.substring(0, 500))
}

test().catch(console.error).finally(() => process.exit(0))
