import request from 'supertest';
import { MongoClient } from 'mongodb';
import app from '../app';
import { config } from '../config/env';

/**
 * Integration test that verifies sessions are persisted in MongoDB
 * via connect-mongo rather than kept only in memory.
 */
describe('Session Store - MongoDB Persistence', () => {
  let client: MongoClient;

  beforeAll(async () => {
    client = new MongoClient(config.mongodb.uri);
    await client.connect();
    // Clean sessions collection before test
    await client.db(config.mongodb.dbName).collection('sessions').deleteMany({});
  });

  afterAll(async () => {
    // Clean up sessions we created
    await client.db(config.mongodb.dbName).collection('sessions').deleteMany({});
    await client.close();
  });

  it('should persist a session document in the MongoDB sessions collection', async () => {
    const agent = request.agent(app);

    // Seed a session via the test-only endpoint
    const seedRes = await agent
      .post('/api/test/seed-session')
      .send({
        tokens: {
          access_token: 'session-store-test-token',
          refresh_token: 'session-store-test-refresh',
          expiry_date: Date.now() + 3600_000,
        },
        user: { id: 'sess-test', email: 'sess@test.com', name: 'Session Test' },
      });

    expect(seedRes.status).toBe(200);
    expect(seedRes.body.success).toBe(true);

    // Give connect-mongo a moment to flush the write
    await new Promise((r) => setTimeout(r, 1000));

    // Query the sessions collection directly
    const db = client.db(config.mongodb.dbName);
    const sessions = await db.collection('sessions').find({}).toArray();

    expect(sessions.length).toBeGreaterThanOrEqual(1);

    // The stored session should contain our seeded data
    const sessionDoc = sessions[0];
    expect(sessionDoc).toHaveProperty('session');

    const parsed =
      typeof sessionDoc.session === 'string'
        ? JSON.parse(sessionDoc.session)
        : sessionDoc.session;

    expect(parsed.tokens.access_token).toBe('session-store-test-token');
    expect(parsed.user.email).toBe('sess@test.com');
  });
});
