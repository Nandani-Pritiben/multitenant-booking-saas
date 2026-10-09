import { Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { CurrentUserGuard, type AuthenticatedRequest } from '../common/guards/current-user.guard.js';
import { BillingService } from './billing.service.js';
import { EntitlementsService } from './entitlements.service.js';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly entitlements: EntitlementsService,
  ) {}

  /** Public — plan catalogue */
  @Get('plans')
  getPlans() {
    return { success: true, data: this.billing.getPlans() };
  }

  /** Authenticated — current subscription (owner + admin) */
  @Get('subscription')
  @UseGuards(CurrentUserGuard)
  async getSubscription(@Req() req: AuthenticatedRequest) {
    return { success: true, data: await this.billing.getSubscription(req.accessToken) };
  }

  /** Authenticated — resolved entitlements (plan + limits) */
  @Get('entitlements')
  @UseGuards(CurrentUserGuard)
  async getEntitlements(@Req() req: AuthenticatedRequest) {
    const { plan, limits, businessId, timezone } = await this.entitlements.resolve(req.accessToken);
    const usage = await this.entitlements.getUsage(businessId, timezone);
    return { success: true, data: { plan, limits, usage } };
  }

  /** Authenticated — current usage counters */
  @Get('usage')
  @UseGuards(CurrentUserGuard)
  async getUsage(@Req() req: AuthenticatedRequest) {
    const { businessId, timezone } = await this.entitlements.resolve(req.accessToken);
    return { success: true, data: await this.entitlements.getUsage(businessId, timezone) };
  }

  /** Owner only — activate demo Pro */
  @Post('demo/activate')
  @UseGuards(CurrentUserGuard)
  @HttpCode(HttpStatus.CREATED)
  async activateDemo(@Req() req: AuthenticatedRequest) {
    return { success: true, data: await this.billing.activateDemo(req.accessToken) };
  }

  /** Owner only — cancel subscription */
  @Post('demo/cancel')
  @UseGuards(CurrentUserGuard)
  @HttpCode(HttpStatus.OK)
  async cancel(@Req() req: AuthenticatedRequest) {
    return { success: true, data: await this.billing.cancel(req.accessToken) };
  }
}
