import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { google } from 'googleapis';

export function createSearchEventsTool(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return tool(
    async (input) => {
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const response = await calendar.events.list({
        calendarId: input.calendarId || 'primary',
        q: input.query,
        timeMin: input.timeMin || new Date().toISOString(),
        timeMax: input.timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50,
      });

      const events = (response.data.items || []).map((event) => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        location: event.location,
        status: event.status,
        htmlLink: event.htmlLink,
      }));

      return JSON.stringify(events);
    },
    {
      name: 'search_events',
      description:
        'Search for calendar events by keyword/text. Uses Google Calendar text search to find events matching the query string.',
      schema: z.object({
        query: z.string().describe('The search text to match against event fields (summary, description, location, attendees, etc.)'),
        calendarId: z.string().optional().describe('Calendar ID to search in. Defaults to "primary".'),
        timeMin: z.string().optional().describe('Start of time range to search (ISO 8601 datetime). Defaults to now.'),
        timeMax: z.string().optional().describe('End of time range to search (ISO 8601 datetime).'),
      }),
    }
  );
}
