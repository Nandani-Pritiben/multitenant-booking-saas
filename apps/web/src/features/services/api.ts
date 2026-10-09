import { api } from '../../lib/api-client';
import type { Service, ServiceInput, ServiceStatus } from './types';

export const servicesApi = {
  list: () => api.get<Service[]>('/services'),
  get: (id: string) => api.get<Service>(`/services/${id}`),
  create: (input: ServiceInput) => api.post<Service>('/services', input),
  update: (id: string, input: Partial<ServiceInput> & { status?: ServiceStatus }) =>
    api.patch<Service>(`/services/${id}`, input),
  delete: (id: string) => api.delete<{ deleted: true }>(`/services/${id}`),
};