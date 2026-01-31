import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export function createGetCurrentDateTimeTool() {
  return tool(
    async () => {
      const now = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeek = days[now.getDay()];
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      return JSON.stringify({
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('en-US', { hour12: true }),
        dayOfWeek,
        timezone,
        iso: now.toISOString(),
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
