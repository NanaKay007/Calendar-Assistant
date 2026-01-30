import type {
  Calendar,
  CalendarEvent,
  ApiResponse,
  BackendCalendarListItem,
  BackendCalendarEvent,
} from '../types';
import { mapCalendar, mapCalendarEvent } from '../types';

const API_BASE = '/api';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (res.status === 401) {
    // Redirect to login on auth failure
    window.location.href = '/login';
    throw new ApiError('Not authenticated', 401);
  }

  const body: ApiResponse<T> = await res.json();

  if (!res.ok || !body.success) {
    throw new ApiError(body.error ?? 'API request failed', res.status);
  }

  return body.data as T;
}

class CalendarService {
  async getCalendars(): Promise<Calendar[]> {
    const items = await apiFetch<BackendCalendarListItem[]>('/calendars');
    return items.map(mapCalendar);
  }

  async getCalendar(calendarId: string): Promise<Calendar | null> {
    try {
      const item = await apiFetch<BackendCalendarListItem>(`/calendars/${encodeURIComponent(calendarId)}`);
      return mapCalendar(item);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  async getEvents(calendarId: string, timeMin?: string, timeMax?: string): Promise<CalendarEvent[]> {
    const params = new URLSearchParams();
    if (timeMin) params.set('timeMin', timeMin);
    if (timeMax) params.set('timeMax', timeMax);
    const qs = params.toString();
    const path = `/calendars/${encodeURIComponent(calendarId)}/events${qs ? `?${qs}` : ''}`;
    const items = await apiFetch<BackendCalendarEvent[]>(path);
    return items.map((e) => mapCalendarEvent(e, calendarId));
  }

  async createEvent(
    calendarId: string,
    event: {
      summary: string;
      description?: string;
      startDateTime: string;
      endDateTime: string;
      timeZone?: string;
      attendees?: string[];
      location?: string;
    },
  ): Promise<CalendarEvent> {
    const item = await apiFetch<BackendCalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      { method: 'POST', body: JSON.stringify(event) },
    );
    return mapCalendarEvent(item, calendarId);
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    updates: {
      summary?: string;
      description?: string;
      startDateTime?: string;
      endDateTime?: string;
      timeZone?: string;
      attendees?: string[];
      location?: string;
    },
  ): Promise<CalendarEvent> {
    const item = await apiFetch<BackendCalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'PATCH', body: JSON.stringify(updates) },
    );
    return mapCalendarEvent(item, calendarId);
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await apiFetch<void>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' },
    );
  }
}

export const calendarService = new CalendarService();
