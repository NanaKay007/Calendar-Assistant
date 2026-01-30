import { MongoClient, Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import crypto from 'crypto';
import { createTestDatabase } from '../database/db';
import { UserRepository } from '../database/repositories/userRepository';
import { ConversationRepository } from '../database/repositories/conversationRepository';
import { MessageRepository } from '../database/repositories/messageRepository';
import { PendingActionRepository } from '../database/repositories/pendingActionRepository';

/**
 * Integration tests that exercise cross-repository workflows,
 * verifying that the repositories work together correctly.
 */
describe('Database Integration', () => {
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

  describe('Full conversation lifecycle', () => {
    it('should support creating a user, conversation, messages, and pending actions end-to-end', async () => {
      // 1. Create user
      const user = await userRepo.upsert({
        id: 'google-456',
        email: 'integration@test.com',
        display_name: 'Integration User',
      });
      expect(user.id).toBe('google-456');

      // 2. Store tokens
      const withTokens = await userRepo.updateTokens(user.id, {
        access_token: 'access-123',
        refresh_token: 'refresh-456',
        token_expiry: '2026-01-01T00:00:00Z',
      });
      expect(withTokens!.access_token).toBe('access-123');

      // 3. Create conversation
      const conv = await conversationRepo.create(user.id);
      expect(conv.user_id).toBe(user.id);

      // 4. Add messages
      await messageRepo.create({ conversation_id: conv.id, role: 'user', content: 'Schedule a meeting tomorrow at 10am' });
      await messageRepo.create({ conversation_id: conv.id, role: 'assistant', content: 'I\'ll create that event for you. Please confirm.' });

      const messages = await messageRepo.findByConversationId(conv.id);
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Schedule a meeting tomorrow at 10am');
      expect(messages[1].content).toBe("I'll create that event for you. Please confirm.");

      // 5. Create pending action
      const action = await pendingActionRepo.create({
        conversation_id: conv.id,
        action_type: 'create_event',
        action_payload: { summary: 'Meeting', startDateTime: '2026-01-30T10:00:00Z' },
      });
      expect(action.status).toBe('pending');

      // 6. Approve the action
      const approved = await pendingActionRepo.updateStatus(action.id, 'approved');
      expect(approved!.status).toBe('approved');
      expect(approved!.resolved_at).toBeDefined();

      // 7. Add confirmation message
      await messageRepo.create({ conversation_id: conv.id, role: 'assistant', content: 'Event created successfully.' });
      const allMessages = await messageRepo.findByConversationId(conv.id);
      expect(allMessages).toHaveLength(3);

      // 8. No more pending actions
      const remaining = await pendingActionRepo.findPendingByConversationId(conv.id);
      expect(remaining).toHaveLength(0);
    });
  });

  describe('Multi-user isolation', () => {
    it('should isolate conversations and messages between users', async () => {
      const user1 = await userRepo.upsert({ id: 'user-a', email: 'a@test.com', display_name: 'A' });
      const user2 = await userRepo.upsert({ id: 'user-b', email: 'b@test.com', display_name: 'B' });

      const conv1 = await conversationRepo.create(user1.id);
      const conv2 = await conversationRepo.create(user2.id);

      await messageRepo.create({ conversation_id: conv1.id, role: 'user', content: 'User A message' });
      await messageRepo.create({ conversation_id: conv2.id, role: 'user', content: 'User B message' });

      const user1Convs = await conversationRepo.findByUserId(user1.id);
      const user2Convs = await conversationRepo.findByUserId(user2.id);
      expect(user1Convs).toHaveLength(1);
      expect(user2Convs).toHaveLength(1);
      expect(user1Convs[0].id).not.toBe(user2Convs[0].id);

      const msgs1 = await messageRepo.findByConversationId(conv1.id);
      const msgs2 = await messageRepo.findByConversationId(conv2.id);
      expect(msgs1).toHaveLength(1);
      expect(msgs1[0].content).toBe('User A message');
      expect(msgs2).toHaveLength(1);
      expect(msgs2[0].content).toBe('User B message');
    });
  });

  describe('Pending action workflows', () => {
    it('should handle multiple actions with mixed statuses', async () => {
      await userRepo.upsert({ id: 'user-1', email: 'u@test.com', display_name: 'U' });
      const conv = await conversationRepo.create('user-1');

      const a1 = await pendingActionRepo.create({ conversation_id: conv.id, action_type: 'create_event', action_payload: { summary: 'Event 1' } });
      const a2 = await pendingActionRepo.create({ conversation_id: conv.id, action_type: 'delete_event', action_payload: { eventId: 'e1' } });
      const a3 = await pendingActionRepo.create({ conversation_id: conv.id, action_type: 'update_event', action_payload: { eventId: 'e2' } });

      // Approve first, reject second, leave third pending
      await pendingActionRepo.updateStatus(a1.id, 'approved');
      await pendingActionRepo.updateStatus(a2.id, 'rejected');

      const pending = await pendingActionRepo.findPendingByConversationId(conv.id);
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(a3.id);

      // Verify individual statuses
      const fetched1 = await pendingActionRepo.findById(a1.id);
      const fetched2 = await pendingActionRepo.findById(a2.id);
      expect(fetched1!.status).toBe('approved');
      expect(fetched1!.resolved_at).toBeDefined();
      expect(fetched2!.status).toBe('rejected');
      expect(fetched2!.resolved_at).toBeDefined();
    });
  });

  describe('User upsert idempotency', () => {
    it('should preserve tokens when upserting without token fields', async () => {
      await userRepo.upsert({ id: 'user-x', email: 'x@test.com', display_name: 'X' });
      await userRepo.updateTokens('user-x', {
        access_token: 'tok-1',
        refresh_token: 'ref-1',
        token_expiry: '2026-06-01T00:00:00Z',
      });

      // Upsert again without tokens — should not wipe them
      await userRepo.upsert({ id: 'user-x', email: 'x@test.com', display_name: 'X Updated' });
      const user = await userRepo.findById('user-x');
      expect(user!.display_name).toBe('X Updated');
      expect(user!.access_token).toBe('tok-1');
      expect(user!.refresh_token).toBe('ref-1');
    });
  });
});
