import { api } from '../../lib/api-client';
import type { AvailabilitySlot, BookingRecord, CreateBookingInput, PublicBusiness, PublicProvider, PublicService } from './types';

export const bookingApi = {
  business: (slug: string) => api.get<PublicBusiness>(`/public/businesses/${encodeURIComponent(slug)}`),
  services: (slug: string) => api.get<PublicService[]>(`/public/businesses/${encodeURIComponent(slug)}/services`),
  providers: (slug: string) => api.get<PublicProvider[]>(`/public/businesses/${encodeURIComponent(slug)}/providers`),
  availability: (slug: string, serviceId: string, date: string, providerId?: string) => {
    const query = new URLSearchParams({ service_id: serviceId, date });
    if (providerId) query.set('provider_id', providerId);
    return api.get<{ date: string; timezone: string; slots: AvailabilitySlot[] }>(
      `/public/businesses/${encodeURIComponent(slug)}/availability?${query.toString()}`,
    );
  },
  createBooking: (slug: string, input: CreateBookingInput) =>
    api.post<BookingRecord>(`/public/businesses/${encodeURIComponent(slug)}/bookings`, input),
};