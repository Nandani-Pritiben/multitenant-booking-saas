import { api } from '../../lib/api-client';

export interface Business {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  email: string | null;
  phone: string | null;
  status: string;
}

export const businessApi = {
  getMe: () => api.get<Business | null>('/businesses/me'),
  create: (input: { name: string; slug: string; timezone: string }) => api.post<Business>('/businesses', input),
  updateMe: (input: Partial<Pick<Business, 'name' | 'slug' | 'timezone' | 'email' | 'phone'>>) =>
    api.patch<Business>('/businesses/me', input),
};