import type { AvailabilitySlot, CustomerDetails, PublicBusiness, PublicService } from '../types';

interface BookingSummaryProps {
  business: PublicBusiness;
  service: PublicService;
  slot: AvailabilitySlot;
  date: string;
  customer: CustomerDetails;
  confirming: boolean;
  error: string;
  onBack: () => void;
  onConfirm: () => void;
}

export function BookingSummary({ business, service, slot, date, customer, confirming, error, onBack, onConfirm }: BookingSummaryProps) {
  const price = new Intl.NumberFormat(undefined, { style: 'currency', currency: service.currency }).format(Number(service.price));
  const isPast = Date.parse(slot.start_at) <= Date.now();
  return <section className="booking-summary" aria-labelledby="booking-summary-title"><p className="eyebrow">REVIEW</p><h2 id="booking-summary-title">Review your appointment</h2><dl><div><dt>Business</dt><dd>{business.name}</dd></div><div><dt>Service</dt><dd>{service.name}</dd></div><div><dt>Provider</dt><dd>{slot.provider_name}</dd></div><div><dt>Date</dt><dd>{date}</dd></div><div><dt>Time</dt><dd>{slot.start}–{slot.end} ({business.timezone})</dd></div><div><dt>Duration</dt><dd>{service.duration_minutes} minutes</dd></div><div><dt>Price</dt><dd>{price}</dd></div><div><dt>Customer</dt><dd>{customer.name}</dd></div><div><dt>Email</dt><dd>{customer.email}</dd></div><div><dt>Phone</dt><dd>{customer.phone}</dd></div></dl>{isPast && <p className="booking-error" role="alert">This slot is in the past. Please go back and choose a future time.</p>}{error && <p className="booking-error" role="alert">{error}</p>}<div className="booking-summary-actions"><button type="button" className="button secondary" onClick={onBack} disabled={confirming}>Back</button><button type="button" className="button primary" onClick={onConfirm} disabled={confirming || isPast}>{confirming ? 'Confirming...' : 'Confirm booking'}</button></div></section>;
}