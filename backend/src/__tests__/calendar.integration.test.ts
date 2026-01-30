import request from 'supertest';
import app from '../app';
import { getTestTokens } from './setup';

describe('Calendar API - Integration', () => {
  let agent: request.Agent;

  beforeAll(async () => {
    const tokens = await getTestTokens();
    agent = request.agent(app);

    const seedRes = await agent
      .post('/api/test/seed-session')
      .send({
        tokens,
        user: { id: 'integration-test', email: 'test@test.com' },
      });

    expect(seedRes.status).toBe(200);
  });

  describe('Unauthenticated access', () => {
    it('GET /api/calendars should return 401 without a session', async () => {
      const res = await request(app).get('/api/calendars');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/calendars', () => {
    it('should return the list of calendars from Google', async () => {
      const res = await agent.get('/api/calendars');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Every calendar should have at least an id and summary
      for (const cal of res.body.data) {
        expect(cal.id).toBeDefined();
        expect(cal.summary).toBeDefined();
      }
    });

    it('should include a primary calendar', async () => {
      const res = await agent.get('/api/calendars');

      const primary = res.body.data.find((c: any) => c.primary === true);
      expect(primary).toBeDefined();
    });
  });

  describe('GET /api/calendars/:calendarId', () => {
    it('should return details for the primary calendar', async () => {
      const res = await agent.get('/api/calendars/primary');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('summary');
    });
  });

  describe('GET /api/calendars/:calendarId/events', () => {
    it('should return events from the primary calendar', async () => {
      const res = await agent.get('/api/calendars/primary/events');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should respect timeMin and timeMax query params', async () => {
      const now = new Date();
      const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const res = await agent
        .get('/api/calendars/primary/events')
        .query({
          timeMin: now.toISOString(),
          timeMax: oneWeekLater.toISOString(),
          maxResults: '5',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Event CRUD lifecycle', () => {
    let createdEventId: string;

    it('POST /api/calendars/primary/events should create a real event', async () => {
      const start = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow
      const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour

      const res = await agent
        .post('/api/calendars/primary/events')
        .send({
          summary: '[Integration Test] Test Event',
          description: 'Created by automated integration test — safe to delete',
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          timeZone: 'UTC',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.summary).toBe('[Integration Test] Test Event');

      createdEventId = res.body.data.id;
    });

    it('GET /api/calendars/primary/events/:eventId should fetch the created event', async () => {
      expect(createdEventId).toBeDefined();

      const res = await agent.get(
        `/api/calendars/primary/events/${createdEventId}`
      );

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdEventId);
      expect(res.body.data.summary).toBe('[Integration Test] Test Event');
    });

    it('PATCH /api/calendars/primary/events/:eventId should update the event', async () => {
      expect(createdEventId).toBeDefined();

      const res = await agent
        .patch(`/api/calendars/primary/events/${createdEventId}`)
        .send({
          summary: '[Integration Test] Updated Event',
          description: 'Updated by automated integration test',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.summary).toBe('[Integration Test] Updated Event');
    });

    it('DELETE /api/calendars/primary/events/:eventId should delete the event', async () => {
      expect(createdEventId).toBeDefined();

      const res = await agent.delete(
        `/api/calendars/primary/events/${createdEventId}`
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's gone (Google may return 404/500 immediately,
      // or 200 with status:'cancelled' due to eventual consistency)
      const getRes = await agent.get(
        `/api/calendars/primary/events/${createdEventId}`
      );
      const gone =
        getRes.status >= 400 ||
        getRes.body.data?.status === 'cancelled';
      expect(gone).toBe(true);
    });
  });

  describe('Validation', () => {
    it('POST should reject event creation with missing required fields', async () => {
      const res = await agent
        .post('/api/calendars/primary/events')
        .send({ description: 'missing summary and times' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
