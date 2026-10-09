import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { CurrentUserGuard } from '../../../dist/common/guards/current-user.guard.js';
import type { AuthenticatedRequest } from './current-user.guard.js';
import type { SupabaseService } from '../../supabase/supabase.service.js';

function requestContext(authorization?: string) {
  const request = { headers: { authorization } } as unknown as AuthenticatedRequest;
  const context = {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => ({ cookie: vi.fn() }) }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('CurrentUserGuard', () => {
  it('rejects requests without a bearer token', async () => {
    const verifyAccessToken = vi.fn();
    const guard = new CurrentUserGuard({ verifyAccessToken } as unknown as SupabaseService);
    const { context } = requestContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it('attaches the user returned by Supabase token verification', async () => {
    const user = { id: 'verified-user', email: 'owner@example.com' } as User;
    const verifyAccessToken = vi.fn().mockResolvedValue(user);
    const guard = new CurrentUserGuard({ verifyAccessToken } as unknown as SupabaseService);
    const { context, request } = requestContext('Bearer signed-access-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyAccessToken).toHaveBeenCalledWith('signed-access-token');
    expect(request.user).toBe(user);
  });

  it('rejects invalid or expired Supabase tokens', async () => {
    const verifyAccessToken = vi.fn().mockRejectedValue(new UnauthorizedException());
    const guard = new CurrentUserGuard({ verifyAccessToken } as unknown as SupabaseService);
    const { context } = requestContext('Bearer expired-token');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});