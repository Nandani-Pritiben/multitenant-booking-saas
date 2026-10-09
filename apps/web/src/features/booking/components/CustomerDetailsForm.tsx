import { useState, type FormEvent } from 'react';
import type { CustomerDetails } from '../types';

interface CustomerDetailsFormProps {
  value: CustomerDetails;
  onChange: (value: CustomerDetails) => void;
  onContinue: () => void;
}

export function CustomerDetailsForm({ value, onChange, onContinue }: CustomerDetailsFormProps) {
  const [error, setError] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.name.trim()) return setError('Enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim())) return setError('Enter a valid email address.');
    if (!/^\+?[0-9()\-\s]{7,20}$/.test(value.phone.trim())) return setError('Enter a valid phone number.');
    setError('');
    onContinue();
  }

  return <form className="booking-step booking-customer-form" onSubmit={submit} noValidate>
    <div className="booking-step-heading"><span>04</span><div><h2>Your details</h2><p>Used to prepare your appointment.</p></div></div>
    {error && <p className="booking-error" role="alert">{error}</p>}
    <div className="booking-customer-fields"><label>Name<input autoComplete="name" value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} required /></label><label>Email<input type="email" autoComplete="email" value={value.email} onChange={(event) => onChange({ ...value, email: event.target.value })} required /></label><label>Phone<input type="tel" autoComplete="tel" value={value.phone} onChange={(event) => onChange({ ...value, phone: event.target.value })} required /></label></div>
    <button type="submit" className="button primary">Review booking</button>
  </form>;
}