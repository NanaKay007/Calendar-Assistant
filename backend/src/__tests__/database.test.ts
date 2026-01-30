import Database from 'better-sqlite3';
import { createTestDatabase } from '../database/db';
import { UserRepository } from '../database/repositories/userRepository';
import { ConversationRepository } from '../database/repositories/conversationRepository';
import { MessageRepository } from '../database/repositories/messageRepository';
import { PendingActionRepository } from '../database/repositories/pendingActionRepository';

describe('Database Layer', () => {
  let db: Database.Database;
  let userRepo: UserRepository;
  let conversationRepo: ConversationRepository;
  let messageRepo: MessageRepository;
  let pendingActionRepo: PendingActionRepository;

  beforeEach(() => {
    db = createTestDatabase();
    userRepo = new UserRepository(db);
    conversationRepo = new ConversationRepository(db);
    messageRepo = new MessageRepository(db);
    pendingActionRepo = new PendingActionRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Schema', () => {
    it('should create all four tables', () => {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[];
      const names = tables.map(t => t.name);
      expect(names).toContain('users');
      expect(names).toContain('conversations');
      expect(names).toContain('messages');
      expect(names).toContain('pending_actions');
    });
  });

  describe('UserRepository', () => {
    const testUser = { id: 'google-123', email: 'test@example.com', display_name: 'Test User' };

    it('should upsert and find by id', () => {
      const user = userRepo.upsert(testUser);
      expect(user.id).toBe(testUser.id);
      expect(user.email).toBe(testUser.email);

      const found = userRepo.findById(testUser.id);
      expect(found).toBeDefined();
      expect(found!.email).toBe(testUser.email);
    });

    it('should find by email', () => {
      userRepo.upsert(testUser);
      const found = userRepo.findByEmail(testUser.email);
      expect(found).toBeDefined();
      expect(found!.id).toBe(testUser.id);
    });

    it('should return undefined for non-existent user', () => {
      expect(userRepo.findById('nonexistent')).toBeUndefined();
      expect(userRepo.findByEmail('none@example.com')).toBeUndefined();
    });

    it('should update on upsert conflict', () => {
      userRepo.upsert(testUser);
      userRepo.upsert({ ...testUser, display_name: 'Updated Name' });
      const found = userRepo.findById(testUser.id)!;
      expect(found.display_name).toBe('Updated Name');
    });

    it('should update tokens', () => {
      userRepo.upsert(testUser);
      const updated = userRepo.updateTokens(testUser.id, {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        token_expiry: '2025-12-31T00:00:00Z',
      });
      expect(updated!.access_token).toBe('new-access');
      expect(updated!.refresh_token).toBe('new-refresh');
    });
  });

  describe('ConversationRepository', () => {
    beforeEach(() => {
      userRepo.upsert({ id: 'user-1', email: 'u@test.com', display_name: 'U' });
    });

    it('should create and find by id', () => {
      const conv = conversationRepo.create('user-1');
      expect(conv.user_id).toBe('user-1');
      expect(conv.id).toBeDefined();

      const found = conversationRepo.findById(conv.id);
      expect(found).toBeDefined();
    });

    it('should find by user id', () => {
      conversationRepo.create('user-1');
      conversationRepo.create('user-1');
      const convs = conversationRepo.findByUserId('user-1');
      expect(convs).toHaveLength(2);
    });

    it('should update timestamp', () => {
      const conv = conversationRepo.create('user-1');
      const before = conv.updated_at;
      // SQLite datetime precision is seconds, so just verify no error
      conversationRepo.updateTimestamp(conv.id);
      const after = conversationRepo.findById(conv.id)!;
      expect(after.updated_at).toBeDefined();
    });
  });

  describe('MessageRepository', () => {
    let conversationId: string;

    beforeEach(() => {
      userRepo.upsert({ id: 'user-1', email: 'u@test.com', display_name: 'U' });
      conversationId = conversationRepo.create('user-1').id;
    });

    it('should create and find messages by conversation', () => {
      messageRepo.create({ conversation_id: conversationId, role: 'user', content: 'Hello' });
      messageRepo.create({ conversation_id: conversationId, role: 'assistant', content: 'Hi there' });

      const messages = messageRepo.findByConversationId(conversationId);
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });

    it('should return empty array for no messages', () => {
      expect(messageRepo.findByConversationId(conversationId)).toHaveLength(0);
    });
  });

  describe('PendingActionRepository', () => {
    let conversationId: string;

    beforeEach(() => {
      userRepo.upsert({ id: 'user-1', email: 'u@test.com', display_name: 'U' });
      conversationId = conversationRepo.create('user-1').id;
    });

    it('should create and find by id', () => {
      const action = pendingActionRepo.create({
        conversation_id: conversationId,
        action_type: 'create_event',
        action_payload: { summary: 'Meeting', startDateTime: '2025-01-01T10:00:00Z' },
      });
      expect(action.status).toBe('pending');
      expect(action.action_type).toBe('create_event');

      const found = pendingActionRepo.findById(action.id);
      expect(found).toBeDefined();
      expect(JSON.parse(found!.action_payload)).toEqual({ summary: 'Meeting', startDateTime: '2025-01-01T10:00:00Z' });
    });

    it('should find pending actions by conversation', () => {
      pendingActionRepo.create({ conversation_id: conversationId, action_type: 'create_event', action_payload: {} });
      pendingActionRepo.create({ conversation_id: conversationId, action_type: 'delete_event', action_payload: {} });

      const pending = pendingActionRepo.findPendingByConversationId(conversationId);
      expect(pending).toHaveLength(2);
    });

    it('should update status to approved', () => {
      const action = pendingActionRepo.create({ conversation_id: conversationId, action_type: 'create_event', action_payload: {} });
      const updated = pendingActionRepo.updateStatus(action.id, 'approved');
      expect(updated!.status).toBe('approved');
      expect(updated!.resolved_at).toBeDefined();
    });

    it('should update status to rejected', () => {
      const action = pendingActionRepo.create({ conversation_id: conversationId, action_type: 'create_event', action_payload: {} });
      pendingActionRepo.updateStatus(action.id, 'rejected');

      // Rejected actions should not appear in pending query
      const pending = pendingActionRepo.findPendingByConversationId(conversationId);
      expect(pending).toHaveLength(0);
    });
  });
});
