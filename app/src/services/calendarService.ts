import type { Calendar, CalendarEvent } from '../types';

// Mock calendar data
const mockCalendars: Calendar[] = [
  {
    id: 'cal_1',
    name: 'Work Calendar',
    description: 'Work-related events and meetings',
    timeZone: 'America/New_York',
    color: '#4285f4',
    accessRole: 'owner',
    primary: true,
  },
  {
    id: 'cal_2',
    name: 'Personal',
    description: 'Personal appointments and events',
    timeZone: 'America/New_York',
    color: '#0b8043',
    accessRole: 'owner',
  },
  {
    id: 'cal_3',
    name: 'Team Events',
    description: 'Shared team calendar',
    timeZone: 'America/New_York',
    color: '#f4511e',
    accessRole: 'writer',
  },
];

function generateMockEvents(): Record<string, CalendarEvent[]> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  function d(day: number, hour: number, minute = 0): string {
    return new Date(year, month, day, hour, minute).toISOString();
  }

  return {
    cal_1: [
      {
        id: 'e1',
        calendarId: 'cal_1',
        title: 'Team Standup',
        description: 'Daily team sync — quick round-robin updates',
        startTime: d(now.getDate(), 9, 0),
        endTime: d(now.getDate(), 9, 30),
        location: 'Zoom',
        attendees: ['alice@co.com', 'bob@co.com', 'carol@co.com'],
        status: 'confirmed',
        organizer: 'manager@co.com',
      },
      {
        id: 'e2',
        calendarId: 'cal_1',
        title: 'Sprint Planning',
        description: 'Plan upcoming sprint work items',
        startTime: d(now.getDate(), 14, 0),
        endTime: d(now.getDate(), 15, 30),
        location: 'Conference Room B',
        attendees: ['alice@co.com', 'bob@co.com'],
        status: 'confirmed',
        organizer: 'pm@co.com',
      },
      {
        id: 'e3',
        calendarId: 'cal_1',
        title: '1:1 with Manager',
        description: 'Weekly check-in',
        startTime: d(now.getDate() + 1, 10, 0),
        endTime: d(now.getDate() + 1, 10, 30),
        location: 'Zoom',
        attendees: ['manager@co.com'],
        status: 'confirmed',
      },
      {
        id: 'e4',
        calendarId: 'cal_1',
        title: 'Design Review',
        description: 'Review new dashboard mockups',
        startTime: d(now.getDate() + 1, 13, 0),
        endTime: d(now.getDate() + 1, 14, 0),
        location: 'Figma',
        attendees: ['design@co.com', 'frontend@co.com'],
        status: 'confirmed',
      },
      {
        id: 'e5',
        calendarId: 'cal_1',
        title: 'Project Review',
        description: 'Quarterly project review with stakeholders',
        startTime: d(now.getDate() + 2, 11, 0),
        endTime: d(now.getDate() + 2, 12, 0),
        location: 'Conference Room A',
        attendees: ['john@co.com', 'jane@co.com', 'exec@co.com'],
        status: 'confirmed',
        organizer: 'user@co.com',
      },
      {
        id: 'e6',
        calendarId: 'cal_1',
        title: 'Lunch & Learn',
        description: 'GraphQL best practices',
        startTime: d(now.getDate() + 3, 12, 0),
        endTime: d(now.getDate() + 3, 13, 0),
        location: 'Kitchen',
        status: 'confirmed',
      },
      {
        id: 'e7',
        calendarId: 'cal_1',
        title: 'Code Freeze',
        description: 'Release v2.4 code freeze begins',
        startTime: d(now.getDate() + 5, 9, 0),
        endTime: d(now.getDate() + 5, 9, 30),
        status: 'confirmed',
      },
      {
        id: 'e8',
        calendarId: 'cal_1',
        title: 'All Hands',
        description: 'Monthly company all-hands meeting',
        startTime: d(now.getDate() + 7, 16, 0),
        endTime: d(now.getDate() + 7, 17, 0),
        location: 'Main Auditorium',
        attendees: ['everyone@co.com'],
        status: 'confirmed',
      },
      {
        id: 'e9',
        calendarId: 'cal_1',
        title: 'Interview — Sr. Engineer',
        description: 'Technical phone screen',
        startTime: d(now.getDate() - 1, 14, 0),
        endTime: d(now.getDate() - 1, 15, 0),
        location: 'Zoom',
        status: 'confirmed',
      },
      {
        id: 'e10',
        calendarId: 'cal_1',
        title: 'Retrospective',
        description: 'Sprint retro — what went well, what to improve',
        startTime: d(now.getDate() - 2, 15, 0),
        endTime: d(now.getDate() - 2, 16, 0),
        location: 'Conference Room C',
        attendees: ['team@co.com'],
        status: 'confirmed',
      },
      {
        id: 'e11',
        calendarId: 'cal_1',
        title: 'Standup',
        description: 'Daily sync',
        startTime: d(now.getDate() + 4, 9, 0),
        endTime: d(now.getDate() + 4, 9, 30),
        location: 'Zoom',
        status: 'confirmed',
      },
      {
        id: 'e12',
        calendarId: 'cal_1',
        title: 'API Workshop',
        description: 'REST to GraphQL migration workshop',
        startTime: d(now.getDate() + 6, 10, 0),
        endTime: d(now.getDate() + 6, 12, 0),
        location: 'Training Room',
        status: 'tentative',
      },
    ],
    cal_2: [
      {
        id: 'e20',
        calendarId: 'cal_2',
        title: 'Dentist Appointment',
        description: 'Regular checkup with Dr. Chen',
        startTime: d(now.getDate() + 3, 8, 0),
        endTime: d(now.getDate() + 3, 9, 0),
        location: '123 Main St',
        status: 'confirmed',
      },
      {
        id: 'e21',
        calendarId: 'cal_2',
        title: 'Gym — Leg Day',
        startTime: d(now.getDate(), 6, 30),
        endTime: d(now.getDate(), 7, 30),
        location: 'FitLife Gym',
        status: 'confirmed',
      },
      {
        id: 'e22',
        calendarId: 'cal_2',
        title: 'Dinner with Sarah',
        description: 'Trying new Italian place downtown',
        startTime: d(now.getDate() + 1, 19, 0),
        endTime: d(now.getDate() + 1, 21, 0),
        location: 'Trattoria Roma',
        status: 'confirmed',
      },
      {
        id: 'e23',
        calendarId: 'cal_2',
        title: 'Car Service',
        description: 'Oil change & tire rotation',
        startTime: d(now.getDate() + 5, 8, 0),
        endTime: d(now.getDate() + 5, 10, 0),
        location: 'AutoCare Plus',
        status: 'confirmed',
      },
      {
        id: 'e24',
        calendarId: 'cal_2',
        title: 'Book Club',
        description: 'Discussing "Project Hail Mary"',
        startTime: d(now.getDate() + 8, 18, 0),
        endTime: d(now.getDate() + 8, 19, 30),
        location: 'Library',
        status: 'confirmed',
      },
      {
        id: 'e25',
        calendarId: 'cal_2',
        title: 'Yoga Class',
        startTime: d(now.getDate() - 1, 7, 0),
        endTime: d(now.getDate() - 1, 8, 0),
        location: 'Zen Studio',
        status: 'confirmed',
      },
      {
        id: 'e26',
        calendarId: 'cal_2',
        title: 'Weekend Hike',
        description: 'Bear Mountain trail',
        startTime: d(now.getDate() + 10, 8, 0),
        endTime: d(now.getDate() + 10, 14, 0),
        location: 'Bear Mountain',
        status: 'tentative',
      },
    ],
    cal_3: [
      {
        id: 'e30',
        calendarId: 'cal_3',
        title: 'Team Building — Bowling',
        description: 'Quarterly team outing',
        startTime: d(now.getDate() + 7, 17, 0),
        endTime: d(now.getDate() + 7, 20, 0),
        location: 'Lucky Strike Lanes',
        attendees: ['team@co.com'],
        status: 'confirmed',
        organizer: 'hr@co.com',
      },
      {
        id: 'e31',
        calendarId: 'cal_3',
        title: 'Offsite Planning',
        description: 'Plan Q2 team offsite agenda',
        startTime: d(now.getDate() + 2, 15, 0),
        endTime: d(now.getDate() + 2, 16, 0),
        location: 'Zoom',
        attendees: ['leads@co.com'],
        status: 'confirmed',
      },
      {
        id: 'e32',
        calendarId: 'cal_3',
        title: 'New Hire Welcome',
        description: 'Welcome lunch for new team members',
        startTime: d(now.getDate() + 4, 12, 0),
        endTime: d(now.getDate() + 4, 13, 30),
        location: 'Cafe',
        status: 'confirmed',
      },
      {
        id: 'e33',
        calendarId: 'cal_3',
        title: 'Hackathon Kickoff',
        description: 'Annual internal hackathon begins',
        startTime: d(now.getDate() + 12, 9, 0),
        endTime: d(now.getDate() + 12, 10, 0),
        location: 'Main Hall',
        attendees: ['everyone@co.com'],
        status: 'confirmed',
      },
    ],
  };
}

const mockEvents = generateMockEvents();

class CalendarService {
  async getCalendars(): Promise<Calendar[]> {
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
