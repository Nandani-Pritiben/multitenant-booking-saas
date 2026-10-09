import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Service, ServiceInput } from '../types';

interface ServiceFormProps {
  service?: Service;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onSave: (input: ServiceInput) => Promise<void>;
}

export function ServiceForm({ service, busy, error, onCancel, onSave }: ServiceFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState({
    name: service?.name ?? '',
    description: service?.description ?? '',
    duration: String(service?.duration_minutes ?? 30),
    price: service ? String(service.price) : '',
    currency: service?.currency ?? 'INR',
  });
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    dialogRef.current?.showModal();
    nameRef.current?.focus();
    return () => dialogRef.current?.close();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const duration = Number(values.duration);
    const price = Number(values.price);
    const currency = values.currency.trim().toUpperCase();
    if (!values.name.trim()) return setValidationError('Enter a service name.');
    if (!Number.isInteger(duration) || duration < 1 || duration > 1440) {
      return setValidationError('Duration must be a whole number between 1 and 1440 minutes.');
    }
    if (!Number.isFinite(price) || price < 0 || Math.round(price * 100) !== price * 100) {
      return setValidationError('Enter a valid price with no more than two decimal places.');
    }
    if (!/^[A-Z]{3}$/.test(currency)) return setValidationError('Enter a 3-letter currency code.');
    setValidationError('');
    await onSave({
      name: values.name.trim(),
      description: values.description.trim() || null,
      duration_minutes: duration,
      price,
      currency,
    });
  }

  return (
    <dialog ref={dialogRef} className="service-dialog" aria-labelledby="service-form-title" onCancel={(event) => { event.preventDefault(); onCancel(); }}>
      <form onSubmit={(event) => void submit(event)} noValidate>
        <div className="service-dialog-heading"><div><p className="eyebrow">SERVICE DETAILS</p><h2 id="service-form-title">{service ? 'Edit service' : 'Add service'}</h2></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={onCancel}>×</button></div>
        {(validationError || error) && <p className="service-alert" role="alert">{validationError || error}</p>}
        <label className="service-field">Service name <span aria-hidden="true">*</span><input ref={nameRef} maxLength={120} value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} required aria-required="true" /></label>
        <label className="service-field">Description<textarea rows={3} maxLength={2000} value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} /></label>
        <div className="service-form-row"><label className="service-field">Duration in minutes <span aria-hidden="true">*</span><input type="number" min="1" max="1440" step="1" value={values.duration} onChange={(event) => setValues({ ...values, duration: event.target.value })} required aria-required="true" /></label><label className="service-field">Price <span aria-hidden="true">*</span><input type="number" min="0" step="0.01" value={values.price} onChange={(event) => setValues({ ...values, price: event.target.value })} required aria-required="true" /></label></div>
        <label className="service-field">Currency<input maxLength={3} value={values.currency} onChange={(event) => setValues({ ...values, currency: event.target.value.toUpperCase() })} required /></label>
        <div className="service-dialog-actions"><button type="button" className="button secondary" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" className="button primary" disabled={busy}>{busy ? 'Saving...' : service ? 'Save changes' : 'Add service'}</button></div>
      </form>
    </dialog>
  );
}