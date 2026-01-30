import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Calendar, CalendarEvent } from '../../types';
import { calendarService } from '../../services/calendarService';

export function CalendarDetail() {
  const { calendarId } = useParams<{ calendarId: string }>();
  const navigate = useNavigate();
  const [calendar, setCalendar] = useState<Calendar | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (calendarId) {
      loadCalendarData(calendarId);
    }
  }, [calendarId]);

  const loadCalendarData = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const [calData, eventsData] = await Promise.all([
        calendarService.getCalendar(id),
        calendarService.getEvents(id),
      ]);

      setCalendar(calData);
      setEvents(eventsData.sort((a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      ));
    } catch (err) {
      setError('Failed to load calendar data');
      console.error('Error loading calendar:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getEventDuration = (start: string, end: string) => {
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !calendar) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error || 'Calendar not found'}</p>
        <button
          onClick={() => navigate('/calendars')}
          className="mt-2 text-sm text-red-700 underline hover:text-red-800"
        >
          Back to calendars
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate('/calendars')}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span>Back to calendars</span>
      </button>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: calendar.color }}
              />
              <h1 className="text-3xl font-bold text-gray-900">{calendar.name}</h1>
            </div>
            {calendar.description && (
              <p className="text-gray-600 ml-7">{calendar.description}</p>
            )}
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            {calendar.accessRole}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Upcoming Events ({events.length})
        </h2>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
          <svg
            className="w-16 h-16 text-gray-300 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-gray-500 text-lg">No events scheduled</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-5 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {event.title}
                  </h3>

                  {event.description && (
                    <p className="text-gray-600 text-sm mb-3">{event.description}</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>{formatDate(event.startTime)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>
                        {formatTime(event.startTime)} - {formatTime(event.endTime)}
                      </span>
                      <span className="text-gray-400">
                        ({getEventDuration(event.startTime, event.endTime)})
                      </span>
                    </div>

                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span>{event.location}</span>
                      </div>
                    )}

                    {event.attendees && event.attendees.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                        <span>{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>

                <span
                  className={`px-2 py-1 rounded text-xs ${
                    event.status === 'confirmed'
                      ? 'bg-green-100 text-green-800'
                      : event.status === 'tentative'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {event.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
