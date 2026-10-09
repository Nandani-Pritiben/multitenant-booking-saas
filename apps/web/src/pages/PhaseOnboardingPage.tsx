import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { businessApi } from '../features/business/api';

export function PhaseOnboardingPage() {
  const navigate = useNavigate();
  const { refreshBusiness } = useAuth();
  const [values, setValues] = useState({ name: '', slug: '', timezone: 'UTC' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await businessApi.create(values); await refreshBusiness(); navigate('/dashboard'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create your business.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><form className="auth-panel" onSubmit={submit}><p className="eyebrow">ONE LAST STEP</p><h1>Set up your business</h1>{error && <div className="alert" role="alert">{error}</div>}<label>Business name<input value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} required /></label><label>URL slug<input pattern="[a-z0-9]+(-[a-z0-9]+)*" value={values.slug} onChange={(event) => setValues({ ...values, slug: event.target.value.toLowerCase() })} required /></label><label>Timezone<select value={values.timezone} onChange={(event) => setValues({ ...values, timezone: event.target.value })}><option>UTC</option><option>Asia/Kolkata</option><option>America/New_York</option><option>America/Los_Angeles</option><option>Europe/London</option></select></label><button className="button primary full" disabled={busy}>{busy ? 'Creating...' : 'Create business'}</button></form></main>;
}