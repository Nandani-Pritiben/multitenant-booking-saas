import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ProviderForm } from '../features/providers/components/ProviderForm';
import { WorkingHoursForm } from '../features/providers/components/WorkingHoursForm';
import { providersApi } from '../features/providers/api';
import type { Provider, ProviderInput, WorkingHour } from '../features/providers/types';
import '../styles/providers.css';

export function ProviderDetailPage() {
  const { id = '' } = useParams();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [hours, setHours] = useState<WorkingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    void Promise.all([providersApi.get(id), providersApi.getWorkingHours(id)])
      .then(([nextProvider, nextHours]) => { if (active) { setProvider(nextProvider); setHours(nextHours); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load provider.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function saveProvider(input: ProviderInput) {
    if (!provider) return;
    setSaving(true); setError('');
    try { setProvider(await providersApi.update(provider.id, input)); setEditing(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update provider.'); }
    finally { setSaving(false); }
  }

  async function saveHours(nextHours: Omit<WorkingHour, 'id' | 'provider_id'>[]) {
    setSaving(true); setScheduleError(''); setScheduleSuccess('');
    try {
      const saved = await providersApi.saveWorkingHours(id, nextHours);
      setHours(saved); setScheduleSuccess('Working hours updated successfully.');
    } catch (cause) { setScheduleError(cause instanceof Error ? cause.message : 'Unable to save working hours.'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="services-state" role="status">Loading provider...</div>;
  if (error && !provider) return <div className="services-state error-state"><p role="alert">Could not load provider. {error}</p><Link className="button secondary" to="/dashboard/providers">Back to providers</Link></div>;
  if (!provider) return null;

  return <section className="provider-detail" aria-labelledby="provider-heading">
    <Link className="provider-back" to="/dashboard/providers">← Providers</Link>
    <header className="provider-detail-heading"><div><p className="eyebrow">PROVIDER</p><h1 id="provider-heading">{provider.name}</h1><div className="provider-contact"><span>{provider.email || 'No email'}</span><span>{provider.phone || 'No phone'}</span><span className={`status-pill ${provider.status}`}>{provider.status}</span></div></div><button type="button" className="button secondary" onClick={() => { setError(''); setEditing(true); }}>Edit provider</button></header>
    {error && <p className="service-alert" role="alert">{error}</p>}
    <WorkingHoursForm initialHours={hours} busy={saving} error={scheduleError} success={scheduleSuccess} onSave={saveHours} />
    {editing && <ProviderForm provider={provider} busy={saving} error={error} onCancel={() => { if (!saving) setEditing(false); }} onSave={saveProvider} />}
  </section>;
}