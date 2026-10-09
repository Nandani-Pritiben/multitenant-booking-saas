import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { bookingsApi } from '../features/bookings/api';
import { BookingDetailView } from '../features/bookings/components/BookingDetail';
import type { BookingDetail } from '../features/bookings/types';

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    if (!id) return;
    setLoading(true);
    setError('');
    void bookingsApi
      .get(id)
      .then(setBooking)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Unable to load booking.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  if (loading)
    return (
      <div className="services-state" role="status">
        Loading booking…
      </div>
    );

  if (error)
    return (
      <div className="booking-error" role="alert">
        {error}{' '}
        <button type="button" className="text-button" onClick={load}>
          Retry
        </button>
      </div>
    );

  if (!booking)
    return (
      <div className="services-empty">
        <h2>Booking not found</h2>
      </div>
    );

  return (
    <section aria-labelledby="booking-detail-heading">
      <header className="page-heading">
        <div>
          <p className="eyebrow">APPOINTMENT</p>
          <h1 id="booking-detail-heading">Booking detail</h1>
        </div>
      </header>
      <BookingDetailView booking={booking} onUpdated={setBooking} />
    </section>
  );
}
