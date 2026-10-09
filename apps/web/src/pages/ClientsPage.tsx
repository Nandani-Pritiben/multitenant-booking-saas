import { useEffect, useState } from 'react';
import { useAuth } from '../app/AuthProvider';
import { clientsApi } from '../features/clients/api';
import { ClientList } from '../features/clients/components/ClientList';
import { ClientSearch } from '../features/clients/components/ClientSearch';
import { UpgradeWall } from '../features/billing/components/UpgradeWall';
import type { ClientSummary } from '../features/clients/types';
import '../styles/clients.css';
import '../styles/bookings.css';

const PAGE_SIZE = 20;

export function ClientsPage() {
  const { business, plan } = useAuth();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (plan !== 'pro') return;
    setLoading(true);
    setError('');
    void clientsApi
      .list({ search: search || undefined, page, limit: PAGE_SIZE })
      .then((res) => { setClients(res.clients); setTotal(res.total); })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Unable to load clients.');
      })
      .finally(() => setLoading(false));
  }, [plan, search, page]);

  // Gate: show upgrade wall for free plan users
  if (plan !== 'pro') return <UpgradeWall feature="Clients (CRM)" />;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <section className="bookings-page" aria-labelledby="clients-heading">
      <header className="services-header">
        <div>
          <p className="eyebrow">CRM</p>
          <h1 id="clients-heading">Clients</h1>
          <p className="muted">All clients are built automatically from your bookings.</p>
        </div>
      </header>

      <ClientSearch value={search} onChange={(v) => { setSearch(v); setPage(1); }} />

      {error && (
        <div className="booking-error" role="alert">
          {error}
          <button className="text-button" onClick={() => setSearch(search)}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="services-state" role="status">Loading clients…</div>
      ) : (
        <>
          <ClientList clients={clients} timezone={business?.timezone ?? 'UTC'} />
          {totalPages > 1 && (
            <nav className="client-pagination" aria-label="Pagination">
              <button type="button" className="button secondary" disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span className="client-page-info">Page {page} of {totalPages} · {total} clients</span>
              <button type="button" className="button secondary" disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}>Next →</button>
            </nav>
          )}
          {total === 0 && !search && (
            <div className="services-empty">
              <h2>No clients yet</h2>
              <p>Clients are created automatically when your first booking is made.</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
