import { Link } from 'react-router-dom';
import { DateTime } from 'luxon';
import type { DashboardBooking } from '../bookings/types';
import { monthGridDates, bookingDateKey } from './calendarUtils';

interface MonthViewProps {
  date: string;
  bookings: DashboardBooking[];
  timezone: string;
  today: string;
  onDayClick: (date: string) => void;
}

const MAX_VISIBLE_BOOKINGS = 3;

export function MonthView({ date, bookings, timezone, today, onDayClick }: MonthViewProps) {
  const gridDates = monthGridDates(date);
  const currentMonth = DateTime.fromISO(date).month;

  // Group bookings by local date
  const byDay = new Map<string, DashboardBooking[]>();
  for (const b of bookings) {
    const key = bookingDateKey(b.start_at, timezone);
    const arr = byDay.get(key);
    if (arr) arr.push(b);
    else byDay.set(key, [b]);
  }

  return (
    <div className="cal-month-view" role="grid" aria-label="Month view">
      {/* Weekday header row */}
      <div className="cal-month-header" role="row">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="cal-month-weekday" role="columnheader">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="cal-month-grid">
        {gridDates.map((day) => {
          const dt = DateTime.fromISO(day);
          const isCurrentMonth = dt.month === currentMonth;
          const isToday = day === today;
          const dayBookings = (byDay.get(day) ?? []).sort(
            (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
          );
          const overflow = dayBookings.length - MAX_VISIBLE_BOOKINGS;
          const visible = dayBookings.slice(0, MAX_VISIBLE_BOOKINGS);

          return (
            <div
              key={day}
              role="gridcell"
              aria-label={`${day}${dayBookings.length > 0 ? `, ${dayBookings.length} booking${dayBookings.length > 1 ? 's' : ''}` : ''}`}
              className={[
                'cal-month-day',
                !isCurrentMonth ? 'cal-other-month' : '',
                isToday ? 'cal-today' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <button
                type="button"
                className={`cal-day-num-btn${isToday ? ' cal-today-num' : ''}`}
                onClick={() => onDayClick(day)}
                aria-label={`Select ${dt.toFormat('d MMMM yyyy')}`}
              >
                {dt.toFormat('d')}
              </button>

              <div className="cal-month-bookings">
                {visible.map((b) => (
                  <Link
                    key={b.id}
                    to={`/dashboard/bookings/${b.id}`}
                    className={`cal-month-booking cal-booking-${b.status}`}
                    aria-label={`${b.customer_name} – ${b.services?.name ?? ''}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {b.customer_name}
                  </Link>
                ))}
                {overflow > 0 && (
                  <button
                    type="button"
                    className="cal-month-overflow"
                    onClick={() => onDayClick(day)}
                    aria-label={`${overflow} more booking${overflow > 1 ? 's' : ''} on ${day}`}
                  >
                    +{overflow} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
