import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { google } from 'googleapis';
import { calendarService } from '../../services/calendar.service';

export function createListCalendarsTool(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return tool(
    async () => {
      const calendars = await calendarService.getCalendarList(oauth2Client);
      return JSON.stringify(calendars);
    },
    {
      name: 'list_calendars',
      description: 'List all Google Calendars the user has access to. Returns calendar IDs, names, and metadata.',
      schema: z.object({}),
    }
  );
}
