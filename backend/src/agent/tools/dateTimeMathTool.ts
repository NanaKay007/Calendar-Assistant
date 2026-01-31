import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { DateTime, Duration } from 'luxon';

export function createDateTimeMathTool(clientTimezone?: string) {
  return tool(
    async (input) => {
      const { operation } = input;

      switch (operation) {
        case 'add':
        case 'subtract': {
          let dt = DateTime.fromISO(input.datetime!);
          if (clientTimezone && !input.datetime!.match(/[+-]\d{2}:\d{2}$|Z$/)) {
            dt = DateTime.fromISO(input.datetime!, { zone: clientTimezone });
          }
          if (!dt.isValid) return JSON.stringify({ error: `Invalid datetime: ${input.datetime}` });

          const dur = Duration.fromObject({
            years: input.years,
            months: input.months,
            weeks: input.weeks,
            days: input.days,
            hours: input.hours,
            minutes: input.minutes,
          });

          const result = operation === 'add' ? dt.plus(dur) : dt.minus(dur);
          return JSON.stringify({
            result: result.toISO(),
            date: result.toFormat('yyyy-MM-dd'),
            time: result.toLocaleString(DateTime.TIME_SIMPLE),
            dayOfWeek: result.weekdayLong,
          });
        }

        case 'diff': {
          const start = DateTime.fromISO(input.datetime!);
          const end = DateTime.fromISO(input.datetime2!);
          if (!start.isValid) return JSON.stringify({ error: `Invalid datetime: ${input.datetime}` });
          if (!end.isValid) return JSON.stringify({ error: `Invalid datetime2: ${input.datetime2}` });

          const diff = end.diff(start, ['days', 'hours', 'minutes']);
          return JSON.stringify({
            days: diff.days,
            hours: diff.hours,
            minutes: diff.minutes,
            totalMinutes: diff.as('minutes'),
          });
        }

        case 'startOf':
        case 'endOf': {
          const dt = DateTime.fromISO(input.datetime!);
          if (!dt.isValid) return JSON.stringify({ error: `Invalid datetime: ${input.datetime}` });

          const unit = input.unit || 'day';
          const result = operation === 'startOf' ? dt.startOf(unit) : dt.endOf(unit);
          return JSON.stringify({
            result: result.toISO(),
            date: result.toFormat('yyyy-MM-dd'),
            time: result.toLocaleString(DateTime.TIME_SIMPLE),
            dayOfWeek: result.weekdayLong,
          });
        }

        case 'parse': {
          const dt = DateTime.fromISO(input.datetime!);
          if (!dt.isValid) return JSON.stringify({ error: `Invalid datetime: ${input.datetime}` });
          return JSON.stringify({
            iso: dt.toISO(),
            date: dt.toFormat('yyyy-MM-dd'),
            time: dt.toLocaleString(DateTime.TIME_SIMPLE),
            dayOfWeek: dt.weekdayLong,
            timezone: dt.zoneName,
            utcOffset: dt.toFormat('ZZ'),
          });
        }

        default:
          return JSON.stringify({ error: `Unknown operation: ${operation}` });
      }
    },
    {
      name: 'datetime_math',
      description:
        'Perform datetime calculations: add/subtract durations, compute differences between dates, get start/end of day/week/month, or parse datetime strings. Use this instead of guessing date math.',
      schema: z.object({
        operation: z.enum(['add', 'subtract', 'diff', 'startOf', 'endOf', 'parse']).describe(
          'The operation to perform. "add"/"subtract" adjusts a datetime by a duration. "diff" computes the difference between two datetimes. "startOf"/"endOf" gets the boundary of a time unit. "parse" extracts components from a datetime string.'
        ),
        datetime: z.string().optional().describe('The primary ISO 8601 datetime string to operate on'),
        datetime2: z.string().optional().describe('The second datetime for "diff" operation (end datetime)'),
        years: z.number().optional().describe('Years to add/subtract'),
        months: z.number().optional().describe('Months to add/subtract'),
        weeks: z.number().optional().describe('Weeks to add/subtract'),
        days: z.number().optional().describe('Days to add/subtract'),
        hours: z.number().optional().describe('Hours to add/subtract'),
        minutes: z.number().optional().describe('Minutes to add/subtract'),
        unit: z.enum(['year', 'month', 'week', 'day', 'hour', 'minute']).optional().describe('The time unit for startOf/endOf operations. Defaults to "day".'),
      }),
    }
  );
}
