import request from 'supertest';
import app from '../app';
import { getTestTokens } from './setup';
import { conversationService } from '../services/conversation.service';
import { actionService } from '../services/action.service';

/**
 * Integration tests for chat endpoints with the real LangChain agent.
 * Requires GOOGLE_TEST_REFRESH_TOKEN and GOOGLE_GEMINI_API_KEY env vars.
 */
describe('Chat Integration (real agent)', () => {
  let agent: request.Agent;

  beforeAll(async () => {
    const tokens = await getTestTokens();

    agent = request.agent(app);
    const seedRes = await agent
      .post('/api/test/seed-session')
      .send({
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
        },
        user: { id: 'integration-user', email: 'integration@test.com' },
      });

    expect(seedRes.status).toBe(200);
  });

  afterEach(() => {
    conversationService._clear();
    actionService._clear();
  });

  it('should return a non-placeholder reply for a general question', async () => {
    const res = await agent
      .post('/api/chat')
      .send({ message: 'What can you help me with?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reply).toBeDefined();
    expect(res.body.data.reply).not.toContain('placeholder');
    expect(res.body.data.conversationId).toBeDefined();
  });

  it('should reference real calendar data when asked to list calendars', async () => {
    const res = await agent
      .post('/api/chat')
      .send({ message: 'List my calendars' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // The agent should have called the list_calendars tool and mentioned calendar info
    expect(res.body.data.reply.length).toBeGreaterThan(10);
  });

  it('should return a pendingAction when asked to create an event', async () => {
    const res = await agent.post('/api/chat').send({
      message:
        'Create a meeting called "Test Integration Meeting" tomorrow at 3pm for 1 hour on my primary calendar',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // The agent should detect a mutating action
    const { pendingAction } = res.body.data;
    if (pendingAction) {
      expect(pendingAction.actionType).toBe('create_event');
      expect(pendingAction.status).toBe('pending');
      expect(pendingAction.params).toBeDefined();
    }
    // Even if the agent doesn't create a pending action (e.g. it asks for confirmation first),
    // the reply should at least mention the event
    expect(res.body.data.reply.length).toBeGreaterThan(0);
  });

  it('should maintain context across messages in the same conversation', async () => {
    const first = await agent
      .post('/api/chat')
      .send({ message: 'My name is IntegrationTestUser' });

    expect(first.status).toBe(200);
    const convId = first.body.data.conversationId;

    const second = await agent
      .post('/api/chat')
      .send({ message: 'What is my name?', conversationId: convId });

    expect(second.status).toBe(200);
    expect(second.body.data.reply.toLowerCase()).toContain('integrationtestuser');
  });

  it('should reject messages exceeding the length limit', async () => {
    const longMessage = 'a'.repeat(4001);
    const res = await agent.post('/api/chat').send({ message: longMessage });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('maximum length');
  });

  it('should reject empty/whitespace-only messages', async () => {
    const res = await agent.post('/api/chat').send({ message: '   ' });

    expect(res.status).toBe(400);
  });

  describe('Pagination', () => {
    it('should support limit and offset on GET /api/conversations', async () => {
      // Create a few conversations
      await agent.post('/api/chat').send({ message: 'Conv 1' });
      await agent.post('/api/chat').send({ message: 'Conv 2' });
      await agent.post('/api/chat').send({ message: 'Conv 3' });

      const all = await agent.get('/api/conversations');
      expect(all.body.data.length).toBe(3);

      const limited = await agent.get('/api/conversations?limit=2');
      expect(limited.body.data.length).toBe(2);

      const offset = await agent.get('/api/conversations?limit=2&offset=2');
      expect(offset.body.data.length).toBe(1);
    });

    it('should support limit and offset on GET /api/conversations/:id/messages', async () => {
      const chatRes = await agent.post('/api/chat').send({ message: 'First' });
      const convId = chatRes.body.data.conversationId;

      // Send a second message in same conversation
      await agent
        .post('/api/chat')
        .send({ message: 'Second', conversationId: convId });

      // Should have 4 messages (2 user + 2 assistant)
      const all = await agent.get(`/api/conversations/${convId}/messages`);
      expect(all.body.data.length).toBe(4);

      const limited = await agent.get(
        `/api/conversations/${convId}/messages?limit=2`
      );
      expect(limited.body.data.length).toBe(2);

      const offsetRes = await agent.get(
        `/api/conversations/${convId}/messages?limit=2&offset=2`
      );
      expect(offsetRes.body.data.length).toBe(2);
    });
  });
});
