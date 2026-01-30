import request from 'supertest';
import { createServer } from 'http';
import WebSocket from 'ws';
import app from '../app';
import { setupWebSocket } from '../ws';
import { getTestTokens } from './setup';
import { conversationService } from '../services/conversation.service';
import { actionService } from '../services/action.service';

/**
 * Integration tests for chat via WebSocket with the real LangChain agent.
 * Requires GOOGLE_TEST_REFRESH_TOKEN and GOOGLE_GEMINI_API_KEY env vars.
 */
describe('Chat Integration (real agent)', () => {
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
        user: { id: 'integration-user', email: 'integration@test.com' },
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

  afterEach(() => {
    conversationService._clear();
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

  it('should return a non-placeholder reply for a general question', async () => {
    const ws = await connectWs();
    const response = await sendAndReceive(ws, {
      type: 'send_message',
      message: 'What can you help me with?',
    });
    ws.close();

    expect(response.type).toBe('reply');
    expect(response.data.reply).toBeDefined();
    expect(response.data.reply).not.toContain('placeholder');
    expect(response.data.conversationId).toBeDefined();
  });

  it('should reference real calendar data when asked to list calendars', async () => {
    const ws = await connectWs();
    const response = await sendAndReceive(ws, {
      type: 'send_message',
      message: 'List my calendars',
    });
    ws.close();

    expect(response.type).toBe('reply');
    expect(response.data.reply.length).toBeGreaterThan(10);
  });

  it('should return a pendingAction when asked to create an event', async () => {
    const ws = await connectWs();
    const response = await sendAndReceive(ws, {
      type: 'send_message',
      message:
        'Create a meeting called "Test Integration Meeting" tomorrow at 3pm for 1 hour on my primary calendar',
    });
    ws.close();

    expect(response.type).toBe('reply');
    const { pendingAction } = response.data;
    if (pendingAction) {
      expect(pendingAction.type).toBe('create_event');
      expect(pendingAction.status).toBe('pending');
      expect(pendingAction.details).toBeDefined();
    }
    expect(response.data.reply.length).toBeGreaterThan(0);
  });

  it('should maintain context across messages in the same conversation', async () => {
    const ws = await connectWs();
    const first = await sendAndReceive(ws, {
      type: 'send_message',
      message: 'My name is IntegrationTestUser',
    });
    const convId = first.data.conversationId;

    const second = await sendAndReceive(ws, {
      type: 'send_message',
      message: 'What is my name?',
      conversationId: convId,
    });
    ws.close();

    expect(second.data.reply.toLowerCase()).toContain('integrationtestuser');
  });

  it('should reject messages exceeding the length limit', async () => {
    const ws = await connectWs();
    const response = await sendAndReceive(ws, {
      type: 'send_message',
      message: 'a'.repeat(4001),
    });
    ws.close();

    expect(response.type).toBe('error');
    expect(response.error).toContain('maximum length');
  });

  it('should reject empty/whitespace-only messages', async () => {
    const ws = await connectWs();
    const response = await sendAndReceive(ws, {
      type: 'send_message',
      message: '   ',
    });
    ws.close();

    expect(response.type).toBe('error');
    expect(response.error).toBe('message is required');
  });

  describe('Pagination', () => {
    it('should support limit and offset on GET /api/conversations', async () => {
      const ws = await connectWs();
      await sendAndReceive(ws, { type: 'send_message', message: 'Conv 1' });
      await sendAndReceive(ws, { type: 'send_message', message: 'Conv 2' });
      await sendAndReceive(ws, { type: 'send_message', message: 'Conv 3' });
      ws.close();

      const all = await agent.get('/api/conversations');
      expect(all.body.data.length).toBe(3);

      const limited = await agent.get('/api/conversations?limit=2');
      expect(limited.body.data.length).toBe(2);

      const offset = await agent.get('/api/conversations?limit=2&offset=2');
      expect(offset.body.data.length).toBe(1);
    });

    it('should support limit and offset on GET /api/conversations/:id/messages', async () => {
      const ws = await connectWs();
      const chatRes = await sendAndReceive(ws, { type: 'send_message', message: 'First' });
      const convId = chatRes.data.conversationId;

      await sendAndReceive(ws, {
        type: 'send_message',
        message: 'Second',
        conversationId: convId,
      });
      ws.close();

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
