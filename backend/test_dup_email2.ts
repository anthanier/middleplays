import { getApp, clearRateLimits, clearDatabase } from './test/test-setup'

async function test() {
  await clearRateLimits()
  await clearDatabase()
  const app = getApp()
  
  const testUser = {
    email: 'test-' + Date.now() + '@example.com',
    password: 'Password123!',
    fullName: 'Test User'
  }
  
  // First register
  const res1 = await app.handle(
    new Request('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    })
  )
  
  console.log('First register status:', res1.status)
  const body1 = await res1.json()
  console.log('First register success:', body1.success)
  
  // Try duplicate
  const res2 = await app.handle(
    new Request('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    })
  )
  
  console.log('\nDuplicate register status:', res2.status)
  const body2 = await res2.json()
  console.log('Duplicate register response:', body2)
}

test().catch(console.error).finally(() => process.exit(0))
