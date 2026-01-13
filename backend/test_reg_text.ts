import { getApp, clearRateLimits } from './test/test-setup'

async function test() {
  await clearRateLimits()
  const app = getApp()
  
  const testUser = {
    email: 'test@example.com',
    password: 'Password123!',
    fullName: 'Test User'
  }
  
  const res1 = await app.handle(
    new Request('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    })
  )
  
  console.log('Status:', res1.status)
  console.log('Headers:', Object.fromEntries(res1.headers.entries()))
  const text = await res1.text()
  console.log('Response text:', text)
}

test().catch(console.error).finally(() => process.exit(0))
