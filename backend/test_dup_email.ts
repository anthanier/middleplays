import { getApp, clearRateLimits } from './test/test-setup'

async function test() {
  await clearRateLimits()
  const app = getApp()
  
  const testUser = {
    email: 'test@example.com',
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
  console.log('First register response:', body1)
  
  // Try duplicate
  const res2 = await app.handle(
    new Request('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    })
  )
  
  console.log('\nDuplicate register status:', res2.status)
  const text2 = await res2.text()
  console.log('Duplicate register response (first 500 chars):', text2.substring(0, 500))
}

test().catch(console.error).finally(() => process.exit(0))
