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
  name?: string;
  picture?: string;
}

// Calendar interfaces
export interface CalendarListItem {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole?: string;
}

export interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  location?: string;
  status?: string;
  htmlLink?: string;
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
