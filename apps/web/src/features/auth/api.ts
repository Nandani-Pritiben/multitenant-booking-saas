import { api } from '../../lib/api-client';

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: { name?: string };
}

export const authApi = {
  signup: (input: { name: string; email: string; password: string; businessName: string }) =>
    api.post<{ user: AuthUser; business: unknown }>('/auth/signup', input),
  login: (input: { email: string; password: string }) =>
    api.post<{ user: AuthUser }>('/auth/login', input),
  me: () => api.get<AuthUser>('/auth/me'),
  logout: () => api.post<{ message: string }>('/auth/logout'),
};