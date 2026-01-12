import { getApp } from './test-setup'
import { createId } from '@paralleldrive/cuid2'

// Helper to create a new user via API and get tokens
export async function registerAndLoginUser(role: 'user' | 'verified_seller' = 'user') {
  const app = getApp(); // Get the app instance
  const email = `test-${createId()}@example.com`;
  const password = 'TestPassword123';

  // Register the user
  const registerRes = await app.handle(
    new Request('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName: 'Test User' }),
    })
  );
  const registerBody: any = await registerRes.json();
  const userId = registerBody.data.user.id;

  // If role is verified_seller, update it directly in the DB
  if (role === 'verified_seller') {
    const { db } = await import('@/db');
    const { users } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    await db.update(users).set({ role: 'verified_seller' }).where(eq(users.id, userId));
  }

  // Log in to get fresh tokens
  const loginRes = await app.handle(
    new Request('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  );
  const loginBody: any = await loginRes.json();

  return {
    userId,
    email,
    password,
    accessToken: loginBody.data.accessToken,
    refreshToken: loginBody.data.refreshToken,
  };
}
