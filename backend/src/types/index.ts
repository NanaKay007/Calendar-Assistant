import { Request } from 'express';
import { OAuth2Client } from 'google-auth-library';

// Extend Express Session to include our custom data
declare module 'express-session' {
  interface SessionData {
    tokens?: {
      access_token: string;
      refresh_token?: string;
      expiry_date?: number;
    };
    user?: UserInfo;
  }
}

// Extend Express Request to include OAuth2Client
export interface AuthenticatedRequest extends Request {
  oauth2Client?: OAuth2Client;
  user?: UserInfo;
}

// User information from Google
export interface UserInfo {
  id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
}

// Calendar interfaces
export interface CalendarListItem {
  id: string;
  summary: string;
  description?: string | null;
  primary?: boolean | null;
  backgroundColor?: string | null;
  foregroundColor?: string | null;
  accessRole?: string | null;
}

export interface CalendarEvent {
  id: string;
  summary?: string | null;
  description?: string | null;
  start?: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string | null;
  } | null;
  end?: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string | null;
  } | null;
  attendees?: Array<{
    email?: string | null;
    displayName?: string | null;
    responseStatus?: string | null;
  }> | null;
  location?: string | null;
  status?: string | null;
  htmlLink?: string | null;
}

export interface CreateEventParams {
  calendarId: string;
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  timeZone?: string;
  attendees?: string[];
  location?: string;
}

export interface UpdateEventParams extends Partial<CreateEventParams> {
  eventId: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
