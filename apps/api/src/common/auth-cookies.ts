import type { Response } from 'express';
import type { Session } from '@supabase/supabase-js';

export const AUTH_ACCESS_COOKIE = 'booking_access_token';
export const AUTH_REFRESH_COOKIE = 'booking_refresh_token';

// In production, frontend (Vercel) and backend (Render) are on different domains.
// Cookies must be SameSite=None + Secure to work cross-origin.
// In development (same host via Vite proxy), SameSite=Lax is fine.
const isProduction = process.env.NODE_ENV === 'production';

const commonOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  path: '/api',
};

export function setAuthCookies(response: Response, session: Session) {
  response.cookie(AUTH_ACCESS_COOKIE, session.access_token, {
    ...commonOptions,
    maxAge: (session.expires_in ?? 3600) * 1000,
  });
  response.cookie(AUTH_REFRESH_COOKIE, session.refresh_token, {
    ...commonOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(response: Response) {
  response.clearCookie(AUTH_ACCESS_COOKIE, commonOptions);
  response.clearCookie(AUTH_REFRESH_COOKIE, commonOptions);
}
