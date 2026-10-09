import { useEffect, useState } from 'react';
import { DeleteProviderDialog } from '../features/providers/components/DeleteProviderDialog';
import { ProviderForm } from '../features/providers/components/ProviderForm';
import { ProviderList } from '../features/providers/components/ProviderList';
import { providersApi } from '../features/providers/api';
import type { Provider, ProviderInput } from '../features/providers/types';
import '../styles/providers.css';

export function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Provider | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError('');
    void providersApi.list().then((items) => { if (active) setProviders(items); })
      .catch((cause: unknown) => { if (active) setLoadError(cause instanceof Error ? cause.message : 'Unable to load providers.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);

  function openCreate() { setEditing(null); setFormError(''); setFormOpen(true); setNotice(''); }

  async function save(input: ProviderInput) {
    setBusy(true); setFormError('');
    try {
      if (editing) { await providersApi.update(editing.id, input); setNotice('Provider updated.'); }
      else { await providersApi.create(input); setNotice('Provider added.'); }
      setFormOpen(false); setReloadKey((key) => key + 1);
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'Unable to save provider.'); }
    finally { setBusy(false); }
  }

  async function toggle(provider: Provider) {
    setPendingId(provider.id); setActionError(''); setNotice('');
    try {
      const status = provider.status === 'active' ? 'inactive' : 'active';
      await providersApi.update(provider.id, { status });
      setNotice(`Provider ${status === 'active' ? 'enabled' : 'disabled'}.`);
      setReloadKey((key) => key + 1);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Unable to update provider status.'); }
    finally { setPendingId(null); }
  }

  async function remove() {
    if (!deleteTarget) return;
    setBusy(true); setDeleteError('');
    try {
      await providersApi.delete(deleteTarget.id);
      setDeleteTarget(null); setNotice('Provider deleted.'); setReloadKey((key) => key + 1);
    } catch (cause) { setDeleteError(cause instanceof Error ? cause.message : 'Unable to delete provider.'); }
    finally { setBusy(false); }
  }

  return <section className="providers-page" aria-labelledby="providers-heading">
    <header className="services-header"><div><p className="eyebrow">TEAM</p><h1 id="providers-heading">Providers</h1><p className="muted">Manage the people who provide your services.</p></div><button type="button" className="button primary add-service-button" onClick={openCreate}>+ Add Provider</button></header>
    {notice && <p className="service-notice" role="status">{notice}</p>}{actionError && <p className="service-alert" role="alert">{actionError}</p>}
    {loading ? <div className="services-state" role="status">Loading providers...</div>
      : loadError ? <div className="services-state error-state"><p role="alert">Could not load providers. {loadError}</p><button className="button secondary" onClick={() => setReloadKey((key) => key + 1)}>Retry</button></div>
        : providers.length === 0 ? <div className="services-empty"><span className="empty-mark">＋</span><h2>No providers yet</h2><p>Add a provider to manage your team and their working hours.</p><button type="button" className="button primary" onClick={openCreate}>Add Provider</button></div>
          : <ProviderList providers={providers} pendingId={pendingId} onEdit={(provider) => { setEditing(provider); setFormError(''); setFormOpen(true); }} onToggle={(provider) => void toggle(provider)} onDelete={(provider) => { setDeleteTarget(provider); setDeleteError(''); }} />}
    {formOpen && <ProviderForm provider={editing ?? undefined} busy={busy} error={formError} onCancel={() => { if (!busy) setFormOpen(false); }} onSave={save} />}
    {deleteTarget && <DeleteProviderDialog provider={deleteTarget} busy={busy} error={deleteError} onCancel={() => { if (!busy) setDeleteTarget(null); }} onConfirm={remove} />}
  </section>;
}