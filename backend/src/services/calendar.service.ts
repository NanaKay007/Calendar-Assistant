import { google, Auth } from 'googleapis';
import { DateTime } from 'luxon';
import { CalendarListItem, CalendarEvent, CreateEventParams, UpdateEventParams } from '../types';

export class CalendarService {
  /**
   * Get list of all calendars the user has access to
   */
  async getCalendarList(auth: Auth.OAuth2Client): Promise<CalendarListItem[]> {
    try {
      const calendar = google.calendar({ version: 'v3', auth });
      const response = await calendar.calendarList.list();

      if (!response.data.items) {
        return [];
      }

      return response.data.items.map((item) => ({
        id: item.id || '',
        summary: item.summary || '',
        description: item.description,
        primary: item.primary,
        backgroundColor: item.backgroundColor,
        foregroundColor: item.foregroundColor,
        accessRole: item.accessRole,
      }));
    } catch (error) {
      console.error('Error fetching calendar list:', error);
      throw new Error('Failed to fetch calendar list');
    }
  }

  /**
   * Get details of a specific calendar
   */
  async getCalendar(auth: Auth.OAuth2Client, calendarId: string) {
    try {
      const calendar = google.calendar({ version: 'v3', auth });
      const response = await calendar.calendars.get({ calendarId });
      return response.data;
    } catch (error) {
      console.error('Error fetching calendar details:', error);
      throw new Error('Failed to fetch calendar details');
    }
  }

  /**
   * Get events from a specific calendar
   */
  async getEvents(
    auth: Auth.OAuth2Client,
    calendarId: string,
    options?: {
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
      orderBy?: 'startTime' | 'updated';
      singleEvents?: boolean;
    }
  ): Promise<CalendarEvent[]> {
    try {
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.events.list({
        calendarId,
        timeMin: options?.timeMin || DateTime.now().toISO()!,
        timeMax: options?.timeMax,
        maxResults: options?.maxResults || 100,
        singleEvents: options?.singleEvents !== false, // default to true
        orderBy: options?.orderBy || 'startTime',
      });

      if (!response.data.items) {
        return [];
      }

      return response.data.items.map((event) => ({
        id: event.id || '',
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        attendees: event.attendees,
        location: event.location,
        status: event.status,
        htmlLink: event.htmlLink,
      }));
    } catch (error) {
      console.error('Error fetching events:', error);
      throw new Error('Failed to fetch events');
    }
  }

  /**
   * Get a specific event
   */
  async getEvent(
    auth: Auth.OAuth2Client,
    calendarId: string,
    eventId: string
  ): Promise<CalendarEvent> {
    try {
      const calendar = google.calendar({ version: 'v3', auth });
      const response = await calendar.events.get({ calendarId, eventId });

      return {
        id: response.data.id || '',
        summary: response.data.summary,
        description: response.data.description,
        start: response.data.start,
        end: response.data.end,
        attendees: response.data.attendees,
        location: response.data.location,
        status: response.data.status,
        htmlLink: response.data.htmlLink,
      };
    } catch (error) {
      console.error('Error fetching event:', error);
      throw new Error('Failed to fetch event');
    }
  }

  /**
   * Create a new event in a calendar
   */
  async createEvent(auth: Auth.OAuth2Client, params: CreateEventParams): Promise<CalendarEvent> {
    try {
      const calendar = google.calendar({ version: 'v3', auth });

      const event = {
        summary: params.summary,
        description: params.description,
        location: params.location,
        start: {
          dateTime: params.startDateTime,
          timeZone: params.timeZone || 'UTC',
        },
        end: {
          dateTime: params.endDateTime,
          timeZone: params.timeZone || 'UTC',
        },
        attendees: params.attendees?.map((email) => ({ email })),
      };

      const response = await calendar.events.insert({
        calendarId: params.calendarId,
        requestBody: event,
      });

      return {
        id: response.data.id || '',
        summary: response.data.summary,
        description: response.data.description,
        start: response.data.start,
        end: response.data.end,
        attendees: response.data.attendees,
        location: response.data.location,
        status: response.data.status,
        htmlLink: response.data.htmlLink,
      };
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event');
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(auth: Auth.OAuth2Client, params: UpdateEventParams): Promise<CalendarEvent> {
    try {
      const calendar = google.calendar({ version: 'v3', auth });

      const event: any = {};
      if (params.summary) event.summary = params.summary;
      if (params.description) event.description = params.description;
      if (params.location) event.location = params.location;
      if (params.startDateTime) {
        event.start = {
          dateTime: params.startDateTime,
          timeZone: params.timeZone || 'UTC',
        };
      }
      if (params.endDateTime) {
        event.end = {
          dateTime: params.endDateTime,
          timeZone: params.timeZone || 'UTC',
        };
      }
      if (params.attendees) {
        event.attendees = params.attendees.map((email) => ({ email }));
      }

      const response = await calendar.events.patch({
        calendarId: params.calendarId || 'primary',
        eventId: params.eventId,
        requestBody: event,
      });

      return {
        id: response.data.id || '',
        summary: response.data.summary,
        description: response.data.description,
        start: response.data.start,
        end: response.data.end,
        attendees: response.data.attendees,
        location: response.data.location,
        status: response.data.status,
        htmlLink: response.data.htmlLink,
      };
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error('Failed to update event');
    }
  }

  /**
   * Search events by text query
   */
  async searchEvents(
    auth: Auth.OAuth2Client,
    calendarId: string,
    query: string,
    options?: {
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
    }
  ): Promise<CalendarEvent[]> {
    try {
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.events.list({
        calendarId,
        q: query,
        timeMin: options?.timeMin || DateTime.now().toISO()!,
        timeMax: options?.timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: options?.maxResults || 50,
      });

      if (!response.data.items) {
        return [];
      }

      return response.data.items.map((event) => ({
        id: event.id || '',
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        attendees: event.attendees,
        location: event.location,
        status: event.status,
        htmlLink: event.htmlLink,
      }));
    } catch (error) {
      console.error('Error searching events:', error);
      throw new Error('Failed to search events');
    }
  }

  /**
   * Query free/busy status for calendars
   */
  async getFreeBusy(
    auth: Auth.OAuth2Client,
    timeMin: string,
    timeMax: string,
    calendarIds: string[]
  ): Promise<Record<string, { busy: Array<{ start: string; end: string }> }>> {
    try {
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin,
          timeMax,
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

      return result;
    } catch (error) {
      console.error('Error querying free/busy:', error);
      throw new Error('Failed to query free/busy status');
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(auth: Auth.OAuth2Client, calendarId: string, eventId: string): Promise<void> {
    try {
      const calendar = google.calendar({ version: 'v3', auth });
      await calendar.events.delete({ calendarId, eventId });
    } catch (error: any) {
      console.error('Error deleting event:', error);
      if (error?.code === 404) {
        throw new Error(`Event not found (${eventId}). It may have been already deleted or the event ID is invalid.`);
      }
      throw new Error('Failed to delete event');
    }
  }
}

// Export singleton instance
export const calendarService = new CalendarService();
