import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BookingDetail } from '../types';
import { bookingsApi } from '../api';
import { BookingStatusBadge } from './BookingStatusBadge';
import { ApiError } from '../../../lib/api-client';

interface BookingDetailProps {
  booking: BookingDetail;
  onUpdated: (updated: BookingDetail) => void;
}

function fmt(value: string, timezone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: timezone }).format(
    new Date(value),
  );
}

export function BookingDetailView({ booking, onUpdated }: BookingDetailProps) {
  const navigate = useNavigate();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');

  const timezone = booking.businesses?.timezone ?? 'UTC';

  async function performAction(action: 'cancel' | 'complete' | 'no_show') {
    if (
      !window.confirm(
        action === 'cancel'
          ? `Cancel the booking for ${booking.customer_name}?`
          : action === 'complete'
            ? `Mark this booking as completed?`
            : `Mark this booking as no-show?`,
      )
    )
      return;

    setPending(action);
    setError('');
    try {
      let result: { id: string; status: string; updated_at?: string };
      if (action === 'cancel') {
        result = await bookingsApi.cancel(booking.id);
      } else {
        const status = action === 'complete' ? 'completed' : 'no_show';
        result = await bookingsApi.updateStatus(booking.id, status);
      }
      // Merge updated status into the booking object
      onUpdated({ ...booking, status: result.status as BookingDetail['status'], updated_at: result.updated_at ?? booking.updated_at });
    } catch (cause) {
      const msg =
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : 'Unable to complete action.';
      setError(msg);
    } finally {
      setPending(null);
    }
  }

  const canAct = booking.status === 'confirmed';

  return (
    <div className="booking-detail">
      <div className="booking-detail-header">
        <button
          type="button"
          className="text-button back-button"
          onClick={() => navigate('/dashboard/bookings')}
          aria-label="Back to bookings"
        >
          ← Back
        </button>
        <BookingStatusBadge status={booking.status} />
      </div>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <div className="booking-detail-grid">
        <section className="booking-detail-section" aria-labelledby="customer-heading">
          <h2 id="customer-heading" className="booking-detail-section-title">
            Customer
          </h2>
          <dl className="booking-detail-list">
            <div className="booking-detail-row">
              <dt>Name</dt>
              <dd>{booking.customer_name}</dd>
            </div>
            <div className="booking-detail-row">
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${booking.customer_email}`}>{booking.customer_email}</a>
              </dd>
            </div>
            <div className="booking-detail-row">
              <dt>Phone</dt>
              <dd>{booking.customer_phone}</dd>
            </div>
          </dl>
        </section>

        <section className="booking-detail-section" aria-labelledby="service-heading">
          <h2 id="service-heading" className="booking-detail-section-title">
            Service
          </h2>
          <dl className="booking-detail-list">
            <div className="booking-detail-row">
              <dt>Service</dt>
              <dd>{booking.services?.name ?? '—'}</dd>
            </div>
            <div className="booking-detail-row">
              <dt>Duration</dt>
              <dd>
                {booking.services?.duration_minutes != null
                  ? `${booking.services.duration_minutes} min`
                  : '—'}
              </dd>
            </div>
            {booking.services?.price != null && (
              <div className="booking-detail-row">
                <dt>Price</dt>
                <dd>
                  {booking.services.currency ?? 'INR'} {booking.services.price.toFixed(2)}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="booking-detail-section" aria-labelledby="appointment-heading">
          <h2 id="appointment-heading" className="booking-detail-section-title">
            Appointment
          </h2>
          <dl className="booking-detail-list">
            <div className="booking-detail-row">
              <dt>Provider</dt>
              <dd>{booking.providers?.name ?? '—'}</dd>
            </div>
            <div className="booking-detail-row">
              <dt>Date</dt>
              <dd>{fmt(booking.start_at, timezone, { dateStyle: 'long' })}</dd>
            </div>
            <div className="booking-detail-row">
              <dt>Start time</dt>
              <dd>{fmt(booking.start_at, timezone, { timeStyle: 'short' })}</dd>
            </div>
            <div className="booking-detail-row">
              <dt>End time</dt>
              <dd>{fmt(booking.end_at, timezone, { timeStyle: 'short' })}</dd>
            </div>
          </dl>
        </section>

        <section className="booking-detail-section" aria-labelledby="meta-heading">
          <h2 id="meta-heading" className="booking-detail-section-title">
            Booking info
          </h2>
          <dl className="booking-detail-list">
            <div className="booking-detail-row">
              <dt>Reference</dt>
              <dd>
                <code className="booking-ref">{booking.id.slice(0, 8).toUpperCase()}</code>
              </dd>
            </div>
            <div className="booking-detail-row">
              <dt>Status</dt>
              <dd>
                <BookingStatusBadge status={booking.status} />
              </dd>
            </div>
            <div className="booking-detail-row">
              <dt>Created</dt>
              <dd>
                {booking.created_at
                  ? fmt(booking.created_at, timezone, { dateStyle: 'medium', timeStyle: 'short' })
                  : '—'}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {canAct && (
        <div className="booking-detail-actions" aria-label="Booking actions">
          <button
            type="button"
            className="button secondary"
            disabled={pending !== null}
            onClick={() => void performAction('complete')}
          >
            {pending === 'complete' ? 'Updating…' : 'Mark completed'}
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={pending !== null}
            onClick={() => void performAction('no_show')}
          >
            {pending === 'no_show' ? 'Updating…' : 'Mark no-show'}
          </button>
          <button
            type="button"
            className="button secondary delete-text"
            disabled={pending !== null}
            onClick={() => void performAction('cancel')}
          >
            {pending === 'cancel' ? 'Cancelling…' : 'Cancel booking'}
          </button>
        </div>
      )}
    </div>
  );
}
