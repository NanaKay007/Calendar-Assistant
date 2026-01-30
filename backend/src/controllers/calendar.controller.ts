import { Response } from 'express';
import { calendarService } from '../services/calendar.service';
import { AuthenticatedRequest, ApiResponse, CalendarListItem, CalendarEvent } from '../types';

/** Extract a route param as a plain string (Express 5 types params as string | string[]) */
const param = (req: AuthenticatedRequest, name: string): string =>
  req.params[name] as string;

/**
 * Get list of all calendars
 */
export const getCalendars = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.oauth2Client) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      } as ApiResponse);
      return;
    }

    const calendars = await calendarService.getCalendarList(req.oauth2Client);

    res.json({
      success: true,
      data: calendars,
    } as ApiResponse<CalendarListItem[]>);
  } catch (error) {
    console.error('Error getting calendars:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendars',
    } as ApiResponse);
  }
};

/**
 * Get details of a specific calendar
 */
export const getCalendar = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.oauth2Client) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      } as ApiResponse);
      return;
    }

    const calendarId = param(req, 'calendarId');

    if (!calendarId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID is required',
      } as ApiResponse);
      return;
    }

    const calendar = await calendarService.getCalendar(req.oauth2Client, calendarId);

    res.json({
      success: true,
      data: calendar,
    } as ApiResponse);
  } catch (error) {
    console.error('Error getting calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendar',
    } as ApiResponse);
  }
};

/**
 * Get events from a specific calendar
 */
export const getEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.oauth2Client) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      } as ApiResponse);
      return;
    }

    const calendarId = param(req, 'calendarId');
    const { timeMin, timeMax, maxResults, orderBy } = req.query;

    if (!calendarId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID is required',
      } as ApiResponse);
      return;
    }

    const events = await calendarService.getEvents(req.oauth2Client, calendarId, {
      timeMin: timeMin as string,
      timeMax: timeMax as string,
      maxResults: maxResults ? parseInt(maxResults as string, 10) : undefined,
      orderBy: orderBy as 'startTime' | 'updated' | undefined,
    });

    res.json({
      success: true,
      data: events,
    } as ApiResponse<CalendarEvent[]>);
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
    } as ApiResponse);
  }
};

/**
 * Get a specific event
 */
export const getEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.oauth2Client) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      } as ApiResponse);
      return;
    }

    const calendarId = param(req, 'calendarId');
    const eventId = param(req, 'eventId');

    if (!calendarId || !eventId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID and Event ID are required',
      } as ApiResponse);
      return;
    }

    const event = await calendarService.getEvent(req.oauth2Client, calendarId, eventId);

    res.json({
      success: true,
      data: event,
    } as ApiResponse<CalendarEvent>);
  } catch (error) {
    console.error('Error getting event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event',
    } as ApiResponse);
  }
};

/**
 * Create a new event
 */
export const createEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.oauth2Client) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      } as ApiResponse);
      return;
    }

    const calendarId = param(req, 'calendarId');
    const { summary, description, startDateTime, endDateTime, timeZone, attendees, location } =
      req.body;

    if (!calendarId || !summary || !startDateTime || !endDateTime) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID, summary, start time, and end time are required',
      } as ApiResponse);
      return;
    }

    const event = await calendarService.createEvent(req.oauth2Client, {
      calendarId,
      summary,
      description,
      startDateTime,
      endDateTime,
      timeZone,
      attendees,
      location,
    });

    res.status(201).json({
      success: true,
      data: event,
      message: 'Event created successfully',
    } as ApiResponse<CalendarEvent>);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
    } as ApiResponse);
  }
};

/**
 * Update an existing event
 */
export const updateEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.oauth2Client) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      } as ApiResponse);
      return;
    }

    const calendarId = param(req, 'calendarId');
    const eventId = param(req, 'eventId');
    const { summary, description, startDateTime, endDateTime, timeZone, attendees, location } =
      req.body;

    if (!calendarId || !eventId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID and Event ID are required',
      } as ApiResponse);
      return;
    }

    const event = await calendarService.updateEvent(req.oauth2Client, {
      calendarId,
      eventId,
      summary,
      description,
      startDateTime,
      endDateTime,
      timeZone,
      attendees,
      location,
    });

    res.json({
      success: true,
      data: event,
      message: 'Event updated successfully',
    } as ApiResponse<CalendarEvent>);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event',
    } as ApiResponse);
  }
};

/**
 * Delete an event
 */
export const deleteEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.oauth2Client) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      } as ApiResponse);
      return;
    }

    const calendarId = param(req, 'calendarId');
    const eventId = param(req, 'eventId');

    if (!calendarId || !eventId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID and Event ID are required',
      } as ApiResponse);
      return;
    }

    await calendarService.deleteEvent(req.oauth2Client, calendarId, eventId);

    res.json({
      success: true,
      message: 'Event deleted successfully',
    } as ApiResponse);
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event',
    } as ApiResponse);
  }
};
