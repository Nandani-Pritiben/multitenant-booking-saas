import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { bookingsApi, dashboardApi } from '../features/bookings/api';
import type { DashboardSummary, TodayBookings } from '../features/bookings/types';
import '../styles/dashboard.css';

function todayInTz(timezone: string): string {
  // sv-SE locale formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('sv-SE', { timeZone: timezone }).format(new Date());
}

function formattedDate(timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

export function PhaseDashboard() {
  const { user, business } = useAuth();
  const [today, setToday] = useState<TodayBookings | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadingToday, setLoadingToday] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [todayError, setTodayError] = useState('');
  const [summaryError, setSummaryError] = useState('');

  // Use business timezone from AuthProvider — available immediately on load.
  // Fall back to browser timezone only if business hasn't loaded yet.
  const tz = business?.timezone ?? today?.timezone ?? 'UTC';

  // Compute once per timezone — not dependent on API response
  const localToday = useMemo(() => todayInTz(tz), [tz]);
  const localDateLabel = useMemo(() => formattedDate(tz), [tz]);

  function loadToday() {
    setLoadingToday(true);
    setTodayError('');
    void bookingsApi
      .today()
      .then(setToday)
      .catch((cause: unknown) => {
        setTodayError(cause instanceof Error ? cause.message : 'Unable to load today\'s bookings.');
      })
      .finally(() => setLoadingToday(false));
  }

  function loadSummary() {
    setLoadingSummary(true);
    setSummaryError('');
    void dashboardApi
      .summary()
      .then(setSummary)
      .catch((cause: unknown) => {
        setSummaryError(cause instanceof Error ? cause.message : 'Unable to load metrics.');
      })
      .finally(() => setLoadingSummary(false));
  }

  useEffect(() => {
    loadToday();
    loadSummary();
  }, []);

  const formatTime = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: today?.timezone ?? business?.timezone ?? 'UTC',
    }).format(new Date(value));

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>Good to see you, {user?.user_metadata?.name || 'Owner'}.</h1>
          <p className="muted">Your business workspace is ready.</p>
        </div>
        <Link
          className="button primary"
          to={business ? `/booking/${encodeURIComponent(business.slug)}` : '/dashboard/bookings'}
        >
          Add booking
        </Link>
      </div>

      <section className="business-summary">
        <span className="summary-mark">{business?.name.slice(0, 1).toUpperCase()}</span>
        <div>
          <p className="eyebrow">YOUR BUSINESS</p>
          <h2>{business?.name}</h2>
          <p className="muted">
            {business?.slug} <span className="separator">/</span> {business?.timezone}
          </p>
        </div>
      </section>

      {/* Summary metrics */}
      <section className="stats-grid" aria-label="Booking metrics">
        <article className="stat">
          <span>Today's bookings</span>
          <strong aria-live="polite">
            {loadingSummary ? '…' : summaryError ? '—' : (summary?.todayBookings ?? 0)}
          </strong>
          <small>{localToday}</small>
        </article>

        <article className="stat">
          <span>Upcoming bookings</span>
          <strong aria-live="polite">
            {loadingSummary ? '…' : summaryError ? '—' : (summary?.upcomingBookings ?? 0)}
          </strong>
          <small>Confirmed &amp; in the future</small>
        </article>

        <article className="stat">
          <span>Completed</span>
          <strong aria-live="polite">
            {loadingSummary ? '…' : summaryError ? '—' : (summary?.completedBookings ?? 0)}
          </strong>
          <small>All time</small>
        </article>

        <article className="stat">
          <span>Cancelled</span>
          <strong aria-live="polite">
            {loadingSummary ? '…' : summaryError ? '—' : (summary?.cancelledBookings ?? 0)}
          </strong>
          <small>All time</small>
        </article>
      </section>

      {summaryError && (
        <p className="dashboard-state dashboard-error" role="alert">
          {summaryError}{' '}
          <button className="text-button" onClick={loadSummary}>
            Retry
          </button>
        </p>
      )}

      {/* Upcoming bookings list */}
      <section className="dashboard-today" aria-labelledby="today-bookings-heading">
        <div className="dashboard-today-heading">
          <div>
            <p className="eyebrow">SCHEDULE</p>
            <h2 id="today-bookings-heading">Today's bookings</h2>
            <p className="muted dashboard-date-label">{localDateLabel}</p>
          </div>
          <Link to="/dashboard/bookings">All bookings</Link>
        </div>

        {loadingToday ? (
          <p className="dashboard-state" role="status">
            Loading today's bookings…
          </p>
        ) : todayError ? (
          <div className="dashboard-state dashboard-error" role="alert">
            {todayError}{' '}
            <button className="text-button" onClick={loadToday}>
              Retry
            </button>
          </div>
        ) : !today?.bookings.length ? (
          <p className="dashboard-state">No bookings scheduled for today.</p>
        ) : (
          <div className="dashboard-today-list">
            {today.bookings.map((booking) => (
              <article className="dashboard-today-row" key={booking.id}>
                <time>
                  {formatTime(booking.start_at)}–{formatTime(booking.end_at)}
                </time>
                <span className="today-customer">
                  <strong>{booking.customer_name}</strong>
                  <small>{booking.customer_email}</small>
                </span>
                <span>{booking.services?.name ?? 'Service'}</span>
                <span>{booking.providers?.name ?? 'Provider'}</span>
                <span
                  className={`status-pill ${booking.status === 'confirmed' ? 'active' : 'inactive'}`}
                >
                  {booking.status.replace('_', ' ')}
                </span>
                <Link
                  to={`/dashboard/bookings/${booking.id}`}
                  className="text-button"
                  aria-label={`View booking for ${booking.customer_name}`}
                >
                  View
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
