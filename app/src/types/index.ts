export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  timeZone: string;
  color: string;
  accessRole: 'owner' | 'writer' | 'reader';
  primary?: boolean;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
  status: 'confirmed' | 'tentative' | 'cancelled';
  organizer?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface PendingAction {
  id: string;
  type: 'create_event' | 'update_event' | 'delete_event';
  description: string;
  details: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
  timestamp: string;
}

export interface ConversationContext {
  messages: ChatMessage[];
  pendingActions: PendingAction[];
}
