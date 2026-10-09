import { Link } from 'react-router-dom';
import type { DashboardBooking } from '../types';
import { BookingStatusBadge } from './BookingStatusBadge';

interface BookingListProps {
  bookings: DashboardBooking[];
  timezone: string;
}

function fmt(value: string, timezone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: timezone }).format(
    new Date(value),
  );
}

export function BookingList({ bookings, timezone }: BookingListProps) {
  if (bookings.length === 0) {
    return (
      <div className="services-empty">
        <h2>No bookings found</h2>
        <p>Try adjusting your filters or create a new booking.</p>
      </div>
    );
  }

  return (
    <div className="bookings-table-wrap">
      <table className="services-table" aria-label="Bookings">
        <thead>
          <tr>
            <th scope="col">Customer</th>
            <th scope="col">Service</th>
            <th scope="col">Provider</th>
            <th scope="col">Date</th>
            <th scope="col">Time</th>
            <th scope="col">Status</th>
            <th scope="col">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td>
                <strong>{booking.customer_name}</strong>
                <small className="booking-email">{booking.customer_email}</small>
              </td>
              <td>{booking.services?.name ?? '—'}</td>
              <td>{booking.providers?.name ?? '—'}</td>
              <td>{fmt(booking.start_at, timezone, { dateStyle: 'medium' })}</td>
              <td>
                {fmt(booking.start_at, timezone, { timeStyle: 'short' })}–
                {fmt(booking.end_at, timezone, { timeStyle: 'short' })}
              </td>
              <td>
                <BookingStatusBadge status={booking.status} />
              </td>
              <td>
                <Link
                  to={`/dashboard/bookings/${booking.id}`}
                  className="text-button"
                  aria-label={`View booking for ${booking.customer_name}`}
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
