import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BillingService } from '../../billing/billing.service.js';
import type { AuthenticatedRequest } from './current-user.guard.js';

export const REQUIRE_PLAN_KEY = 'require_plan';

/** Decorate a controller/route to require a minimum plan. */
export const RequirePlan = (plan: 'pro') => SetMetadata(REQUIRE_PLAN_KEY, plan);

/**
 * Must be used AFTER CurrentUserGuard (which sets request.accessToken).
 * Reads the required plan from route metadata and checks the tenant's
 * effective subscription from the database.
 */
@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly billing: BillingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRE_PLAN_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No plan requirement on this route — allow
    if (!requiredPlan) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { effective_plan } = await this.billing.getSubscription(request.accessToken);

    if (requiredPlan === 'pro' && effective_plan !== 'pro') {
      throw new ForbiddenException(
        'This feature requires an active Pro subscription. Upgrade in Dashboard → Billing.',
      );
    }

    return true;
  }
}
