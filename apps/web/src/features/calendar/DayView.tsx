import { Link } from 'react-router-dom';
import { DateTime } from 'luxon';
import type { DashboardBooking } from '../bookings/types';
import { BookingStatusBadge } from '../bookings/components/BookingStatusBadge';

interface DayViewProps {
  date: string;
  bookings: DashboardBooking[];
  timezone: string;
}

function toMinutes(isoString: string, timezone: string): number {
  const dt = DateTime.fromISO(isoString, { zone: 'utc' }).setZone(timezone);
  return dt.hour * 60 + dt.minute;
}

function fmtTime(isoString: string, timezone: string): string {
  return DateTime.fromISO(isoString, { zone: 'utc' }).setZone(timezone).toFormat('HH:mm');
}

const SLOT_HEIGHT = 60; // px per 60 minutes
const START_HOUR = 7;   // display from 07:00
const END_HOUR = 22;    // display to 22:00
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

export function DayView({ date, bookings, timezone }: DayViewProps) {
  // Filter to bookings on this date in the business timezone, then sort by start
  const sorted = [...bookings].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
  );

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const totalHeight = TOTAL_MINUTES * (SLOT_HEIGHT / 60);

  return (
    <div className="cal-day-view" aria-label={`Day view: ${date}`}>
      {sorted.length === 0 && (
        <p className="cal-empty">No bookings on this day.</p>
      )}
      <div className="cal-day-grid" style={{ position: 'relative', height: `${totalHeight}px` }}>
        {/* Hour lines */}
        {hours.map((h) => {
          const topPx = (h - START_HOUR) * SLOT_HEIGHT;
          return (
            <div key={h} className="cal-hour-row" style={{ top: `${topPx}px` }}>
              <span className="cal-hour-label">{String(h).padStart(2, '0')}:00</span>
              <div className="cal-hour-line" />
            </div>
          );
        })}

        {/* Booking blocks */}
        {sorted.map((booking) => {
          const startMin = toMinutes(booking.start_at, timezone);
          const endMin = toMinutes(booking.end_at, timezone);
          const displayStart = Math.max(startMin, START_HOUR * 60);
          const displayEnd = Math.min(endMin, END_HOUR * 60);
          if (displayEnd <= displayStart) return null;

          const topPx = (displayStart - START_HOUR * 60) * (SLOT_HEIGHT / 60);
          const heightPx = Math.max((displayEnd - displayStart) * (SLOT_HEIGHT / 60), 30);

          return (
            <Link
              key={booking.id}
              to={`/dashboard/bookings/${booking.id}`}
              className={`cal-booking-block cal-booking-${booking.status}`}
              style={{ top: `${topPx}px`, height: `${heightPx}px` }}
              aria-label={`${booking.customer_name} – ${booking.services?.name ?? 'Booking'} at ${fmtTime(booking.start_at, timezone)}`}
            >
              <span className="cal-block-time">
                {fmtTime(booking.start_at, timezone)}–{fmtTime(booking.end_at, timezone)}
              </span>
              <span className="cal-block-name">{booking.customer_name}</span>
              <span className="cal-block-service">{booking.services?.name}</span>
              {booking.providers?.name && (
                <span className="cal-block-provider">{booking.providers.name}</span>
              )}
              <BookingStatusBadge status={booking.status} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
