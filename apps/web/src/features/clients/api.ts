import { api } from '../../lib/api-client';
import type {
  ClientBooking,
  ClientDetail,
  ClientListResponse,
  ClientQuery,
  UpdateClientInput,
} from './types';

export const clientsApi = {
  list: (query: ClientQuery = {}) => {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.page)   params.set('page',   String(query.page));
    if (query.limit)  params.set('limit',  String(query.limit));
    const qs = params.toString();
    return api.get<ClientListResponse>(`/clients${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) => api.get<ClientDetail>(`/clients/${id}`),

  update: (id: string, input: UpdateClientInput) =>
    api.patch<ClientDetail>(`/clients/${id}`, input),

  bookings: (id: string) => api.get<ClientBooking[]>(`/clients/${id}/bookings`),
};
