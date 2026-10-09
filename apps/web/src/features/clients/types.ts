import type { BookingStatus } from '../bookings/types';

export interface ClientSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  last_appointment: string | null;
  next_appointment: string | null;
}

export interface ClientDetail extends ClientSummary {
  notes: string | null;
  updated_at: string;
  lifetime_value: number | null;
}

export interface ClientBooking {
  id: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  created_at: string;
  services: {
    id: string;
    name: string;
    duration_minutes: number;
    price: number;
    currency: string;
  } | null;
  providers: {
    id: string;
    name: string;
  } | null;
}

export interface ClientListResponse {
  clients: ClientSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface ClientQuery {
  search?: string;
  page?: number;
  limit?: number;
}

export interface UpdateClientInput {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
}
