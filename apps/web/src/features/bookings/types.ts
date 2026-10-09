export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface BookingService {
  id: string;
  name: string;
  duration_minutes?: number;
  price?: number;
  currency?: string;
}

export interface BookingProvider {
  id: string;
  name: string;
}

export interface DashboardBooking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_id: string;
  provider_id: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  created_at?: string;
  services: BookingService | null;
  providers: BookingProvider | null;
}

export interface BookingDetail extends DashboardBooking {
  updated_at: string;
  businesses: { timezone: string } | null;
}

export interface TodayBookings {
  date: string;
  timezone: string;
  bookings: DashboardBooking[];
}

export interface DashboardSummary {
  todayBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
}

export interface BookingListQuery {
  date?: string;
  start_date?: string;
  end_date?: string;
  provider_id?: string;
  status?: string;
  search?: string;
}
