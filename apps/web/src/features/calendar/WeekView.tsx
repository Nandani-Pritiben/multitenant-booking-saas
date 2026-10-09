import { Link } from 'react-router-dom';
import { DateTime } from 'luxon';
import type { DashboardBooking } from '../bookings/types';
import { weekDays, bookingDateKey } from './calendarUtils';
import { BookingStatusBadge } from '../bookings/components/BookingStatusBadge';

interface WeekViewProps {
  date: string;
  bookings: DashboardBooking[];
  timezone: string;
  today: string;
  onDayClick: (date: string) => void;
}

function fmtTime(iso: string, timezone: string) {
  return DateTime.fromISO(iso, { zone: 'utc' }).setZone(timezone).toFormat('HH:mm');
}

export function WeekView({ date, bookings, timezone, today, onDayClick }: WeekViewProps) {
  const days = weekDays(date);

  // Group bookings by date key
  const byDay = new Map<string, DashboardBooking[]>();
  for (const day of days) byDay.set(day, []);
  for (const b of bookings) {
    const key = bookingDateKey(b.start_at, timezone);
    const arr = byDay.get(key);
    if (arr) arr.push(b);
  }

  return (
    <div className="cal-week-view" role="grid" aria-label="Week view">
      <div className="cal-week-header" role="row">
        {days.map((day) => {
          const dt = DateTime.fromISO(day);
          const isToday = day === today;
          return (
            <div key={day} className={`cal-week-day-header${isToday ? ' cal-today' : ''}`} role="columnheader">
              <button
                type="button"
                className="cal-day-label-btn"
                onClick={() => onDayClick(day)}
                aria-label={`View ${dt.toFormat('cccc d MMMM')}`}
              >
                <span className="cal-weekday-name">{dt.toFormat('ccc')}</span>
                <span className={`cal-day-num${isToday ? ' cal-today-num' : ''}`}>
                  {dt.toFormat('d')}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="cal-week-body" role="row">
        {days.map((day) => {
          const dayBookings = (byDay.get(day) ?? []).sort(
            (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
          );
          return (
            <div key={day} className="cal-week-day-col" role="gridcell" aria-label={day}>
              {dayBookings.length === 0 ? (
                <span className="cal-week-empty" aria-label="No bookings" />
              ) : (
                dayBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    to={`/dashboard/bookings/${booking.id}`}
                    className={`cal-week-booking cal-booking-${booking.status}`}
                    aria-label={`${booking.customer_name} – ${booking.services?.name ?? ''} at ${fmtTime(booking.start_at, timezone)}`}
                  >
                    <span className="cal-block-time">{fmtTime(booking.start_at, timezone)}</span>
                    <span className="cal-block-name">{booking.customer_name}</span>
                    <BookingStatusBadge status={booking.status} />
                  </Link>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
