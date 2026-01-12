import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { getApp } from './test-setup'
import { createId } from '@paralleldrive/cuid2'

describe('Auth Module', () => {
  const testUser = {
    email: `test-${createId()}@example.com`,
    password: 'TestPassword123',
    fullName: 'Auth Test User',
  }

  it('should register a new user successfully', async () => {
    const app = getApp(); // Get the app instance
    const res = await app.handle(
      new Request('http://localhost/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe(testUser.email);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
  });

  it('should not register a user with a duplicate email', async () => {
    const app = getApp(); // Get the app instance
    const res = await app.handle(
      new Request('http://localhost/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser), // Same user as before
      })
    );
    
    expect(res.status).toBe(400); // Bad Request from our error handler
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Email already registered');
  });

  it('should log in an existing user successfully', async () => {
    const app = getApp(); // Get the app instance
    const res = await app.handle(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe(testUser.email);
    expect(body.data.accessToken).toBeDefined();
  });

  it('should not log in with an incorrect password', async () => {
    const app = getApp(); // Get the app instance
    const res = await app.handle(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: 'WrongPassword',
        }),
      })
    );
    
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Invalid email or password');
  });
});
