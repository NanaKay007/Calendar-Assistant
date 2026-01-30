import request from 'supertest';
import { createServer } from 'http';
import WebSocket from 'ws';
import app from '../app';
import { setupWebSocket } from '../ws';
import { conversationService } from '../services/conversation.service';
import { actionService } from '../services/action.service';
import { chatService } from '../services/chat.service';

// Mock chatService.sendMessage to avoid hitting the real LangChain agent
jest.spyOn(chatService, 'sendMessage').mockImplementation(
  async (userId: string, conversationId: string | null, message: string, _accessToken: string) => {
    // Create conversation + messages via the real conversation service
    let convId = conversationId;
    if (!convId) {
      const conv = await conversationService.createConversation(userId, message.slice(0, 30));
      convId = conv.id;
    }
    const conversation = await conversationService.getConversation(convId!);
    if (!conversation) throw new Error('Conversation not found');

    await conversationService.addMessage(convId!, 'user', message);
    const reply = `Mock reply to: ${message}`;
    await conversationService.addMessage(convId!, 'assistant', reply);

    return { reply, conversationId: convId! };
  }
);

describe('Chat & HITL API', () => {
  let agent: request.Agent;
  let server: ReturnType<typeof createServer>;
  let wss: ReturnType<typeof setupWebSocket>;
  let serverAddress: { port: number };
  let sessionCookie: string;

  beforeAll(async () => {
    server = createServer(app);
    wss = setupWebSocket(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    serverAddress = server.address() as any;

    agent = request.agent(app);

    // Seed session with fake tokens/user for unit testing
    const seedRes = await agent
      .post('/api/test/seed-session')
      .send({
        tokens: { access_token: 'fake-token' },
        user: { id: 'test-user-1', email: 'test@test.com' },
      });

    expect(seedRes.status).toBe(200);
    // Extract session cookie for WebSocket connections
    sessionCookie = seedRes.headers['set-cookie']?.[0]?.split(';')[0] || '';
  });

  afterAll(async () => {
    for (const client of wss.clients) {
      client.terminate();
    }
    wss.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }, 10000);

  afterEach(async () => {
    await conversationService._clear();
    actionService._clear();
  });

  function connectWs(cookie?: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${serverAddress.port}/ws`, {
        headers: cookie ? { cookie } : undefined,
      });
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  }

  function sendAndReceive(ws: WebSocket, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 8000);
      ws.once('message', (raw) => {
        clearTimeout(timeout);
        resolve(JSON.parse(raw.toString()));
      });
      ws.send(JSON.stringify(data));
    });
  }

  describe('WebSocket /ws', () => {
    it('should reject connection without a session', async () => {
      await expect(connectWs()).rejects.toThrow();
    });

    it('should accept connection with valid session cookie', async () => {
      const ws = await connectWs(sessionCookie);
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
    });

    it('should return error for invalid JSON', async () => {
      const ws = await connectWs(sessionCookie);
      const response = await new Promise<any>((resolve) => {
        ws.once('message', (raw) => resolve(JSON.parse(raw.toString())));
        ws.send('not json');
      });
      expect(response.type).toBe('error');
      expect(response.error).toBe('Invalid JSON');
      ws.close();
    });

    it('should return error for unknown message type', async () => {
      const ws = await connectWs(sessionCookie);
      const response = await sendAndReceive(ws, { type: 'unknown' });
      expect(response.type).toBe('error');
      expect(response.error).toContain('Unknown message type');
      ws.close();
    });

    it('should return error if message is missing', async () => {
      const ws = await connectWs(sessionCookie);
      const response = await sendAndReceive(ws, { type: 'send_message' });
      expect(response.type).toBe('error');
      expect(response.error).toBe('message is required');
      ws.close();
    });

    it('should return error for empty message', async () => {
      const ws = await connectWs(sessionCookie);
      const response = await sendAndReceive(ws, { type: 'send_message', message: '   ' });
      expect(response.type).toBe('error');
      expect(response.error).toBe('message is required');
      ws.close();
    });

    it('should return error for message exceeding max length', async () => {
      const ws = await connectWs(sessionCookie);
      const response = await sendAndReceive(ws, {
        type: 'send_message',
        message: 'a'.repeat(4001),
      });
      expect(response.type).toBe('error');
      expect(response.error).toContain('maximum length');
      ws.close();
    });

    it('should create a new conversation and return a reply', async () => {
      const ws = await connectWs(sessionCookie);
      const response = await sendAndReceive(ws, {
        type: 'send_message',
        message: 'Hello assistant',
      });
      expect(response.type).toBe('reply');
      expect(response.data.reply).toBeDefined();
      expect(response.data.conversationId).toBeDefined();
      ws.close();
    });

    it('should continue an existing conversation', async () => {
      const ws = await connectWs(sessionCookie);
      const first = await sendAndReceive(ws, {
        type: 'send_message',
        message: 'First message',
      });
      const convId = first.data.conversationId;

      const second = await sendAndReceive(ws, {
        type: 'send_message',
        message: 'Second message',
        conversationId: convId,
      });
      expect(second.data.conversationId).toBe(convId);
      ws.close();
    });

    it('should return error for non-existent conversationId', async () => {
      const ws = await connectWs(sessionCookie);
      const response = await sendAndReceive(ws, {
        type: 'send_message',
        message: 'hello',
        conversationId: 'non-existent-id',
      });
      expect(response.type).toBe('error');
      expect(response.error).toContain('not found');
      ws.close();
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

    it('should list conversations after chatting via WebSocket', async () => {
      const ws = await connectWs(sessionCookie);
      await sendAndReceive(ws, { type: 'send_message', message: 'Hello' });
      ws.close();

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
      const ws = await connectWs(sessionCookie);
      const chatRes = await sendAndReceive(ws, { type: 'send_message', message: 'Hello there' });
      ws.close();
      const convId = chatRes.data.conversationId;

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
      const res = await agent.post('/api/actions/non-existent/approve')
        .set('X-Requested-With', 'XMLHttpRequest');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/actions/:id/reject', () => {
    it('should return 404 for non-existent action', async () => {
      const res = await agent.post('/api/actions/non-existent/reject')
        .set('X-Requested-With', 'XMLHttpRequest');
      expect(res.status).toBe(404);
    });

    it('should reject a pending action', async () => {
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

      const res = await agent.post(`/api/actions/${action.id}/reject`)
        .set('X-Requested-With', 'XMLHttpRequest');
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

      await agent.post(`/api/actions/${action.id}/reject`)
        .set('X-Requested-With', 'XMLHttpRequest');
      const res = await agent.post(`/api/actions/${action.id}/reject`)
        .set('X-Requested-With', 'XMLHttpRequest');
      expect(res.status).toBe(409);
    });
  });
});
