import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Calendar, CalendarEvent } from '../../types';
import { calendarService } from '../../services/calendarService';

type ViewMode = 'month' | 'week';

// ── Date helpers ────────────────────────────────────────────────────────
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfWeek(d: Date) {
  const day = d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}

function endOfWeek(d: Date) {
  const day = d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (6 - day));
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(d: Date) {
  return isSameDay(d, new Date());
}

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function formatMonthYear(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatWeekRange(d: Date) {
  const start = startOfWeek(d);
  const end = endOfWeek(d);
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
  }
  return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()} – ${end.toLocaleDateString('en-US', { month: 'short' })} ${end.getDate()}, ${end.getFullYear()}`;
}

function formatTime(d: Date) {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${m.toString().padStart(2, '0')}${ampm}`;
}

function formatTimeLong(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDateLong(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return 'Invalid date';
  }
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// ── Event Popover ───────────────────────────────────────────────────────
function EventPopover({
  event,
  calendarColor,
  anchorRect,
  onClose,
}: {
  event: CalendarEvent;
  calendarColor: string;
  anchorRect: DOMRect | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const style = useMemo(() => {
    if (!anchorRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    const popW = 340;
    const popH = 260;
    let top = anchorRect.bottom + 8;
    let left = anchorRect.left;
    if (top + popH > window.innerHeight) top = anchorRect.top - popH - 8;
    if (left + popW > window.innerWidth) left = window.innerWidth - popW - 16;
    if (left < 8) left = 8;
    return { top: `${top}px`, left: `${left}px` };
  }, [anchorRect]);

  return (
    <div className="fixed inset-0 z-50" style={{ pointerEvents: 'auto' }}>
      <div
        ref={ref}
        className="absolute bg-white rounded-xl shadow-2xl border border-gray-200 w-[340px] overflow-hidden"
        style={{ ...style, animation: 'popIn 0.15s ease-out' }}
      >
        {/* Color strip */}
        <div className="h-1.5" style={{ backgroundColor: calendarColor }} />

        <div className="p-5">
          {/* Close btn */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Title */}
          <div className="flex items-start gap-3 mb-4 pr-6">
            <div className="w-3 h-3 rounded mt-1.5 shrink-0" style={{ backgroundColor: calendarColor }} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 leading-tight">{event.title}</h3>
              <p className="text-[13px] text-gray-500 mt-1">
                {formatDateLong(event.startTime)}
              </p>
              <p className="text-[13px] text-gray-500">
                {formatTimeLong(event.startTime)} – {formatTimeLong(event.endTime)}
              </p>
            </div>
          </div>

          {event.description && (
            <p className="text-sm text-gray-600 mb-3 pl-6">{event.description}</p>
          )}

          {/* Meta */}
          <div className="space-y-2 pl-6">
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{event.location}</span>
              </div>
            )}
            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            {event.organizer && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{event.organizer}</span>
              </div>
            )}
          </div>

          {/* Status badge */}
          {event.status !== 'confirmed' && (
            <div className="mt-3 pl-6">
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                event.status === 'tentative'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {event.status}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Month View ──────────────────────────────────────────────────────────
function MonthView({
  currentDate,
  events,
  calendarColor,
  onEventClick,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  calendarColor: string;
  onEventClick: (event: CalendarEvent, rect: DOMRect) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);

  // Build all weeks needed
  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= monthEnd || weeks.length < 5) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(day));
      day = addDays(day, 1);
    }
    weeks.push(week);
    if (weeks.length >= 6) break;
  }

  function eventsForDay(d: Date) {
    return events.filter((e) => isSameDay(new Date(e.startTime), d));
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAY_NAMES.map((name) => (
          <div key={name} className="py-2 px-1 text-center">
            <span className="text-[11px] font-medium text-gray-500 tracking-wide">{name}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-rows-5 min-h-0" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-gray-100 last:border-b-0">
            {week.map((d, di) => {
              const dayEvents = eventsForDay(d);
              const inMonth = d.getMonth() === currentDate.getMonth();
              const today = isToday(d);

              return (
                <div
                  key={di}
                  className={`border-r border-gray-100 last:border-r-0 p-1 min-h-0 flex flex-col overflow-hidden ${
                    !inMonth ? 'bg-gray-50/60' : 'bg-white'
                  }`}
                >
                  {/* Day number */}
                  <div className="flex justify-center mb-0.5">
                    <span
                      className={`text-xs leading-none w-6 h-6 flex items-center justify-center rounded-full ${
                        today
                          ? 'bg-blue-600 text-white font-semibold'
                          : inMonth
                          ? 'text-gray-800'
                          : 'text-gray-400'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="flex-1 space-y-px overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <button
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(ev, (e.currentTarget as HTMLElement).getBoundingClientRect());
                        }}
                        className="w-full text-left truncate rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight transition-opacity hover:opacity-80 cursor-pointer"
                        style={{
                          backgroundColor: calendarColor + '18',
                          color: calendarColor,
                          borderLeft: `2.5px solid ${calendarColor}`,
                        }}
                        title={ev.title}
                      >
                        <span className="opacity-70 mr-0.5">{formatTime(new Date(ev.startTime))}</span>{' '}
                        {ev.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-gray-500 font-medium px-1.5 cursor-pointer hover:text-gray-700 transition-colors">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Week View ───────────────────────────────────────────────────────────
function WeekView({
  currentDate,
  events,
  calendarColor,
  onEventClick,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  calendarColor: string;
  onEventClick: (event: CalendarEvent, rect: DOMRect) => void;
}) {
  const weekStart = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to 7am on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * 60; // 60px per hour, scroll to 7am
    }
  }, []);

  function eventsForDay(d: Date) {
    return events.filter((e) => isSameDay(new Date(e.startTime), d));
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Day headers */}
      <div className="grid border-b border-gray-200 shrink-0" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
        <div /> {/* gutter */}
        {days.map((d, i) => {
          const today = isToday(d);
          return (
            <div key={i} className="py-2 text-center border-l border-gray-100">
              <div className="text-[11px] font-medium text-gray-500 tracking-wide">{DAY_NAMES[i]}</div>
              <div
                className={`text-2xl mt-0.5 leading-none w-10 h-10 mx-auto flex items-center justify-center rounded-full ${
                  today ? 'bg-blue-600 text-white font-medium' : 'text-gray-800'
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="relative grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
          {/* Time labels */}
          <div className="relative">
            {HOURS.map((hour) => (
              <div key={hour} className="h-[60px] relative">
                {hour > 0 && (
                  <span className="absolute -top-2 right-2 text-[10px] text-gray-400 font-medium">
                    {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, di) => {
            const dayEvents = eventsForDay(d);
            const today = isToday(d);

            return (
              <div key={di} className={`relative border-l border-gray-100 ${today ? 'bg-blue-50/30' : ''}`}>
                {/* Hour grid lines */}
                {HOURS.map((hour) => (
                  <div key={hour} className="h-[60px] border-b border-gray-100" />
                ))}

                {/* Events */}
                {dayEvents.map((ev) => {
                  const startD = new Date(ev.startTime);
                  const endD = new Date(ev.endTime);
                  const startMin = startD.getHours() * 60 + startD.getMinutes();
                  const endMin = endD.getHours() * 60 + endD.getMinutes();
                  const top = startMin;
                  const height = Math.max(endMin - startMin, 20);

                  return (
                    <button
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(ev, (e.currentTarget as HTMLElement).getBoundingClientRect());
                      }}
                      className="absolute left-0.5 right-1 rounded-md px-2 py-1 text-left overflow-hidden cursor-pointer transition-all hover:shadow-md hover:brightness-95"
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        backgroundColor: calendarColor,
                        color: 'white',
                        zIndex: 10,
                      }}
                    >
                      <div className="text-[11px] font-semibold leading-tight truncate">{ev.title}</div>
                      {height > 30 && (
                        <div className="text-[10px] opacity-90 leading-tight mt-0.5">
                          {formatTime(startD)} – {formatTime(endD)}
                        </div>
                      )}
                      {height > 50 && ev.location && (
                        <div className="text-[10px] opacity-75 leading-tight mt-0.5 truncate">
                          {ev.location}
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Current time indicator */}
                {today && <CurrentTimeIndicator />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CurrentTimeIndicator() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const minutes = now.getHours() * 60 + now.getMinutes();

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${minutes}px` }}
    >
      <div className="flex items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1" />
        <div className="flex-1 h-[2px] bg-red-500" />
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────
export function CalendarDetail() {
  const { calendarId } = useParams<{ calendarId: string }>();
  const navigate = useNavigate();
  const [calendar, setCalendar] = useState<Calendar | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popoverRect, setPopoverRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (calendarId) loadCalendarData(calendarId);
  }, [calendarId, currentDate]);

  const loadCalendarData = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Compute date range for the visible period (month view with surrounding weeks)
      const rangeStart = startOfWeek(startOfMonth(currentDate));
      const rangeEnd = addDays(endOfWeek(endOfMonth(currentDate)), 1); // +1 day to include end
      const timeMin = rangeStart.toISOString();
      const timeMax = rangeEnd.toISOString();

      const [calData, eventsData] = await Promise.all([
        calendarService.getCalendar(id),
        calendarService.getEvents(id, timeMin, timeMax),
      ]);
      setCalendar(calData);
      setEvents(eventsData);
    } catch {
      setError('Failed to load calendar data');
    } finally {
      setIsLoading(false);
    }
  };

  const navigatePeriod = useCallback(
    (direction: -1 | 1) => {
      setCurrentDate((prev) => {
        if (viewMode === 'month') {
          return new Date(prev.getFullYear(), prev.getMonth() + direction, 1);
        }
        return addDays(prev, direction * 7);
      });
    },
    [viewMode],
  );

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleEventClick = useCallback((event: CalendarEvent, rect: DOMRect) => {
    setSelectedEvent(event);
    setPopoverRect(rect);
  }, []);

  const closePopover = useCallback(() => {
    setSelectedEvent(null);
    setPopoverRect(null);
  }, []);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <div className="w-8 h-8 border-[3px] border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Error ──
  if (error || !calendar) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 font-medium">{error || 'Calendar not found'}</p>
        <button
          onClick={() => navigate('/calendars')}
          className="mt-3 text-sm text-red-700 underline hover:text-red-800"
        >
          Back to calendars
        </button>
      </div>
    );
  }

  const headerLabel = viewMode === 'month' ? formatMonthYear(currentDate) : formatWeekRange(currentDate);

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          {/* Back */}
          <button
            onClick={() => navigate('/calendars')}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
            title="Back to calendars"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Calendar dot + name */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: calendar.color }} />
            <span className="text-sm font-medium text-gray-700">{calendar.name}</span>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-200" />

          {/* Today button */}
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            Today
          </button>

          {/* Nav arrows */}
          <div className="flex items-center">
            <button
              onClick={() => navigatePeriod(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => navigatePeriod(1)}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Period label */}
          <h2 className="text-lg font-medium text-gray-900 select-none">{headerLabel}</h2>
        </div>

        {/* View switcher */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {(['month', 'week'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                viewMode === mode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Calendar Grid ── */}
      {viewMode === 'month' ? (
        <MonthView
          currentDate={currentDate}
          events={events}
          calendarColor={calendar.color}
          onEventClick={handleEventClick}
        />
      ) : (
        <WeekView
          currentDate={currentDate}
          events={events}
          calendarColor={calendar.color}
          onEventClick={handleEventClick}
        />
      )}

      {/* ── Event Popover ── */}
      {selectedEvent && (
        <EventPopover
          event={selectedEvent}
          calendarColor={calendar.color}
          anchorRect={popoverRect}
          onClose={closePopover}
        />
      )}

      {/* Keyframe animation for popover */}
      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.96) translateY(-4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
