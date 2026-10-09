import type { BookingRecord, PublicBusiness, PublicProvider, PublicService } from '../types';

interface BookingConfirmationProps {
  booking: BookingRecord;
  business: PublicBusiness;
  service: PublicService;
  provider: PublicProvider;
}

export function BookingConfirmation({ booking, business, service, provider }: BookingConfirmationProps) {
  const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeZone: business.timezone }).format(new Date(booking.start_at));
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: business.timezone }).format(new Date(booking.start_at));
  return <section className="booking-summary booking-confirmation" aria-labelledby="booking-confirmation-title"><p className="eyebrow">APPOINTMENT RESERVED</p><h2 id="booking-confirmation-title">Booking confirmed!</h2><p className="booking-reference">Reference <strong>{booking.id}</strong></p><dl><div><dt>Business</dt><dd>{business.name}</dd></div><div><dt>Service</dt><dd>{service.name}</dd></div><div><dt>Provider</dt><dd>{provider.name}</dd></div><div><dt>Date</dt><dd>{date}</dd></div><div><dt>Time</dt><dd>{time} ({business.timezone})</dd></div><div><dt>Duration</dt><dd>{service.duration_minutes} minutes</dd></div><div><dt>Customer</dt><dd>{booking.customer_name}</dd></div><div><dt>Email</dt><dd>{booking.customer_email}</dd></div><div><dt>Phone</dt><dd>{booking.customer_phone}</dd></div></dl></section>;
}