import type { Calendar, CalendarEvent } from '../types';

// Mock calendar data
const mockCalendars: Calendar[] = [
  {
    id: 'cal_1',
    name: 'Work Calendar',
    description: 'Work-related events and meetings',
    timeZone: 'America/New_York',
    color: '#3b82f6',
    accessRole: 'owner',
    primary: true,
  },
  {
    id: 'cal_2',
    name: 'Personal',
    description: 'Personal appointments and events',
    timeZone: 'America/New_York',
    color: '#10b981',
    accessRole: 'owner',
  },
  {
    id: 'cal_3',
    name: 'Team Events',
    description: 'Shared team calendar',
    timeZone: 'America/New_York',
    color: '#f59e0b',
    accessRole: 'writer',
  },
];

const mockEvents: Record<string, CalendarEvent[]> = {
  cal_1: [
    {
      id: 'event_1',
      calendarId: 'cal_1',
      title: 'Team Standup',
      description: 'Daily team sync',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      location: 'Zoom',
      attendees: ['team@example.com'],
      status: 'confirmed',
      organizer: 'manager@example.com',
    },
    {
      id: 'event_2',
      calendarId: 'cal_1',
      title: 'Project Review',
      description: 'Quarterly project review meeting',
      startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
      location: 'Conference Room A',
      attendees: ['john@example.com', 'jane@example.com'],
      status: 'confirmed',
      organizer: 'user@example.com',
    },
  ],
  cal_2: [
    {
      id: 'event_3',
      calendarId: 'cal_2',
      title: 'Dentist Appointment',
      description: 'Regular checkup',
      startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
      location: '123 Main St',
      status: 'confirmed',
    },
  ],
  cal_3: [
    {
      id: 'event_4',
      calendarId: 'cal_3',
      title: 'Team Building Event',
      description: 'Quarterly team outing',
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
      location: 'Central Park',
      attendees: ['team@example.com'],
      status: 'confirmed',
      organizer: 'hr@example.com',
    },
  ],
};

class CalendarService {
  async getCalendars(): Promise<Calendar[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return [...mockCalendars];
  }

  async getCalendar(calendarId: string): Promise<Calendar | null> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockCalendars.find(cal => cal.id === calendarId) || null;
  }

  async getEvents(calendarId: string): Promise<CalendarEvent[]> {
    await new Promise(resolve => setTimeout(resolve, 600));
    return [...(mockEvents[calendarId] || [])];
  }

  async createEvent(calendarId: string, event: Omit<CalendarEvent, 'id' | 'calendarId'>): Promise<CalendarEvent> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newEvent: CalendarEvent = {
      id: `event_${Date.now()}`,
      calendarId,
      ...event,
    };

    if (!mockEvents[calendarId]) {
      mockEvents[calendarId] = [];
    }
    mockEvents[calendarId].push(newEvent);

    return newEvent;
  }

  async updateEvent(calendarId: string, eventId: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const events = mockEvents[calendarId] || [];
    const eventIndex = events.findIndex(e => e.id === eventId);

    if (eventIndex === -1) {
      throw new Error('Event not found');
    }

    const updatedEvent = { ...events[eventIndex], ...updates };
    mockEvents[calendarId][eventIndex] = updatedEvent;

    return updatedEvent;
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 800));

    if (mockEvents[calendarId]) {
      mockEvents[calendarId] = mockEvents[calendarId].filter(e => e.id !== eventId);
    }
  }
}

export const calendarService = new CalendarService();
