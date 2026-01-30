import request from 'supertest';
import app from '../app';

// Auth tests do NOT need real Google tokens.
// Endpoints like /status, /me, and /logout only inspect the session —
// they never call the Google API.  Seeding with fake tokens avoids
// revoking a real refresh token that the calendar tests depend on.
const FAKE_TOKENS = {
  access_token: 'fake-access-token-for-auth-tests',
  refresh_token: 'fake-refresh-token-for-auth-tests',
  expiry_date: Date.now() + 3600_000,
};

const FAKE_USER = {
  id: 'integration-test',
  email: 'test@test.com',
  name: 'Test User',
};

describe('Auth API - Integration', () => {
  describe('GET /api/auth/login', () => {
    it('should return a real Google OAuth authorization URL', async () => {
      const res = await request(app).get('/api/auth/login');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.authUrl).toMatch(
        /^https:\/\/accounts\.google\.com\/o\/oauth2/
      );
      expect(res.body.data.authUrl).toContain('calendar');
      expect(res.body.data.authUrl).toContain('userinfo');
    });
  });

  describe('GET /api/auth/status (unauthenticated)', () => {
    it('should report not authenticated when no session exists', async () => {
      const res = await request(app).get('/api/auth/status');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isAuthenticated).toBe(false);
      expect(res.body.data.user).toBeNull();
    });
  });

  describe('GET /api/auth/me (unauthenticated)', () => {
    it('should return 401 when no session exists', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Authenticated flow', () => {
    let agent: request.Agent;

    beforeAll(async () => {
      agent = request.agent(app);

      const seedRes = await agent
        .post('/api/test/seed-session')
        .send({ tokens: FAKE_TOKENS, user: FAKE_USER });

      expect(seedRes.status).toBe(200);
    });

    it('GET /api/auth/status should report authenticated', async () => {
      const res = await agent.get('/api/auth/status');

      expect(res.status).toBe(200);
      expect(res.body.data.isAuthenticated).toBe(true);
      expect(res.body.data.user).toBeDefined();
    });

    it('GET /api/auth/me should return the seeded user', async () => {
      const res = await agent.get('/api/auth/me');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('test@test.com');
    });

    it('POST /api/auth/logout should destroy the session', async () => {
      const res = await agent.post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify session is gone
      const statusRes = await agent.get('/api/auth/status');
      expect(statusRes.body.data.isAuthenticated).toBe(false);
    });
  });
});
