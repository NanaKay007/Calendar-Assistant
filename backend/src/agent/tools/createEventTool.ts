import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export function createCreateEventTool() {
  return tool(
    async (input) => {
      return JSON.stringify({
        pendingAction: true,
        actionType: 'create_event',
        payload: input,
      });
    },
    {
      name: 'create_event',
      description: 'Create a new calendar event. This returns a pending action that requires user approval before execution.',
      schema: z.object({
        summary: z.string().describe('Title of the event'),
        startDateTime: z.string().describe('Start date/time in ISO 8601 format with timezone offset (e.g. "2026-01-30T09:00:00-05:00"). Use the utcOffset from get_current_datetime.'),
        endDateTime: z.string().describe('End date/time in ISO 8601 format with timezone offset (e.g. "2026-01-30T10:00:00-05:00"). Use the utcOffset from get_current_datetime.'),
        calendarId: z.string().describe('Calendar ID. Use "primary" for default calendar.'),
        description: z.string().optional().describe('Event description'),
        location: z.string().optional().describe('Event location'),
      }),
    }
  );
}
