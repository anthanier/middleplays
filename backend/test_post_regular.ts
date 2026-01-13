import { getApp, clearRateLimits, clearDatabase } from './test/test-setup'
import { registerAndLoginUser } from './test/utils'
import { db } from '@/db'
import { games } from '@/db/schema'
import { createId } from '@paralleldrive/cuid2'

async function test() {
  await clearRateLimits()
  await clearDatabase()
  const app = getApp()
  
  const regularUser = await registerAndLoginUser('user')
  
  const [gameData] = await db.insert(games).values({
    name: `Test Game - ${createId()}`,
    slug: `test-game-${createId()}`,
    isActive: true,
  }).returning()
  
  const postingData = {
    gameId: gameData.id,
    title: 'This should not be created',
    price: 10000,
    loginMethod: 'email',
    details: { level: 50 },
    credentialsEncrypted: 'dummy',
    images: []
  }
  
  const res = await app.handle(
    new Request('http://localhost/postings/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${regularUser.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postingData),
    })
  )
  
  console.log('Status:', res.status)
  console.log('Content-Type:', res.headers.get('content-type'))
  const text = await res.text()
  console.log('Response (first 300):', text.substring(0, 300))
}

test().catch(console.error).finally(() => process.exit(0))
