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

export function createListEventsTool(accessToken: string, clientTimezone?: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return tool(
    async (input) => {
      const events = await calendarService.getEvents(oauth2Client, input.calendarId, {
        timeMin: input.timeMin,
        timeMax: input.timeMax,
      });
      return JSON.stringify(convertEventTimesToLocal(events, clientTimezone));
    },
    {
      name: 'list_events',
      description: 'List events from a Google Calendar within an optional time range. Use ISO 8601 date strings for timeMin/timeMax.',
      schema: z.object({
        calendarId: z.string().describe('The calendar ID to fetch events from. Use "primary" for the default calendar.'),
        timeMin: z.string().optional().describe('Start of time range (ISO 8601 datetime with timezone offset, e.g. "2026-01-30T00:00:00-05:00"). Use the offset from get_current_datetime, never use "Z" unless the user is in UTC.'),
        timeMax: z.string().optional().describe('End of time range (ISO 8601 datetime with timezone offset, e.g. "2026-01-31T00:00:00-05:00"). Use the offset from get_current_datetime, never use "Z" unless the user is in UTC.'),
      }),
    }
  );
}
