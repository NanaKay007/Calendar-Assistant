export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// Backend API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Backend calendar list item shape (from Google Calendar API)
export interface BackendCalendarListItem {
  id: string;
  summary: string;
  description?: string | null;
  primary?: boolean | null;
  backgroundColor?: string | null;
  foregroundColor?: string | null;
  accessRole?: string | null;
}

// Backend calendar event shape (from Google Calendar API)
export interface BackendCalendarEvent {
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

// Frontend calendar type (used by components)
export interface Calendar {
  id: string;
  name: string;
  description?: string;
  timeZone?: string;
  color: string;
  accessRole: string;
  primary?: boolean;
}

// Frontend calendar event type (used by components)
export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
  status: string;
  organizer?: string;
  htmlLink?: string;
}

// Mapping functions: backend -> frontend
export function mapCalendar(item: BackendCalendarListItem): Calendar {
  return {
    id: item.id,
    name: item.summary,
    description: item.description ?? undefined,
    color: item.backgroundColor ?? '#4285f4',
    accessRole: item.accessRole ?? 'reader',
    primary: item.primary ?? undefined,
  };
}

export function mapCalendarEvent(event: BackendCalendarEvent, calendarId: string): CalendarEvent {
  const startTime = event.start?.dateTime ?? event.start?.date ?? '';
  const endTime = event.end?.dateTime ?? event.end?.date ?? '';

  return {
    id: event.id,
    calendarId,
    title: event.summary ?? '(No title)',
    description: event.description ?? undefined,
    startTime,
    endTime,
    location: event.location ?? undefined,
    attendees: event.attendees?.map(a => a.email ?? a.displayName ?? '').filter(Boolean) ?? undefined,
    status: event.status ?? 'confirmed',
    htmlLink: event.htmlLink ?? undefined,
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface CreateEventDetails {
  calendarId: string;
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  timeZone?: string;
  attendees?: string[];
  location?: string;
}

export interface UpdateEventDetails extends Partial<CreateEventDetails> {
  calendarId: string;
  eventId: string;
}

export interface DeleteEventDetails {
  calendarId: string;
  eventId: string;
}

export type ActionDetails = CreateEventDetails | UpdateEventDetails | DeleteEventDetails;

export interface PendingAction {
  id: string;
  type: 'create_event' | 'update_event' | 'delete_event';
  description: string;
  details: ActionDetails;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
  timestamp: string;
}

export interface ConversationContext {
  messages: ChatMessage[];
  pendingActions: PendingAction[];
}
