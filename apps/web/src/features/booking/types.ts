export interface PublicBusiness {
  id: string;
  name: string;
  slug: string;
  timezone: string;
}

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | string;
  currency: string;
}

export interface PublicProvider {
  id: string;
  name: string;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  start_at: string;
  end_at: string;
  provider_id: string;
  provider_name: string;
}

export interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
}

export interface CreateBookingInput {
  service_id: string;
  provider_id: string;
  start_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
}

export interface BookingRecord extends CreateBookingInput {
  id: string;
  business_id: string;
  end_at: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  created_at: string;
}