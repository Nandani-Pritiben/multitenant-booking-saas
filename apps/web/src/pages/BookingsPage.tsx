import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { bookingsApi } from '../features/bookings/api';
import { BookingFilters } from '../features/bookings/components/BookingFilters';
import { BookingList } from '../features/bookings/components/BookingList';
import type { BookingListQuery, BookingProvider, DashboardBooking } from '../features/bookings/types';
import '../styles/bookings.css';

export function BookingsPage() {
  const { business } = useAuth();
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState<BookingListQuery>({});

  // Derive providers list from bookings for the filter
  const providers = useRef<BookingProvider[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void bookingsApi
      .list(query)
      .then((items) => {
        if (!active) return;
        setBookings(items);
        // Collect unique providers
        const seen = new Map<string, BookingProvider>();
        for (const b of items) {
          if (b.providers && !seen.has(b.providers.id)) seen.set(b.providers.id, b.providers);
        }
        providers.current = Array.from(seen.values());
      })
      .catch((cause: unknown) => {
        if (active)
          setError(cause instanceof Error ? cause.message : 'Unable to load bookings.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query]);

  function handleFilterChange(next: BookingListQuery) {
    setQuery(next);
  }

  function handleClear() {
    setQuery({});
  }

  return (
    <section className="bookings-page" aria-labelledby="bookings-heading">
      <header className="services-header">
        <div>
          <p className="eyebrow">APPOINTMENTS</p>
          <h1 id="bookings-heading">Bookings</h1>
          <p className="muted">Review and manage your business appointments.</p>
        </div>
        {business && (
          <Link className="button primary" to={`/booking/${encodeURIComponent(business.slug)}`}>
            Add booking
          </Link>
        )}
      </header>

      <BookingFilters
        query={query}
        providers={providers.current}
        onChange={handleFilterChange}
        onClear={handleClear}
      />

      {error && (
        <div className="booking-error" role="alert">
          {error}
          <button className="text-button" onClick={() => setQuery({ ...query })}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="services-state" role="status">
          Loading bookings…
        </div>
      ) : (
        <BookingList bookings={bookings} timezone={business?.timezone ?? 'UTC'} />
      )}
    </section>
  );
}
