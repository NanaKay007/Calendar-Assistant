import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { google } from 'googleapis';
import { calendarService } from '../../services/calendar.service';

export function createListEventsTool(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return tool(
    async (input) => {
      const events = await calendarService.getEvents(oauth2Client, input.calendarId, {
        timeMin: input.timeMin,
        timeMax: input.timeMax,
      });
      return JSON.stringify(events);
    },
    {
      name: 'list_events',
      description: 'List events from a Google Calendar within an optional time range. Use ISO 8601 date strings for timeMin/timeMax.',
      schema: z.object({
        calendarId: z.string().describe('The calendar ID to fetch events from. Use "primary" for the default calendar.'),
        timeMin: z.string().optional().describe('Start of time range (ISO 8601 datetime)'),
        timeMax: z.string().optional().describe('End of time range (ISO 8601 datetime)'),
      }),
    }
  );
}
