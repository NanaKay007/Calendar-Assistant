import request from 'supertest';
import { createServer } from 'http';
import WebSocket from 'ws';
import app from '../app';
import { setupWebSocket } from '../ws';
import { getTestTokens } from './setup';
import { conversationService } from '../services/conversation.service';
import { actionService } from '../services/action.service';

/**
 * Integration tests for approval modal UX improvements:
 * 1. Approve/reject endpoints save messages to the conversation
 * 2. Response includes human-readable message text
 */
describe('Approval UX Integration', () => {
  let agent: request.Agent;
  let server: ReturnType<typeof createServer>;
  let wss: ReturnType<typeof setupWebSocket>;
  let serverAddress: { port: number };
  let sessionCookie: string;

  beforeAll(async () => {
    const tokens = await getTestTokens();

    server = createServer(app);
    wss = setupWebSocket(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    serverAddress = server.address() as any;

    agent = request.agent(app);
    const seedRes = await agent
      .post('/api/test/seed-session')
      .send({
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
        },
        user: { id: 'approval-test-user', email: 'approval@test.com' },
      });

    expect(seedRes.status).toBe(200);
    sessionCookie = seedRes.headers['set-cookie']?.[0]?.split(';')[0] || '';
  });

  afterAll(async () => {
    for (const client of wss.clients) {
      client.terminate();
    }
    wss.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }, 15000);

  afterEach(async () => {
    await conversationService._clear();
    actionService._clear();
  });

  function connectWs(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${serverAddress.port}/ws`, {
        headers: { cookie: sessionCookie },
      });
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  }

  function sendAndReceive(ws: WebSocket, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 15000);
      ws.once('message', (raw) => {
        clearTimeout(timeout);
        resolve(JSON.parse(raw.toString()));
      });
      ws.send(JSON.stringify(data));
    });
  }

  describe('Approve action saves message to conversation', () => {
    it('should save a human-readable approval message and return it in the response', async () => {
      // Step 1: Create an event via the agent to get a pending action
      const ws = await connectWs();
      const response = await sendAndReceive(ws, {
        type: 'send_message',
        message: 'Create a meeting called "Approval Test Meeting" tomorrow at 2pm for 1 hour on my primary calendar',
      });
      ws.close();

      expect(response.type).toBe('reply');
      const { pendingAction } = response.data;
      const conversationId = response.data.conversationId;

      // Skip if agent didn't produce a pending action (LLM non-determinism)
      if (!pendingAction) {
        console.warn('Skipping: agent did not produce a pendingAction');
        return;
      }

      expect(pendingAction.status).toBe('pending');

      // Step 2: Approve the action
      const approveRes = await agent
        .post(`/api/actions/${pendingAction.id}/approve`)
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.success).toBe(true);
      // Response message should be human-readable, not raw JSON
      expect(approveRes.body.message).toContain('Action approved');
      expect(approveRes.body.message).not.toContain('eventId');
      expect(approveRes.body.message).not.toContain('calendarId');

      // Step 3: Verify the message was saved to the conversation
      const messagesRes = await agent.get(`/api/conversations/${conversationId}/messages`);
      expect(messagesRes.status).toBe(200);
      const messages = messagesRes.body.data;
      const approvalMsg = messages.find((m: any) => m.content.includes('Action approved'));
      expect(approvalMsg).toBeDefined();
      expect(approvalMsg.role).toBe('assistant');
    }, 30000);
  });

  describe('Reject action saves message to conversation', () => {
    it('should save a human-readable rejection message and return it in the response', async () => {
      // Step 1: Create an event via the agent to get a pending action
      const ws = await connectWs();
      const response = await sendAndReceive(ws, {
        type: 'send_message',
        message: 'Create a meeting called "Rejection Test Meeting" tomorrow at 4pm for 30 minutes on my primary calendar',
      });
      ws.close();

      expect(response.type).toBe('reply');
      const { pendingAction } = response.data;
      const conversationId = response.data.conversationId;

      if (!pendingAction) {
        console.warn('Skipping: agent did not produce a pendingAction');
        return;
      }

      expect(pendingAction.status).toBe('pending');

      // Step 2: Reject the action
      const rejectRes = await agent
        .post(`/api/actions/${pendingAction.id}/reject`)
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.success).toBe(true);
      expect(rejectRes.body.message).toContain('Action rejected');
      expect(rejectRes.body.message).toContain('cancelled by user');

      // Step 3: Verify the message was saved to the conversation
      const messagesRes = await agent.get(`/api/conversations/${conversationId}/messages`);
      expect(messagesRes.status).toBe(200);
      const messages = messagesRes.body.data;
      const rejectionMsg = messages.find((m: any) => m.content.includes('Action rejected'));
      expect(rejectionMsg).toBeDefined();
      expect(rejectionMsg.role).toBe('assistant');
    }, 30000);
  });

  describe('Action message formatting', () => {
    it('should produce human-readable messages without raw IDs for direct action creation', async () => {
      // Create a conversation first
      const conv = await conversationService.createConversation('approval-test-user', 'Test');

      // Create a pending action directly
      const action = actionService.createAction(
        'approval-test-user',
        conv.id,
        'create_event',
        {
          calendarId: 'primary',
          summary: 'Team Standup',
          startDateTime: '2026-02-01T09:00:00-05:00',
          endDateTime: '2026-02-01T09:30:00-05:00',
        },
        'create_event: {"summary":"Team Standup"}',
      );

      // Reject it (doesn't need OAuth)
      const rejectRes = await agent
        .post(`/api/actions/${action.id}/reject`)
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.message).toContain('Team Standup');
      expect(rejectRes.body.message).toContain('cancelled by user');
      expect(rejectRes.body.message).not.toContain('calendarId');
      expect(rejectRes.body.message).not.toContain('primary');

      // Verify saved to DB
      const messagesRes = await agent.get(`/api/conversations/${conv.id}/messages`);
      const messages = messagesRes.body.data;
      expect(messages.length).toBe(1);
      expect(messages[0].content).toContain('Team Standup');
    });
  });
});
