import request from 'supertest';
import { createServer } from 'http';
import app from '../app';
import { setupWebSocket } from '../ws';
import { getTestTokens } from './setup';
import { conversationService } from '../services/conversation.service';
import { actionService } from '../services/action.service';
import { toFrontendAction } from '../utils/action.utils';

/**
 * Integration tests verifying that the approval modal receives correctly
 * shaped data and does not crash when details are missing or unexpected.
 *
 * Regression test for: TypeError: can't access property "summary", eventDetails is undefined
 */
describe('Approval modal crash fix integration', () => {
  let agent: request.Agent;
  let server: ReturnType<typeof createServer>;
  let wss: ReturnType<typeof setupWebSocket>;
  let sessionCookie: string;

  beforeAll(async () => {
    const tokens = await getTestTokens();

    server = createServer(app);
    wss = setupWebSocket(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));

    agent = request.agent(app);
    const seedRes = await agent
      .post('/api/test/seed-session')
      .send({
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
        },
        user: { id: 'approval-modal-test-user', email: 'approval@test.com' },
      });

    expect(seedRes.status).toBe(200);
    const cookies = seedRes.headers['set-cookie'];
    expect(cookies).toBeDefined();
    sessionCookie = cookies[0].split(';')[0];
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
    await actionService._clear();
  });

  it('toFrontendAction should always produce details as an object', async () => {
    const action = await actionService.createAction(
      'approval-modal-test-user',
      'conv-1',
      'create_event',
      {
        calendarId: 'primary',
        summary: 'Test Event',
        startDateTime: '2099-01-01T10:00:00Z',
        endDateTime: '2099-01-01T11:00:00Z',
      },
      'Create event: Test Event'
    );

    const frontend = toFrontendAction(action);

    expect(frontend.details).toBeDefined();
    expect(typeof frontend.details).toBe('object');
    expect((frontend.details as any).summary).toBe('Test Event');
    expect(frontend.type).toBe('create_event');
    expect(frontend).not.toHaveProperty('params');
    expect(frontend).not.toHaveProperty('actionType');
  });

  it('toFrontendAction should produce valid details for delete actions', async () => {
    const action = await actionService.createAction(
      'approval-modal-test-user',
      'conv-1',
      'delete_event',
      { calendarId: 'primary', eventId: 'evt-abc' },
      'Delete event'
    );

    const frontend = toFrontendAction(action);

    expect(frontend.details).toBeDefined();
    expect((frontend.details as any).calendarId).toBe('primary');
    expect((frontend.details as any).eventId).toBe('evt-abc');
    expect(frontend.type).toBe('delete_event');
  });

  it('toFrontendAction should produce valid details for update actions', async () => {
    const action = await actionService.createAction(
      'approval-modal-test-user',
      'conv-1',
      'update_event',
      {
        calendarId: 'primary',
        eventId: 'evt-xyz',
        summary: 'Updated Title',
      },
      'Update event'
    );

    const frontend = toFrontendAction(action);

    expect(frontend.details).toBeDefined();
    expect((frontend.details as any).eventId).toBe('evt-xyz');
    expect((frontend.details as any).summary).toBe('Updated Title');
    expect(frontend.type).toBe('update_event');
  });

  it('GET /api/actions/pending returns details field (not params) for the modal', async () => {
    await actionService.createAction(
      'approval-modal-test-user',
      'conv-1',
      'create_event',
      {
        calendarId: 'primary',
        summary: 'Pending Modal Test',
        startDateTime: '2099-06-01T09:00:00Z',
        endDateTime: '2099-06-01T10:00:00Z',
        location: 'Room 42',
      },
      'Create event: Pending Modal Test'
    );

    const res = await agent.get('/api/actions/pending');
    expect(res.status).toBe(200);

    const actions = res.body.data;
    expect(actions.length).toBe(1);

    const action = actions[0];
    // These are the fields ApprovalModal reads
    expect(action.details).toBeDefined();
    expect(action.details.summary).toBe('Pending Modal Test');
    expect(action.details.startDateTime).toBe('2099-06-01T09:00:00Z');
    expect(action.details.endDateTime).toBe('2099-06-01T10:00:00Z');
    expect(action.details.location).toBe('Room 42');
    expect(action.type).toBe('create_event');
    // Backend fields should not leak
    expect(action).not.toHaveProperty('params');
    expect(action).not.toHaveProperty('actionType');
  });

  it('GET /api/actions/pending returns details for delete action with calendarId and eventId', async () => {
    await actionService.createAction(
      'approval-modal-test-user',
      'conv-1',
      'delete_event',
      { calendarId: 'primary', eventId: 'evt-delete-test' },
      'Delete event'
    );

    const res = await agent.get('/api/actions/pending');
    expect(res.status).toBe(200);

    const action = res.body.data[0];
    expect(action.details).toBeDefined();
    expect(action.details.calendarId).toBe('primary');
    expect(action.details.eventId).toBe('evt-delete-test');
  });
});
