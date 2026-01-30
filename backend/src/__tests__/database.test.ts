import { MongoClient, Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import crypto from 'crypto';
import { createTestDatabase } from '../database/db';
import { UserRepository } from '../database/repositories/userRepository';
import { ConversationRepository } from '../database/repositories/conversationRepository';
import { MessageRepository } from '../database/repositories/messageRepository';
import { PendingActionRepository } from '../database/repositories/pendingActionRepository';

describe('Database Layer', () => {
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;
  let userRepo: UserRepository;
  let conversationRepo: ConversationRepository;
  let messageRepo: MessageRepository;
  let pendingActionRepo: PendingActionRepository;
  const testEncryptionKey = crypto.randomBytes(32).toString('hex');

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
    // Drop all collections for a clean state, then recreate indexes
    const collections = await client.db('calendar-assistant-test').listCollections().toArray();
    for (const col of collections) {
      await client.db('calendar-assistant-test').dropCollection(col.name);
    }
    db = await createTestDatabase(client);
    userRepo = new UserRepository(db, testEncryptionKey);
    conversationRepo = new ConversationRepository(db);
    messageRepo = new MessageRepository(db);
    pendingActionRepo = new PendingActionRepository(db);
  });

  describe('Schema', () => {
    it('should create indexes for all collections', async () => {
      // Trigger index creation by inserting and querying
      await userRepo.upsert({ id: 'u1', email: 'a@b.com', display_name: 'A' });
      const indexes = await db.collection('users').indexes();
      const emailIndex = indexes.find((i: any) => i.key?.email === 1);
      expect(emailIndex).toBeDefined();
      expect(emailIndex!.unique).toBe(true);
    });
  });

  describe('UserRepository', () => {
    const testUser = { id: 'google-123', email: 'test@example.com', display_name: 'Test User' };

    it('should upsert and find by id', async () => {
      const user = await userRepo.upsert(testUser);
      expect(user.id).toBe(testUser.id);
      expect(user.email).toBe(testUser.email);

      const found = await userRepo.findById(testUser.id);
      expect(found).toBeDefined();
      expect(found!.email).toBe(testUser.email);
    });

    it('should find by email', async () => {
      await userRepo.upsert(testUser);
      const found = await userRepo.findByEmail(testUser.email);
      expect(found).toBeDefined();
      expect(found!.id).toBe(testUser.id);
    });

    it('should return undefined for non-existent user', async () => {
      expect(await userRepo.findById('nonexistent')).toBeUndefined();
      expect(await userRepo.findByEmail('none@example.com')).toBeUndefined();
    });

    it('should update on upsert conflict', async () => {
      await userRepo.upsert(testUser);
      await userRepo.upsert({ ...testUser, display_name: 'Updated Name' });
      const found = (await userRepo.findById(testUser.id))!;
      expect(found.display_name).toBe('Updated Name');
    });

    it('should update tokens', async () => {
      await userRepo.upsert(testUser);
      const updated = await userRepo.updateTokens(testUser.id, {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        token_expiry: '2025-12-31T00:00:00Z',
      });
      expect(updated!.access_token).toBe('new-access');
      expect(updated!.refresh_token).toBe('new-refresh');
    });
  });

  describe('ConversationRepository', () => {
    beforeEach(async () => {
      await userRepo.upsert({ id: 'user-1', email: 'u@test.com', display_name: 'U' });
    });

    it('should create and find by id', async () => {
      const conv = await conversationRepo.create('user-1', 'Test Conversation');
      expect(conv.user_id).toBe('user-1');
      expect(conv.id).toBeDefined();

      const found = await conversationRepo.findById(conv.id);
      expect(found).toBeDefined();
    });

    it('should find by user id', async () => {
      await conversationRepo.create('user-1', 'Test Conversation 1');
      await conversationRepo.create('user-1', 'Test Conversation 2');
      const convs = await conversationRepo.findByUserId('user-1');
      expect(convs).toHaveLength(2);
    });

    it('should update timestamp', async () => {
      const conv = await conversationRepo.create('user-1', 'Test Conversation');
      await conversationRepo.updateTimestamp(conv.id);
      const after = await conversationRepo.findById(conv.id);
      expect(after!.updated_at).toBeDefined();
    });
  });

  describe('MessageRepository', () => {
    let conversationId: string;

    beforeEach(async () => {
      await userRepo.upsert({ id: 'user-1', email: 'u@test.com', display_name: 'U' });
      conversationId = (await conversationRepo.create('user-1', 'Test Conversation')).id;
    });

    it('should create and find messages by conversation', async () => {
      await messageRepo.create({ conversation_id: conversationId, role: 'user', content: 'Hello' });
      await messageRepo.create({ conversation_id: conversationId, role: 'assistant', content: 'Hi there' });

      const messages = await messageRepo.findByConversationId(conversationId);
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });

    it('should return empty array for no messages', async () => {
      expect(await messageRepo.findByConversationId(conversationId)).toHaveLength(0);
    });
  });

  describe('PendingActionRepository', () => {
    let conversationId: string;

    beforeEach(async () => {
      await userRepo.upsert({ id: 'user-1', email: 'u@test.com', display_name: 'U' });
      conversationId = (await conversationRepo.create('user-1', 'Test Conversation')).id;
    });

    it('should create and find by id', async () => {
      const action = await pendingActionRepo.create({
        conversation_id: conversationId,
        action_type: 'create_event',
        action_payload: { summary: 'Meeting', startDateTime: '2025-01-01T10:00:00Z' },
      });
      expect(action.status).toBe('pending');
      expect(action.action_type).toBe('create_event');

      const found = await pendingActionRepo.findById(action.id);
      expect(found).toBeDefined();
      expect(JSON.parse(found!.action_payload)).toEqual({ summary: 'Meeting', startDateTime: '2025-01-01T10:00:00Z' });
    });

    it('should find pending actions by conversation', async () => {
      await pendingActionRepo.create({ conversation_id: conversationId, action_type: 'create_event', action_payload: {} });
      await pendingActionRepo.create({ conversation_id: conversationId, action_type: 'delete_event', action_payload: {} });

      const pending = await pendingActionRepo.findPendingByConversationId(conversationId);
      expect(pending).toHaveLength(2);
    });

    it('should update status to approved', async () => {
      const action = await pendingActionRepo.create({ conversation_id: conversationId, action_type: 'create_event', action_payload: {} });
      const updated = await pendingActionRepo.updateStatus(action.id, 'approved');
      expect(updated!.status).toBe('approved');
      expect(updated!.resolved_at).toBeDefined();
    });

    it('should update status to rejected', async () => {
      const action = await pendingActionRepo.create({ conversation_id: conversationId, action_type: 'create_event', action_payload: {} });
      await pendingActionRepo.updateStatus(action.id, 'rejected');

      // Rejected actions should not appear in pending query
      const pending = await pendingActionRepo.findPendingByConversationId(conversationId);
      expect(pending).toHaveLength(0);
    });
  });
});
