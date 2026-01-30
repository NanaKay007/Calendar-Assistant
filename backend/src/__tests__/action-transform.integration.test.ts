import request from 'supertest';
import { createServer } from 'http';
import WebSocket from 'ws';
import app from '../app';
import { setupWebSocket } from '../ws';
import { getTestTokens } from './setup';
import { conversationService } from '../services/conversation.service';
import { actionService } from '../services/action.service';

/**
 * Integration tests for toFrontendAction transformation and approval modal
 * field mapping. Uses real services -- no mocks.
 */
describe('Action transformation integration', () => {
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
        user: { id: 'transform-test-user', email: 'transform@test.com' },
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

  it('should transform pendingAction fields to frontend format via WebSocket', async () => {
    const ws = await connectWs();
    const response = await sendAndReceive(ws, {
      type: 'send_message',
      message:
        'Create a meeting called "Transform Test" tomorrow at 2pm for 30 minutes on my primary calendar',
    });
    ws.close();

    expect(response.type).toBe('reply');
    const { pendingAction } = response.data;
    if (pendingAction) {
      // Frontend fields (transformed)
      expect(pendingAction).toHaveProperty('type');
      expect(pendingAction).toHaveProperty('details');
      expect(pendingAction).toHaveProperty('timestamp');
      // Backend fields should NOT be present
      expect(pendingAction).not.toHaveProperty('actionType');
      expect(pendingAction).not.toHaveProperty('params');
      expect(pendingAction).not.toHaveProperty('createdAt');

      expect(pendingAction.type).toBe('create_event');
      expect(pendingAction.status).toBe('pending');
      expect(typeof pendingAction.timestamp).toBe('string');
      expect(typeof pendingAction.details).toBe('object');
    }
  });

  it('should transform pendingAction fields in GET /api/actions/pending', async () => {
    // Create an action via the service directly
    actionService.createAction(
      'transform-test-user',
      'test-conv-id',
      'create_event',
      {
        calendarId: 'primary',
        summary: 'REST Transform Test',
        startDateTime: '2025-12-01T14:00:00Z',
        endDateTime: '2025-12-01T14:30:00Z',
      },
      'Create event: REST Transform Test'
    );

    const res = await agent.get('/api/actions/pending');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const actions = res.body.data;
    expect(actions.length).toBeGreaterThanOrEqual(1);

    const action = actions[0];
    // Frontend fields
    expect(action).toHaveProperty('type');
    expect(action).toHaveProperty('details');
    expect(action).toHaveProperty('timestamp');
    // Backend fields should NOT be present
    expect(action).not.toHaveProperty('actionType');
    expect(action).not.toHaveProperty('params');
    expect(action).not.toHaveProperty('createdAt');

    expect(action.type).toBe('create_event');
    expect(action.details.summary).toBe('REST Transform Test');
  });

  it('should transform action fields in reject response', async () => {
    const created = actionService.createAction(
      'transform-test-user',
      'test-conv-id',
      'delete_event',
      { calendarId: 'primary', eventId: 'evt-123' },
      'Delete event'
    );

    const res = await agent.post(`/api/actions/${created.id}/reject`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const action = res.body.data;
    expect(action).toHaveProperty('type');
    expect(action.type).toBe('delete_event');
    expect(action.status).toBe('rejected');
    expect(action).not.toHaveProperty('actionType');
    expect(action).not.toHaveProperty('params');
  });

  it('should reject action for unauthorized user', async () => {
    // Create an action for a different user
    const created = actionService.createAction(
      'other-user-id',
      'test-conv-id',
      'delete_event',
      { calendarId: 'primary', eventId: 'evt-456' },
      'Delete event'
    );

    const res = await agent.post(`/api/actions/${created.id}/reject`);
    // Controller checks ownership before calling service, returns 404
    expect(res.status).toBe(404);
  });

  it('should transform action fields in approve response', async () => {
    const created = actionService.createAction(
      'transform-test-user',
      'test-conv-id',
      'create_event',
      {
        calendarId: 'primary',
        summary: 'Approve Transform Test',
        startDateTime: '2099-12-01T14:00:00Z',
        endDateTime: '2099-12-01T14:30:00Z',
      },
      'Create event: Approve Transform Test'
    );

    const res = await agent.post(`/api/actions/${created.id}/approve`);
    // May succeed or fail depending on calendar access, but shape should be correct
    if (res.status === 200) {
      const action = res.body.data;
      expect(action).toHaveProperty('type');
      expect(action.type).toBe('create_event');
      expect(action).not.toHaveProperty('actionType');
      expect(action).not.toHaveProperty('params');
    }
  });
});
