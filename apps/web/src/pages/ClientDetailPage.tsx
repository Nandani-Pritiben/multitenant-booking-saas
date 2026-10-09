import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { clientsApi } from '../features/clients/api';
import { ClientProfile } from '../features/clients/components/ClientProfile';
import { UpgradeWall } from '../features/billing/components/UpgradeWall';
import type { ClientBooking, ClientDetail } from '../features/clients/types';
import '../styles/clients.css';
import '../styles/bookings.css';

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { business, plan } = useAuth();
  const [client, setClient]     = useState<ClientDetail | null>(null);
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!id || plan !== 'pro') return;
    setLoading(true);
    setError('');
    void Promise.all([clientsApi.get(id), clientsApi.bookings(id)])
      .then(([c, b]) => { setClient(c); setBookings(b); })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Unable to load client.');
      })
      .finally(() => setLoading(false));
  }, [id, plan]);

  // Gate: show upgrade wall for free plan users
  if (plan !== 'pro') return <UpgradeWall feature="Client profiles" />;

  if (loading) return <div className="services-state" role="status">Loading client…</div>;
  if (error) return (
    <div className="booking-error" role="alert">
      {error} <button type="button" className="text-button" onClick={() => setLoading(true)}>Retry</button>
    </div>
  );
  if (!client) return <div className="services-empty"><h2>Client not found</h2></div>;

  return (
    <section aria-labelledby="client-detail-heading">
      <header className="page-heading">
        <div>
          <p className="eyebrow">CLIENT</p>
          <h1 id="client-detail-heading">{client.name}</h1>
        </div>
      </header>
      <ClientProfile
        client={client}
        bookings={bookings}
        timezone={business?.timezone ?? 'UTC'}
        onUpdated={setClient}
      />
    </section>
  );
}
