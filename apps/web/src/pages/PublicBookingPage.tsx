import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { bookingApi } from '../features/booking/api';
import { ApiError } from '../lib/api-client';
import { BookingSummary } from '../features/booking/components/BookingSummary';
import { BookingConfirmation } from '../features/booking/components/BookingConfirmation';
import { BusinessHeader } from '../features/booking/components/BusinessHeader';
import { CustomerDetailsForm } from '../features/booking/components/CustomerDetailsForm';
import { DateSelector } from '../features/booking/components/DateSelector';
import { ProviderSelector } from '../features/booking/components/ProviderSelector';
import { ServiceSelector } from '../features/booking/components/ServiceSelector';
import { SlotSelector } from '../features/booking/components/SlotSelector';
import type { AvailabilitySlot, BookingRecord, CustomerDetails, PublicBusiness, PublicProvider, PublicService } from '../features/booking/types';
import '../styles/public-booking.css';

function todayInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function PublicBookingPage() {
  const { businessSlug = '' } = useParams();
  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [providers, setProviders] = useState<PublicProvider[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [customer, setCustomer] = useState<CustomerDetails>({ name: '', email: '', phone: '' });
  const [reviewing, setReviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);
  const [confirmedProvider, setConfirmedProvider] = useState<PublicProvider | null>(null);
  const [availabilityReload, setAvailabilityReload] = useState(0);

  useEffect(() => {
    let active = true;
    setInitialLoading(true);
    setPageError('');
    void Promise.all([
      bookingApi.business(businessSlug),
      bookingApi.services(businessSlug),
      bookingApi.providers(businessSlug),
    ]).then(([nextBusiness, nextServices, nextProviders]) => {
      if (!active) return;
      setBusiness(nextBusiness);
      setServices(nextServices);
      setProviders(nextProviders);
      setDate(todayInTimezone(nextBusiness.timezone));
    }).catch((cause: unknown) => {
      if (active) setPageError(cause instanceof Error ? cause.message : 'Unable to load this business.');
    }).finally(() => {
      if (active) setInitialLoading(false);
    });
    return () => { active = false; };
  }, [businessSlug]);

  useEffect(() => {
    if (!business || !serviceId || !date) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }
    let active = true;
    setSlotsLoading(true);
    setSlotsError('');
    setSlots([]);
    setSelectedSlot(null);
    setReviewing(false);
    void bookingApi.availability(businessSlug, serviceId, date, providerId || undefined)
      .then((result) => { if (active) setSlots(result.slots); })
      .catch((cause: unknown) => { if (active) setSlotsError(cause instanceof Error ? cause.message : 'Unable to load availability.'); })
      .finally(() => { if (active) setSlotsLoading(false); });
    return () => { active = false; };
  }, [business, businessSlug, date, providerId, serviceId, availabilityReload]);

  const selectedService = services.find((service) => service.id === serviceId) ?? null;
  const minimumDate = business ? todayInTimezone(business.timezone) : '';

  function review() {
    setReviewing(true);
  }

  async function confirmBooking() {
    if (!selectedService || !selectedSlot) return;
    if (confirming) return; // guard against concurrent calls
    setConfirming(true);
    setBookingError('');
    try {
      const booking = await bookingApi.createBooking(businessSlug, {
        service_id: selectedService.id,
        provider_id: selectedSlot.provider_id,
        start_at: selectedSlot.start_at,
        customer_name: customer.name.trim(),
        customer_email: customer.email.trim(),
        customer_phone: customer.phone.trim(),
      });
      setConfirmedBooking(booking);
      setConfirmedProvider({ id: selectedSlot.provider_id, name: selectedSlot.provider_name });
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setBookingError('This slot was just booked by someone else. Please choose another available time.');
        setReviewing(false);
        setSelectedSlot(null);
        setAvailabilityReload((value) => value + 1);
      } else {
        setBookingError(cause instanceof Error ? cause.message : 'Unable to confirm this booking.');
      }
    } finally {
      setConfirming(false);
    }
  }

  if (initialLoading) return <main className="public-booking-state" role="status">Loading booking information...</main>;
  if (pageError || !business) return <main className="public-booking-state"><div className="booking-error" role="alert">Could not load this business. {pageError}</div></main>;

  if (confirmedBooking && confirmedProvider && selectedService) {
    return <main className="public-booking-page"><div className="public-booking-shell"><BusinessHeader business={business} /><BookingConfirmation booking={confirmedBooking} business={business} service={selectedService} provider={confirmedProvider} /><footer className="public-booking-footer">Appointments by booking / studio</footer></div></main>;
  }

  return <main className="public-booking-page">
    <div className="public-booking-shell">
      <BusinessHeader business={business} />
      {bookingError && <p className="booking-error" role="alert">{bookingError}</p>}
      {reviewing && selectedService && selectedSlot ? <BookingSummary business={business} service={selectedService} slot={selectedSlot} date={date} customer={customer} confirming={confirming} error={bookingError} onBack={() => setReviewing(false)} onConfirm={() => void confirmBooking()} /> : <>
        <section className="booking-step" aria-labelledby="booking-service-title"><div className="booking-step-heading"><span>01</span><div><h2 id="booking-service-title">Choose a service</h2><p>Select what you’d like to book.</p></div></div>
          {services.length === 0 ? <p className="booking-state">No active services are available.</p> : <ServiceSelector services={services} selectedId={serviceId} onSelect={(service) => { setServiceId(service.id); setSelectedSlot(null); setReviewing(false); setBookingError(''); }} />}
        </section>

        {selectedService && <>
          <section className="booking-step" aria-labelledby="booking-provider-title"><div className="booking-step-heading"><span>02</span><div><h2 id="booking-provider-title">Choose a provider</h2><p>Choose a person or see times across the team.</p></div></div>
            <ProviderSelector providers={providers} selectedId={providerId} onSelect={(id) => { setProviderId(id); setSelectedSlot(null); setBookingError(''); }} />
          </section>

          <section className="booking-step" aria-labelledby="booking-date-title"><div className="booking-step-heading"><span>03</span><div><h2 id="booking-date-title">Choose a date and time</h2><p>Appointment times use {business.timezone}.</p></div></div>
            <DateSelector value={date} minimum={minimumDate} onChange={(nextDate) => { setDate(nextDate); setSelectedSlot(null); setBookingError(''); }} />
            <SlotSelector slots={slots} selectedStart={selectedSlot?.start_at ?? ''} loading={slotsLoading} error={slotsError} onSelect={(slot) => { setSelectedSlot(slot); setBookingError(''); }} />
          </section>
        </>}

        {selectedService && selectedSlot && <CustomerDetailsForm value={customer} onChange={setCustomer} onContinue={review} />}
      </>}
      <footer className="public-booking-footer">Appointments by booking / studio</footer>
    </div>
  </main>;
}