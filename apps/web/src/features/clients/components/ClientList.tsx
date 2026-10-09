import { Link } from 'react-router-dom';
import type { ClientSummary } from '../types';

interface ClientListProps {
  clients: ClientSummary[];
  timezone: string;
}

function fmtDate(iso: string | null, timezone: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function ClientList({ clients, timezone }: ClientListProps) {
  if (clients.length === 0) {
    return (
      <div className="services-empty">
        <h2>No clients found</h2>
        <p>Clients are created automatically when bookings are made.</p>
      </div>
    );
  }

  return (
    <div className="bookings-table-wrap">
      <table className="services-table" aria-label="Clients">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Phone</th>
            <th scope="col">Bookings</th>
            <th scope="col">Last visit</th>
            <th scope="col">Next visit</th>
            <th scope="col"><span className="visually-hidden">View</span></th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td>
                <strong>{client.name}</strong>
              </td>
              <td>{client.email ?? '—'}</td>
              <td>{client.phone ?? '—'}</td>
              <td>
                <span className="client-booking-count">{client.total_bookings}</span>
              </td>
              <td>{fmtDate(client.last_appointment, timezone)}</td>
              <td>{fmtDate(client.next_appointment, timezone)}</td>
              <td>
                <Link
                  to={`/dashboard/clients/${client.id}`}
                  className="text-button"
                  aria-label={`View profile for ${client.name}`}
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
