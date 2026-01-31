import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { google } from 'googleapis';
import { calendarService } from '../../services/calendar.service';

export function createGetFreeBusyTool(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return tool(
    async (input) => {
      const calendarIds = input.calendarIds || ['primary'];
      const result = await calendarService.getFreeBusy(
        oauth2Client,
        input.timeMin,
        input.timeMax,
        calendarIds
      );
      return JSON.stringify(result);
    },
    {
      name: 'get_free_busy',
      description:
        'Query free/busy status for calendars within a time range. Returns busy periods. Use this to check availability before scheduling.',
      schema: z.object({
        timeMin: z.string().describe('Start of time range (ISO 8601 datetime with timezone offset, e.g. "2026-01-30T00:00:00-05:00")'),
        timeMax: z.string().describe('End of time range (ISO 8601 datetime with timezone offset, e.g. "2026-01-31T00:00:00-05:00")'),
        calendarIds: z.array(z.string()).optional().describe('Calendar IDs to check. Defaults to ["primary"].'),
      }),
    }
  );
}
