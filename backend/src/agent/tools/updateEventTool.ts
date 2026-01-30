import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export function createUpdateEventTool() {
  return tool(
    async (input) => {
      return JSON.stringify({
        pendingAction: true,
        actionType: 'update_event',
        payload: input,
      });
    },
    {
      name: 'update_event',
      description: 'Update an existing calendar event. This returns a pending action that requires user approval before execution.',
      schema: z.object({
        eventId: z.string().describe('The ID of the event to update'),
        calendarId: z.string().optional().describe('Calendar ID. Defaults to "primary".'),
        summary: z.string().optional().describe('New title for the event'),
        startDateTime: z.string().optional().describe('New start date/time in ISO 8601 format'),
        endDateTime: z.string().optional().describe('New end date/time in ISO 8601 format'),
        description: z.string().optional().describe('New event description'),
        location: z.string().optional().describe('New event location'),
      }),
    }
  );
}
