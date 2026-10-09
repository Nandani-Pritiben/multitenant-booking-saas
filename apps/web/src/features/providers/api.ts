import { api } from '../../lib/api-client';
import type { Provider, ProviderInput, ProviderStatus, WorkingHour } from './types';

export const providersApi = {
  list: () => api.get<Provider[]>('/providers'),
  get: (id: string) => api.get<Provider>(`/providers/${id}`),
  create: (input: ProviderInput) => api.post<Provider>('/providers', input),
  update: (id: string, input: Partial<ProviderInput> & { status?: ProviderStatus }) =>
    api.patch<Provider>(`/providers/${id}`, input),
  delete: (id: string) => api.delete<{ deleted: true }>(`/providers/${id}`),
  getWorkingHours: (id: string) => api.get<WorkingHour[]>(`/providers/${id}/working-hours`),
  saveWorkingHours: (id: string, hours: Omit<WorkingHour, 'id' | 'provider_id'>[]) =>
    api.put<WorkingHour[]>(`/providers/${id}/working-hours`, { hours }),
};