import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Calendar } from '../../types';
import { calendarService } from '../../services/calendarService';

export function CalendarList() {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadCalendars();
  }, []);

  const loadCalendars = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await calendarService.getCalendars();
      setCalendars(data);
    } catch (err) {
      setError('Failed to load calendars');
      console.error('Error loading calendars:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getAccessRoleBadge = (role: string) => {
    const colors = {
      owner: 'bg-blue-100 text-blue-800',
      writer: 'bg-green-100 text-green-800',
      reader: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`text-xs px-2 py-1 rounded-full ${colors[role as keyof typeof colors]}`}>
        {role}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadCalendars}
          className="mt-2 text-sm text-red-700 underline hover:text-red-800"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Your Calendars</h2>
        <p className="text-gray-600 mt-1">
          {calendars.length} calendar{calendars.length !== 1 ? 's' : ''} available
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {calendars.map((calendar) => (
          <div
            key={calendar.id}
            onClick={() => navigate(`/calendar/${encodeURIComponent(calendar.id)}`)}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 overflow-hidden"
          >
            <div
              className="h-2"
              style={{ backgroundColor: calendar.color }}
            />
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {calendar.name}
                    {calendar.primary && (
                      <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                        Primary
                      </span>
                    )}
                  </h3>
                  {calendar.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {calendar.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg
                    className="w-4 h-4"
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
                  <span>{calendar.timeZone ?? 'Calendar'}</span>
                </div>
                {getAccessRoleBadge(calendar.accessRole)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
