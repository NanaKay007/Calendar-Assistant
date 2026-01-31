import { getTestTokens } from './setup';
import { createGetCurrentDateTimeTool } from '../agent/tools/getCurrentDateTimeTool';
import { createSearchEventsTool } from '../agent/tools/searchEventsTool';
import { createGetFreeBusyTool } from '../agent/tools/getFreeBusyTool';

describe('Enhanced Agent Tools - Integration', () => {
  let accessToken: string;

  beforeAll(async () => {
    const tokens = await getTestTokens();
    accessToken = tokens.access_token;
  });

  describe('get_current_datetime', () => {
    it('should return valid date/time information', async () => {
      const tool = createGetCurrentDateTimeTool();
      const result = await tool.invoke({});
      const parsed = JSON.parse(result);

      expect(parsed.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(parsed.time).toBeDefined();
      expect(parsed.dayOfWeek).toMatch(
        /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/
      );
      expect(parsed.timezone).toBeDefined();
      expect(parsed.iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('search_events', () => {
    it('should search events and return an array', async () => {
      const tool = createSearchEventsTool(accessToken);
      const result = await tool.invoke({ query: 'meeting' });
      const parsed = JSON.parse(result);

      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should accept optional time range parameters', async () => {
      const tool = createSearchEventsTool(accessToken);
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const result = await tool.invoke({
        query: 'test',
        timeMin: now.toISOString(),
        timeMax: nextMonth.toISOString(),
      });
      const parsed = JSON.parse(result);

      expect(Array.isArray(parsed)).toBe(true);
    });
  });

  describe('get_free_busy', () => {
    it('should return free/busy data for primary calendar', async () => {
      const tool = createGetFreeBusyTool(accessToken);
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const result = await tool.invoke({
        timeMin: now.toISOString(),
        timeMax: tomorrow.toISOString(),
      });
      const parsed = JSON.parse(result);

      // Should have a 'primary' key with busy array
      expect(parsed).toHaveProperty('primary');
      expect(Array.isArray(parsed.primary.busy)).toBe(true);
    });

    it('should accept custom calendar IDs', async () => {
      const tool = createGetFreeBusyTool(accessToken);
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const result = await tool.invoke({
        timeMin: now.toISOString(),
        timeMax: tomorrow.toISOString(),
        calendarIds: ['primary'],
      });
      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty('primary');
    });
  });
});
