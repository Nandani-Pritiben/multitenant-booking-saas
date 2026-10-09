import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Provider, ProviderInput } from '../types';

interface ProviderFormProps {
  provider?: Provider;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onSave: (input: ProviderInput) => Promise<void>;
}

export function ProviderForm({ provider, busy, error, onCancel, onSave }: ProviderFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(provider?.name ?? '');
  const [email, setEmail] = useState(provider?.email ?? '');
  const [phone, setPhone] = useState(provider?.phone ?? '');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    dialogRef.current?.showModal();
    nameRef.current?.focus();
    return () => dialogRef.current?.close();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const cleanPhone = phone.trim();
    if (!name.trim()) return setValidationError('Enter a provider name.');
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setValidationError('Enter a valid email address.');
    }
    if (cleanPhone && !/^\+?[0-9()\-\s]{7,20}$/.test(cleanPhone)) {
      return setValidationError('Enter a valid phone number.');
    }
    setValidationError('');
    await onSave({ name: name.trim(), email: email.trim() || null, phone: cleanPhone || null });
  }

  return <dialog className="service-dialog" ref={dialogRef} aria-labelledby="provider-form-title" onCancel={(event) => { event.preventDefault(); onCancel(); }}>
    <form onSubmit={(event) => void submit(event)} noValidate>
      <div className="service-dialog-heading"><div><p className="eyebrow">TEAM MEMBER</p><h2 id="provider-form-title">{provider ? 'Edit provider' : 'Add provider'}</h2></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={onCancel} disabled={busy}>×</button></div>
      {(validationError || error) && <p className="service-alert" role="alert">{validationError || error}</p>}
      <label className="service-field">Name <span aria-hidden="true">*</span><input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required aria-required="true" /></label>
      <label className="service-field">Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} /></label>
      <label className="service-field">Phone<input type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={20} /></label>
      <div className="service-dialog-actions"><button type="button" className="button secondary" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" className="button primary" disabled={busy}>{busy ? 'Saving...' : provider ? 'Save changes' : 'Add provider'}</button></div>
    </form>
  </dialog>;
}