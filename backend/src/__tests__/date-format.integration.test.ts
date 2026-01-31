import request from 'supertest';
import { createServer } from 'http';
import WebSocket from 'ws';
import app from '../app';
import { setupWebSocket } from '../ws';
import { getTestTokens } from './setup';
import { conversationService } from '../services/conversation.service';
import { actionService } from '../services/action.service';

/**
 * Integration tests verifying that conversation and message timestamps
 * returned by the API are valid ISO date strings parseable by new Date().
 *
 * Requires GOOGLE_TEST_REFRESH_TOKEN and GOOGLE_GEMINI_API_KEY env vars.
 */
describe('Date Format Integration', () => {
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
        user: { id: 'date-format-user', email: 'dateformat@test.com' },
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

  it('should return conversation timestamps in camelCase that are valid dates', async () => {
    // Create a conversation via WebSocket
    const ws = await connectWs();
    const response = await sendAndReceive(ws, {
      type: 'send_message',
      message: 'Date format test message',
    });
    ws.close();

    expect(response.type).toBe('reply');
    const conversationId = response.data.conversationId;
    expect(conversationId).toBeDefined();

    // Fetch conversations and verify date fields
    const res = await agent.get('/api/conversations');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const conv = res.body.data.find((c: any) => c.id === conversationId);
    expect(conv).toBeDefined();

    // Verify camelCase field names exist
    expect(conv.createdAt).toBeDefined();
    expect(conv.updatedAt).toBeDefined();

    // Verify they parse to valid dates
    const createdDate = new Date(conv.createdAt);
    const updatedDate = new Date(conv.updatedAt);
    expect(isNaN(createdDate.getTime())).toBe(false);
    expect(isNaN(updatedDate.getTime())).toBe(false);
  });

  it('should return message timestamps in camelCase that are valid dates', async () => {
    // Create a conversation via WebSocket
    const ws = await connectWs();
    const response = await sendAndReceive(ws, {
      type: 'send_message',
      message: 'Message date format test',
    });
    ws.close();

    const conversationId = response.data.conversationId;
    expect(conversationId).toBeDefined();

    // Fetch messages and verify date fields
    const res = await agent.get(`/api/conversations/${conversationId}/messages`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    for (const msg of res.body.data) {
      // Verify camelCase field name exists
      expect(msg.createdAt).toBeDefined();

      // Verify it parses to a valid date
      const date = new Date(msg.createdAt);
      expect(isNaN(date.getTime())).toBe(false);

      // Verify conversationId is also camelCase
      expect(msg.conversationId).toBe(conversationId);
    }
  });
});
