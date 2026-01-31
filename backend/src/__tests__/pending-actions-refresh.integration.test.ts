import request from 'supertest';
import { createServer } from 'http';
import WebSocket from 'ws';
import app from '../app';
import { setupWebSocket } from '../ws';
import { getTestTokens } from './setup';
import { conversationService } from '../services/conversation.service';
import { actionService } from '../services/action.service';

/**
 * Integration tests for persisting pending actions across page refresh.
 * Verifies that pending actions can be fetched via the REST API after
 * they are created via the chat flow, simulating a browser refresh.
 *
 * Requires GOOGLE_TEST_REFRESH_TOKEN and GOOGLE_GEMINI_API_KEY env vars.
 */
describe('Pending actions persist across refresh', () => {
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
        user: { id: 'refresh-test-user', email: 'refresh-test@test.com' },
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
      const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);
      ws.once('message', (raw) => {
        clearTimeout(timeout);
        resolve(JSON.parse(raw.toString()));
      });
      ws.send(JSON.stringify(data));
    });
  }

  it('should fetch pending actions for a conversation via GET /api/actions/pending', async () => {
    // Step 1: Create a pending action via the chat flow
    const ws = await connectWs();
    const response = await sendAndReceive(ws, {
      type: 'send_message',
      message:
        'Create a meeting called "Refresh Test Meeting" tomorrow at 2pm for 30 minutes on my primary calendar',
    });
    ws.close();

    expect(response.type).toBe('reply');
    const conversationId = response.data.conversationId;
    expect(conversationId).toBeDefined();

    // The LLM may or may not return a pendingAction depending on its response.
    // Regardless, let's also manually create one to ensure deterministic testing.
    const manualAction = actionService.createAction(
      'refresh-test-user',
      conversationId,
      'create_event',
      {
        calendarId: 'primary',
        summary: 'Manual Test Event',
        startDateTime: new Date(Date.now() + 86400000).toISOString(),
        endDateTime: new Date(Date.now() + 86400000 + 1800000).toISOString(),
      },
      'Create event: Manual Test Event',
    );

    // Step 2: Simulate refresh - fetch pending actions via REST API
    const res = await agent.get(
      `/api/actions/pending?conversationId=${conversationId}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    // Should contain at least the manual action
    const found = res.body.data.find((a: any) => a.id === manualAction.id);
    expect(found).toBeDefined();
    expect(found.type).toBe('create_event');
    expect(found.status).toBe('pending');
    expect(found.description).toBe('Create event: Manual Test Event');
  }, 60000);

  it('should still allow approving a pending action fetched after refresh', async () => {
    // Create a conversation first
    const ws = await connectWs();
    const chatRes = await sendAndReceive(ws, {
      type: 'send_message',
      message: 'Hello',
    });
    ws.close();
    const conversationId = chatRes.data.conversationId;

    // Create a pending action
    const action = actionService.createAction(
      'refresh-test-user',
      conversationId,
      'create_event',
      {
        calendarId: 'primary',
        summary: 'Approvable After Refresh',
        startDateTime: new Date(Date.now() + 86400000).toISOString(),
        endDateTime: new Date(Date.now() + 86400000 + 3600000).toISOString(),
      },
      'Create event: Approvable After Refresh',
    );

    // Simulate refresh: fetch via API
    const fetchRes = await agent.get(
      `/api/actions/pending?conversationId=${conversationId}`,
    );
    expect(fetchRes.body.data.length).toBeGreaterThanOrEqual(1);

    // Approve the action (this calls the real Google Calendar API)
    const approveRes = await agent
      .post(`/api/actions/${action.id}/approve`)
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data.status).toBe('executed');

    // Verify it's no longer pending
    const afterRes = await agent.get(
      `/api/actions/pending?conversationId=${conversationId}`,
    );
    const stillPending = afterRes.body.data.find((a: any) => a.id === action.id);
    expect(stillPending).toBeUndefined();
  }, 60000);

  it('should filter pending actions by conversationId', async () => {
    // Create two conversations with actions
    const ws = await connectWs();
    const chat1 = await sendAndReceive(ws, {
      type: 'send_message',
      message: 'First conversation',
    });
    const convId1 = chat1.data.conversationId;

    const chat2 = await sendAndReceive(ws, {
      type: 'send_message',
      message: 'Second conversation',
    });
    const convId2 = chat2.data.conversationId;
    ws.close();

    actionService.createAction(
      'refresh-test-user', convId1, 'create_event',
      { calendarId: 'primary', summary: 'Conv1 Event', startDateTime: new Date().toISOString(), endDateTime: new Date().toISOString() },
      'Conv1 action',
    );
    actionService.createAction(
      'refresh-test-user', convId2, 'create_event',
      { calendarId: 'primary', summary: 'Conv2 Event', startDateTime: new Date().toISOString(), endDateTime: new Date().toISOString() },
      'Conv2 action',
    );

    // Fetch for conv1 only
    const res1 = await agent.get(`/api/actions/pending?conversationId=${convId1}`);
    expect(res1.body.data.length).toBe(1);
    expect(res1.body.data[0].description).toBe('Conv1 action');

    // Fetch for conv2 only
    const res2 = await agent.get(`/api/actions/pending?conversationId=${convId2}`);
    expect(res2.body.data.length).toBe(1);
    expect(res2.body.data[0].description).toBe('Conv2 action');

    // Fetch all (no filter)
    const resAll = await agent.get('/api/actions/pending');
    expect(resAll.body.data.length).toBe(2);
  }, 60000);

  it('should return 404 when querying another user\'s conversation', async () => {
    // Create a conversation owned by a different user
    const otherConv = await conversationService.createConversation('other-user-id', 'Other user convo');

    // Create a pending action for that conversation
    actionService.createAction(
      'other-user-id', otherConv.id, 'create_event',
      { calendarId: 'primary', summary: 'Secret Meeting', startDateTime: new Date().toISOString(), endDateTime: new Date().toISOString() },
      'Secret action',
    );

    // Try to fetch as the authenticated user (refresh-test-user)
    const res = await agent.get(`/api/actions/pending?conversationId=${otherConv.id}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    // Should not leak any action data
    expect(res.body.data).toBeUndefined();
  });

  it('should reject invalid conversationId format', async () => {
    const res = await agent.get('/api/actions/pending?conversationId=../../../etc/passwd');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid conversationId');
  });
});
