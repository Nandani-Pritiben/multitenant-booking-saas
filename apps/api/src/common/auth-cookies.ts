import type { Response } from 'express';
import type { Session } from '@supabase/supabase-js';

export const AUTH_ACCESS_COOKIE  = 'booking_access_token';
export const AUTH_REFRESH_COOKIE = 'booking_refresh_token';

// Both Vercel projects share the same *.vercel.app parent domain, so cookies
// are first-party. SameSite=Lax is sufficient and preferred.
const isProduction = process.env.NODE_ENV === 'production';

const commonOptions = {
  httpOnly:  true,
  secure:    isProduction,
  sameSite:  'lax' as const,
  path:      '/api',
};

export function setAuthCookies(response: Response, session: Session): void {
  response.cookie(AUTH_ACCESS_COOKIE, session.access_token, {
    ...commonOptions,
    maxAge: (session.expires_in ?? 3600) * 1000,
  });
  response.cookie(AUTH_REFRESH_COOKIE, session.refresh_token, {
    ...commonOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(response: Response): void {
  response.clearCookie(AUTH_ACCESS_COOKIE, commonOptions);
  response.clearCookie(AUTH_REFRESH_COOKIE, commonOptions);
}
