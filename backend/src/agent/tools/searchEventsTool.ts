import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { google } from 'googleapis';
import { DateTime } from 'luxon';
import { calendarService } from '../../services/calendar.service';
import { CalendarEvent } from '../../types';

function convertEventTimesToLocal(events: CalendarEvent[], clientTimezone?: string): CalendarEvent[] {
  const zone = clientTimezone || DateTime.now().zoneName;
  return events.map((event) => ({
    ...event,
    start: event.start?.dateTime
      ? { ...event.start, dateTime: DateTime.fromISO(event.start.dateTime).setZone(zone).toISO()! }
      : event.start,
    end: event.end?.dateTime
      ? { ...event.end, dateTime: DateTime.fromISO(event.end.dateTime).setZone(zone).toISO()! }
      : event.end,
  }));
}

export function createSearchEventsTool(accessToken: string, clientTimezone?: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return tool(
    async (input) => {
      const events = await calendarService.searchEvents(
        oauth2Client,
        input.calendarId || 'primary',
        input.query,
        {
          timeMin: input.timeMin,
          timeMax: input.timeMax,
        }
      );
      return JSON.stringify(convertEventTimesToLocal(events, clientTimezone));
    },
    {
      name: 'search_events',
      description:
        'Search for calendar events by keyword/text. Uses Google Calendar text search to find events matching the query string.',
      schema: z.object({
        query: z.string().describe('The search text to match against event fields (summary, description, location, attendees, etc.)'),
        calendarId: z.string().optional().describe('Calendar ID to search in. Defaults to "primary".'),
        timeMin: z.string().optional().describe('Start of time range to search (ISO 8601 datetime with timezone offset, e.g. "2026-01-30T00:00:00-05:00"). Defaults to now.'),
        timeMax: z.string().optional().describe('End of time range to search (ISO 8601 datetime with timezone offset, e.g. "2026-01-31T00:00:00-05:00").'),
      }),
    }
  );
}
