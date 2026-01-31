import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { google } from 'googleapis';

export function createGetFreeBusyTool(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return tool(
    async (input) => {
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const calendarIds = input.calendarIds || ['primary'];

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: input.timeMin,
          timeMax: input.timeMax,
          items: calendarIds.map((id) => ({ id })),
        },
      });

      const result: Record<string, { busy: Array<{ start: string; end: string }> }> = {};

      const calendars = response.data.calendars || {};
      for (const [calId, data] of Object.entries(calendars)) {
        result[calId] = {
          busy: (data.busy || []).map((period) => ({
            start: period.start || '',
            end: period.end || '',
          })),
        };
      }

      return JSON.stringify(result);
    },
    {
      name: 'get_free_busy',
      description:
        'Query free/busy status for calendars within a time range. Returns busy periods. Use this to check availability before scheduling.',
      schema: z.object({
        timeMin: z.string().describe('Start of time range (ISO 8601 datetime)'),
        timeMax: z.string().describe('End of time range (ISO 8601 datetime)'),
        calendarIds: z.array(z.string()).optional().describe('Calendar IDs to check. Defaults to ["primary"].'),
      }),
    }
  );
}
