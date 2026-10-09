import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { ClientBooking, ClientDetail } from '../types';
import { clientsApi } from '../api';
import { ClientNotes } from './ClientNotes';
import { BookingStatusBadge } from '../../bookings/components/BookingStatusBadge';

interface ClientProfileProps {
  client: ClientDetail;
  bookings: ClientBooking[];
  timezone: string;
  onUpdated: (client: ClientDetail) => void;
}

function fmt(iso: string | null, timezone: string, opts: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(undefined, { ...opts, timeZone: timezone }).format(new Date(iso));
}

export function ClientProfile({ client, bookings, timezone, onUpdated }: ClientProfileProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: client.name, email: client.email ?? '', phone: client.phone ?? '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const updated = await clientsApi.update(client.id, {
        name:  form.name  || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
      });
      onUpdated({ ...client, ...updated });
      setEditing(false);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Unable to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="client-profile">
      {/* ── Header ── */}
      <div className="booking-detail-header">
        <Link to="/dashboard/clients" className="text-button back-button">← Back</Link>
        <button
          type="button"
          className="button secondary"
          style={{ padding: '7px 16px', minHeight: 34 }}
          onClick={() => { setEditing((v) => !v); setSaveError(''); }}
        >
          {editing ? 'Cancel edit' : 'Edit client'}
        </button>
      </div>

      {/* ── Edit form ── */}
      {editing && (
        <form className="client-edit-form" onSubmit={(e) => void submitEdit(e)} aria-label="Edit client">
          {saveError && <div className="alert" role="alert">{saveError}</div>}
          <div className="settings-grid">
            <label>
              Name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                maxLength={160}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                maxLength={254}
              />
            </label>
            <label>
              Phone
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                maxLength={40}
              />
            </label>
          </div>
          <button type="submit" className="button primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      )}

      <div className="booking-detail-grid">
        {/* ── Client info ── */}
        <section className="booking-detail-section" aria-labelledby="client-info-heading">
          <h2 id="client-info-heading" className="booking-detail-section-title">Client</h2>
          <dl className="booking-detail-list">
            <div className="booking-detail-row"><dt>Name</dt><dd>{client.name}</dd></div>
            <div className="booking-detail-row"><dt>Email</dt>
              <dd>{client.email ? <a href={`mailto:${client.email}`}>{client.email}</a> : '—'}</dd>
            </div>
            <div className="booking-detail-row"><dt>Phone</dt><dd>{client.phone ?? '—'}</dd></div>
            <div className="booking-detail-row">
              <dt>Since</dt>
              <dd>{fmt(client.created_at, timezone, { dateStyle: 'medium' })}</dd>
            </div>
          </dl>
        </section>

        {/* ── Stats ── */}
        <section className="booking-detail-section" aria-labelledby="client-stats-heading">
          <h2 id="client-stats-heading" className="booking-detail-section-title">Statistics</h2>
          <dl className="booking-detail-list">
            <div className="booking-detail-row"><dt>Total bookings</dt><dd>{client.total_bookings}</dd></div>
            <div className="booking-detail-row"><dt>Completed</dt><dd>{client.completed_bookings}</dd></div>
            <div className="booking-detail-row"><dt>Cancelled</dt><dd>{client.cancelled_bookings}</dd></div>
            <div className="booking-detail-row">
              <dt>Last visit</dt>
              <dd>{fmt(client.last_appointment, timezone, { dateStyle: 'medium', timeStyle: 'short' })}</dd>
            </div>
            <div className="booking-detail-row">
              <dt>Next visit</dt>
              <dd>{fmt(client.next_appointment, timezone, { dateStyle: 'medium', timeStyle: 'short' })}</dd>
            </div>
            {client.lifetime_value !== null && (
              <div className="booking-detail-row">
                <dt>Lifetime value</dt>
                <dd>₹{client.lifetime_value.toFixed(2)}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      {/* ── Notes ── */}
      <div className="booking-detail-section" style={{ marginBottom: 24 }}>
        <ClientNotes
          clientId={client.id}
          initialNotes={client.notes}
          onSaved={(notes) => onUpdated({ ...client, notes })}
        />
      </div>

      {/* ── Booking history ── */}
      <section aria-labelledby="client-history-heading">
        <h2 id="client-history-heading" className="booking-detail-section-title" style={{ marginBottom: 12 }}>
          Booking history
        </h2>
        {bookings.length === 0 ? (
          <p className="dashboard-state">No bookings linked to this client yet.</p>
        ) : (
          <div className="bookings-table-wrap">
            <table className="services-table" aria-label="Client booking history">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Time</th>
                  <th scope="col">Service</th>
                  <th scope="col">Provider</th>
                  <th scope="col">Duration</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="visually-hidden">View</span></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>{fmt(b.start_at, timezone, { dateStyle: 'medium' })}</td>
                    <td>
                      {fmt(b.start_at, timezone, { timeStyle: 'short' })}–
                      {fmt(b.end_at, timezone, { timeStyle: 'short' })}
                    </td>
                    <td>{b.services?.name ?? '—'}</td>
                    <td>{b.providers?.name ?? '—'}</td>
                    <td>
                      {b.services?.duration_minutes != null
                        ? `${b.services.duration_minutes} min`
                        : '—'}
                    </td>
                    <td><BookingStatusBadge status={b.status} /></td>
                    <td>
                      <Link to={`/dashboard/bookings/${b.id}`} className="text-button">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
