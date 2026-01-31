import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export function createUpdateEventTool(clientTimezone?: string) {
  return tool(
    async (input) => {
      return JSON.stringify({
        pendingAction: true,
        actionType: 'update_event',
        payload: { ...input, timeZone: input.timeZone || clientTimezone },
      });
    },
    {
      name: 'update_event',
      description: 'Update an existing calendar event. This returns a pending action that requires user approval before execution.',
      schema: z.object({
        eventId: z.string().describe('The ID of the event to update'),
        calendarId: z.string().optional().describe('Calendar ID. Defaults to "primary".'),
        summary: z.string().optional().describe('New title for the event'),
        startDateTime: z.string().optional().describe('New start date/time in ISO 8601 format with timezone offset (e.g. "2026-01-30T09:00:00-05:00"). Use the utcOffset from get_current_datetime.'),
        endDateTime: z.string().optional().describe('New end date/time in ISO 8601 format with timezone offset (e.g. "2026-01-30T10:00:00-05:00"). Use the utcOffset from get_current_datetime.'),
        description: z.string().optional().describe('New event description'),
        location: z.string().optional().describe('New event location'),
        timeZone: z.string().optional().describe('IANA timezone for the event (e.g. "America/New_York"). Defaults to user\'s browser timezone.'),
      }),
    }
  );
}
