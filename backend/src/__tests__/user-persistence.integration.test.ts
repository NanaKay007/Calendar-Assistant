import { MongoClient, Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import crypto from 'crypto';
import { createTestDatabase } from '../database/db';
import { UserRepository } from '../database/repositories/userRepository';

/**
 * Integration test verifying that user data is persisted to MongoDB
 * during the OAuth callback flow. Uses a real MongoDB instance
 * (MongoMemoryServer) rather than mocks.
 */
describe('User DB Persistence (OAuth callback)', () => {
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;
  const encryptionKey = crypto.randomBytes(32).toString('hex');

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    client = new MongoClient(mongoServer.getUri());
    await client.connect();
  });

  afterAll(async () => {
    await client.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = await client.db('calendar-assistant-test').listCollections().toArray();
    for (const col of collections) {
      await client.db('calendar-assistant-test').dropCollection(col.name);
    }
    db = await createTestDatabase(client);
  });

  it('should persist a user document to MongoDB via UserRepository.upsert after simulated OAuth callback', async () => {
    const userRepo = new UserRepository(db, encryptionKey);

    // Simulate the data that handleCallback receives from Google
    const userInfo = {
      id: 'google-user-123',
      email: 'testuser@gmail.com',
      name: 'Test User',
    };
    const tokens = {
      access_token: 'ya29.test-access-token',
      refresh_token: '1//test-refresh-token',
      expiry_date: Date.now() + 3600_000,
    };

    // This mirrors the upsert call added to handleCallback
    await userRepo.upsert({
      id: userInfo.id,
      email: userInfo.email,
      display_name: userInfo.name || userInfo.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: new Date(tokens.expiry_date).toISOString(),
    });

    // Verify the user document exists in MongoDB
    const savedUser = await userRepo.findById('google-user-123');
    expect(savedUser).toBeDefined();
    expect(savedUser!.email).toBe('testuser@gmail.com');
    expect(savedUser!.display_name).toBe('Test User');
    // Tokens should be decrypted back to original values
    expect(savedUser!.access_token).toBe('ya29.test-access-token');
    expect(savedUser!.refresh_token).toBe('1//test-refresh-token');
    expect(savedUser!.token_expiry).toBeDefined();
  });

  it('should update existing user tokens on subsequent OAuth logins', async () => {
    const userRepo = new UserRepository(db, encryptionKey);

    // First login
    await userRepo.upsert({
      id: 'google-user-456',
      email: 'returning@gmail.com',
      display_name: 'Returning User',
      access_token: 'old-access-token',
      refresh_token: 'old-refresh-token',
    });

    // Second login (simulating re-auth) with new tokens
    await userRepo.upsert({
      id: 'google-user-456',
      email: 'returning@gmail.com',
      display_name: 'Returning User',
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      token_expiry: '2026-12-01T00:00:00Z',
    });

    const user = await userRepo.findById('google-user-456');
    expect(user).toBeDefined();
    expect(user!.access_token).toBe('new-access-token');
    expect(user!.refresh_token).toBe('new-refresh-token');
    expect(user!.token_expiry).toBe('2026-12-01T00:00:00Z');
  });

  it('should verify the user document exists directly in the MongoDB users collection', async () => {
    const userRepo = new UserRepository(db, encryptionKey);

    await userRepo.upsert({
      id: 'direct-check-user',
      email: 'direct@gmail.com',
      display_name: 'Direct Check',
      access_token: 'some-token',
    });

    // Query the raw collection directly to confirm persistence
    const rawDoc = await db.collection('users').findOne({ id: 'direct-check-user' });
    expect(rawDoc).not.toBeNull();
    expect(rawDoc!.email).toBe('direct@gmail.com');
    expect(rawDoc!.display_name).toBe('Direct Check');
    // Raw token should be encrypted (not plaintext)
    expect(rawDoc!.access_token).not.toBe('some-token');
    expect(rawDoc!.access_token).toBeDefined();
  });
});
