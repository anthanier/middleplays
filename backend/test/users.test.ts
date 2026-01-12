import { describe, it, expect, beforeAll } from 'bun:test'
import { getApp } from './test-setup'
import { registerAndLoginUser } from './utils'

describe('Users Module', () => {
  let userData: any;

  // Create a user once for all tests in this suite
  beforeAll(async () => {
    userData = await registerAndLoginUser();
  });

  it('should get the current user profile', async () => {
    const app = getApp(); // Get the app instance
    const res = await app.handle(
      new Request('http://localhost/users/me', {
        headers: {
          'Authorization': `Bearer ${userData.accessToken}`
        }
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(userData.userId);
    expect(body.data.email).toBe(userData.email);
    expect(body.data.profile).toBeDefined();
  });

  it('should update the user profile', async () => {
    const app = getApp(); // Get the app instance
    const newProfileData = {
      fullName: 'Updated Test User',
      phone: '1234567890',
    };

    const res = await app.handle(
      new Request('http://localhost/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userData.accessToken}`,
        },
        body: JSON.stringify(newProfileData),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Profile updated successfully.');

    // Verify the update
    const profileRes = await app.handle(
        new Request('http://localhost/users/me', {
          headers: {
            'Authorization': `Bearer ${userData.accessToken}`
          }
        })
      );
    const profileBody = await profileRes.json();
    expect(profileBody.data.profile.fullName).toBe(newProfileData.fullName);
    expect(profileBody.data.profile.phone).toBe(newProfileData.phone);
  });
  
  it('should change the user password', async () => {
    const app = getApp(); // Get the app instance
    const newPassword = 'NewSecurePassword123';
    const res = await app.handle(
      new Request('http://localhost/users/me/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userData.accessToken}`,
        },
        body: JSON.stringify({
          oldPassword: userData.password,
          newPassword: newPassword,
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Password changed successfully.');
    
    // Try to log in with the new password
    const loginRes = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userData.email,
            password: newPassword,
          }),
        })
      );
    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.success).toBe(true);
  });
});
