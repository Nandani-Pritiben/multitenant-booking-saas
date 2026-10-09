import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { authApi } from '../features/auth/api';

export function PhaseSignupPage() {
  const navigate = useNavigate();
  const { acceptAuth } = useAuth();
  const [values, setValues] = useState({ name: '', email: '', password: '', businessName: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await authApi.signup(values); await acceptAuth(result.user); navigate('/dashboard'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create your account.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><Link className="brand" to="/"><span className="brand-mark">B</span> booking / studio</Link><form className="auth-panel" onSubmit={submit}><p className="eyebrow">START WITH THE BASICS</p><h1>Create your workspace</h1><p className="muted">Your business and owner access are set up together.</p>{error && <div className="alert" role="alert">{error}</div>}<label>Your name<input autoComplete="name" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} required /></label><label>Email<input autoComplete="email" type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} required /></label><label>Password<input autoComplete="new-password" type="password" minLength={8} value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} required /></label><label>Business name<input value={values.businessName} onChange={(event) => setValues({ ...values, businessName: event.target.value })} required /></label><button className="button primary full" disabled={busy}>{busy ? 'Creating workspace...' : 'Create account'}</button><p className="form-foot">Already have a workspace? <Link to="/login">Sign in</Link></p></form></main>;
}