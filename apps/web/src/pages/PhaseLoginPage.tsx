import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { authApi } from '../features/auth/api';

export function PhaseLoginPage() {
  const navigate = useNavigate();
  const { acceptAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await authApi.login({ email, password }); await acceptAuth(result.user); navigate('/dashboard'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to sign in.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><Link className="brand" to="/"><span className="brand-mark">B</span> booking / studio</Link><form className="auth-panel" onSubmit={submit}><p className="eyebrow">WELCOME BACK</p><h1>Sign in</h1><p className="muted">Pick up where your business left off.</p>{error && <div className="alert" role="alert">{error}</div>}<label>Email<input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button className="button primary full" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button><p className="form-foot">New here? <Link to="/signup">Create an account</Link></p></form></main>;
}