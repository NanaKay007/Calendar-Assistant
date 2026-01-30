import request from 'supertest';
import { createServer } from 'http';
import WebSocket from 'ws';
import app from '../app';
import { setupWebSocket } from '../ws';
import { getTestTokens } from './setup';
import { conversationService } from '../services/conversation.service';
import { actionService } from '../services/action.service';

/**
 * Integration tests for conversation history endpoints.
 * Requires GOOGLE_TEST_REFRESH_TOKEN and GOOGLE_GEMINI_API_KEY env vars.
 */
describe('Conversation History Integration', () => {
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
        user: { id: 'conv-history-user', email: 'convhistory@test.com' },
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

  it('should list conversations via GET /api/conversations', async () => {
    // Create a conversation by sending a message via WebSocket
    const ws = await connectWs();
    const response = await sendAndReceive(ws, {
      type: 'send_message',
      message: 'Hello from conversation history test',
    });
    ws.close();

    expect(response.type).toBe('reply');
    expect(response.data.conversationId).toBeDefined();

    // Fetch conversations
    const res = await agent.get('/api/conversations');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const conv = res.body.data.find(
      (c: any) => c.id === response.data.conversationId
    );
    expect(conv).toBeDefined();
    expect(conv.id).toBe(response.data.conversationId);
    expect(conv.user_id).toBe('conv-history-user');
    expect(conv.title).toBeDefined();
    expect(conv.created_at).toBeDefined();
    expect(conv.updated_at).toBeDefined();
  });

  it('should fetch messages for a conversation via GET /api/conversations/:id/messages', async () => {
    const ws = await connectWs();
    const response = await sendAndReceive(ws, {
      type: 'send_message',
      message: 'Test message for history retrieval',
    });
    ws.close();

    const conversationId = response.data.conversationId;
    expect(conversationId).toBeDefined();

    // Fetch messages for the conversation
    const res = await agent.get(`/api/conversations/${conversationId}/messages`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Should have at least a user message and an assistant reply
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    // Verify message structure
    const userMsg = res.body.data.find(
      (m: any) => m.role === 'user' && m.content === 'Test message for history retrieval'
    );
    expect(userMsg).toBeDefined();
    expect(userMsg.conversation_id).toBe(conversationId);
    expect(userMsg.created_at).toBeDefined();

    const assistantMsg = res.body.data.find((m: any) => m.role === 'assistant');
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg.content.length).toBeGreaterThan(0);
  });

  it('should return 404 for non-existent conversation messages', async () => {
    const res = await agent.get('/api/conversations/nonexistent-id/messages');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should return empty array when user has no conversations', async () => {
    const res = await agent.get('/api/conversations');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('should fetch multiple conversations and their messages independently', async () => {
    const ws = await connectWs();

    // Create first conversation
    const first = await sendAndReceive(ws, {
      type: 'send_message',
      message: 'First conversation message',
    });
    const convId1 = first.data.conversationId;

    // Create second conversation (new one, no conversationId)
    // We need to disconnect and reconnect or just send without conversationId
    // Since not passing conversationId creates a new one:
    const second = await sendAndReceive(ws, {
      type: 'send_message',
      message: 'Second conversation message',
    });
    const convId2 = second.data.conversationId;
    ws.close();

    // They should be different conversations
    expect(convId1).not.toBe(convId2);

    // Fetch conversations list
    const listRes = await agent.get('/api/conversations');
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(2);

    // Fetch messages for each
    const msgs1 = await agent.get(`/api/conversations/${convId1}/messages`);
    expect(msgs1.status).toBe(200);
    expect(msgs1.body.data.length).toBeGreaterThanOrEqual(2);

    const msgs2 = await agent.get(`/api/conversations/${convId2}/messages`);
    expect(msgs2.status).toBe(200);
    expect(msgs2.body.data.length).toBeGreaterThanOrEqual(2);
  });
});
