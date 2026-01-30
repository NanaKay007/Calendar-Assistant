import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export function createDeleteEventTool() {
  return tool(
    async (input) => {
      return JSON.stringify({
        pendingAction: true,
        actionType: 'delete_event',
        payload: input,
      });
    },
    {
      name: 'delete_event',
      description: 'Delete a calendar event. This returns a pending action that requires user approval before execution.',
      schema: z.object({
        eventId: z.string().describe('The ID of the event to delete'),
        calendarId: z.string().describe('The calendar ID containing the event. Use "primary" for default calendar.'),
      }),
    }
  );
}
