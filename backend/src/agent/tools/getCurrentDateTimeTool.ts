import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { DateTime } from 'luxon';

export function createGetCurrentDateTimeTool(clientTimezone?: string) {
  return tool(
    async () => {
      const now = clientTimezone
        ? DateTime.now().setZone(clientTimezone)
        : DateTime.now();

      return JSON.stringify({
        date: now.toFormat('yyyy-MM-dd'),
        time: now.toLocaleString(DateTime.TIME_SIMPLE),
        dayOfWeek: now.weekdayLong,
        timezone: now.zoneName,
        utcOffset: now.toFormat('ZZ'),
      });
    },
    {
      name: 'get_current_datetime',
      description:
        'Returns the current date, time, day of week, and timezone. Use this to understand what "today", "tomorrow", "this afternoon", etc. mean.',
      schema: z.object({}),
    }
  );
}
