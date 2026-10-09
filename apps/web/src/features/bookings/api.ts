import { api } from '../../lib/api-client';
import type {
  BookingDetail,
  BookingListQuery,
  DashboardBooking,
  DashboardSummary,
  TodayBookings,
} from './types';

export const bookingsApi = {
  list: (query: BookingListQuery = {}) => {
    const params = new URLSearchParams();
    if (query.date) params.set('date', query.date);
    if (query.start_date) params.set('start_date', query.start_date);
    if (query.end_date) params.set('end_date', query.end_date);
    if (query.provider_id) params.set('provider_id', query.provider_id);
    if (query.status) params.set('status', query.status);
    if (query.search) params.set('search', query.search);
    const qs = params.toString();
    return api.get<DashboardBooking[]>(`/bookings${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) => api.get<BookingDetail>(`/bookings/${id}`),

  today: () => api.get<TodayBookings>('/bookings/today'),

  updateStatus: (id: string, status: string) =>
    api.patch<{ id: string; status: string; updated_at: string }>(`/bookings/${id}/status`, {
      status,
    }),

  cancel: (id: string) =>
    api.patch<{ id: string; status: string }>(`/bookings/${id}/cancel`, {}),
};

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>('/dashboard/summary'),
};
