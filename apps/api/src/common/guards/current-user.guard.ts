import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { User } from '@supabase/supabase-js';
import { SupabaseService } from '../../supabase/supabase.service.js';
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE, setAuthCookies } from '../auth-cookies.js';

export interface AuthenticatedRequest extends Request {
  user: User;
  accessToken: string;
}

@Injectable()
export class CurrentUserGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const bearerToken = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const accessToken = bearerToken ?? this.readCookie(request, AUTH_ACCESS_COOKIE);
    const refreshToken = this.readCookie(request, AUTH_REFRESH_COOKIE);
    if (!accessToken) throw new UnauthorizedException('Authentication required');

    try {
      request.accessToken = accessToken;
      request.user = await this.supabase.verifyAccessToken(accessToken);
      return true;
    } catch (error) {
      if (!refreshToken) throw error;
      const { data, error: refreshError } = await this.supabase.publicClient.auth.refreshSession({ refresh_token: refreshToken });
      if (refreshError || !data.session || !data.user) throw new UnauthorizedException('Session expired');
      request.accessToken = data.session.access_token;
      request.user = data.user;
      setAuthCookies(response, data.session);
      return true;
    }
  }

  private readCookie(request: Request, name: string): string | undefined {
    const cookie = request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : undefined;
  }
}