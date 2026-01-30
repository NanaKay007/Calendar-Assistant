import request from 'supertest';
import app from '../app';
import { conversationService } from '../services/conversation.service';
import { actionService } from '../services/action.service';

describe('Chat & HITL API', () => {
  let agent: request.Agent;

  beforeAll(async () => {
    agent = request.agent(app);

    // Seed session with fake tokens/user for unit testing
    const seedRes = await agent
      .post('/api/test/seed-session')
      .send({
        tokens: { access_token: 'fake-token' },
        user: { id: 'test-user-1', email: 'test@test.com' },
      });

    expect(seedRes.status).toBe(200);
  });

  afterEach(() => {
    conversationService._clear();
    actionService._clear();
  });

  describe('POST /api/chat', () => {
    it('should return 401 without a session', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'hello' });
      expect(res.status).toBe(401);
    });

    it('should return 400 if message is missing', async () => {
      const res = await agent.post('/api/chat').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should create a new conversation and return a reply', async () => {
      const res = await agent.post('/api/chat').send({ message: 'Hello assistant' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reply).toBeDefined();
      expect(res.body.data.conversationId).toBeDefined();
    });

    it('should continue an existing conversation', async () => {
      const first = await agent.post('/api/chat').send({ message: 'First message' });
      const convId = first.body.data.conversationId;

      const second = await agent
        .post('/api/chat')
        .send({ message: 'Second message', conversationId: convId });

      expect(second.status).toBe(200);
      expect(second.body.data.conversationId).toBe(convId);
    });

    it('should return 404 for non-existent conversationId', async () => {
      const res = await agent
        .post('/api/chat')
        .send({ message: 'hello', conversationId: 'non-existent-id' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/conversations', () => {
    it('should return 401 without a session', async () => {
      const res = await request(app).get('/api/conversations');
      expect(res.status).toBe(401);
    });

    it('should return empty list initially', async () => {
      const res = await agent.get('/api/conversations');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should list conversations after chatting', async () => {
      await agent.post('/api/chat').send({ message: 'Hello' });

      const res = await agent.get('/api/conversations');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBeDefined();
    });
  });

  describe('GET /api/conversations/:id/messages', () => {
    it('should return 404 for non-existent conversation', async () => {
      const res = await agent.get('/api/conversations/non-existent/messages');
      expect(res.status).toBe(404);
    });

    it('should return messages for a conversation', async () => {
      const chatRes = await agent.post('/api/chat').send({ message: 'Hello there' });
      const convId = chatRes.body.data.conversationId;

      const res = await agent.get(`/api/conversations/${convId}/messages`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2); // user + assistant
      expect(res.body.data[0].role).toBe('user');
      expect(res.body.data[1].role).toBe('assistant');
    });
  });

  describe('GET /api/actions/pending', () => {
    it('should return 401 without a session', async () => {
      const res = await request(app).get('/api/actions/pending');
      expect(res.status).toBe(401);
    });

    it('should return empty list when no pending actions', async () => {
      const res = await agent.get('/api/actions/pending');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('POST /api/actions/:id/approve', () => {
    it('should return 404 for non-existent action', async () => {
      const res = await agent.post('/api/actions/non-existent/approve');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/actions/:id/reject', () => {
    it('should return 404 for non-existent action', async () => {
      const res = await agent.post('/api/actions/non-existent/reject');
      expect(res.status).toBe(404);
    });

    it('should reject a pending action', async () => {
      // Manually create a pending action for testing
      const action = actionService.createAction(
        'test-user-1',
        'conv-1',
        'create_event',
        {
          calendarId: 'primary',
          summary: 'Test',
          startDateTime: new Date().toISOString(),
          endDateTime: new Date().toISOString(),
        },
        'Create test event'
      );

      const res = await agent.post(`/api/actions/${action.id}/reject`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('rejected');
    });

    it('should return 409 when rejecting an already rejected action', async () => {
      const action = actionService.createAction(
        'test-user-1',
        'conv-1',
        'create_event',
        {
          calendarId: 'primary',
          summary: 'Test',
          startDateTime: new Date().toISOString(),
          endDateTime: new Date().toISOString(),
        },
        'Create test event'
      );

      await agent.post(`/api/actions/${action.id}/reject`);
      const res = await agent.post(`/api/actions/${action.id}/reject`);
      expect(res.status).toBe(409);
    });
  });
});
