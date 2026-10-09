import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { BillingService } from './billing.service.js';
import { getLimits, type PlanLimits } from './plan-limits.js';
import type { Plan } from './billing.service.js';

export interface UsageCounters {
  services_count:         number;
  providers_count:        number;
  monthly_bookings_count: number;
  month_label:            string; // e.g. "October 2026"
}

export interface EntitlementsResponse {
  plan:    Plan;
  limits:  PlanLimits;
  usage:   UsageCounters;
}

@Injectable()
export class EntitlementsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly billing: BillingService,
  ) {}

  /** Resolve effective plan + limits for the current user's tenant. */
  async resolve(accessToken: string): Promise<{ plan: Plan; limits: PlanLimits; businessId: string; timezone: string }> {
    const { effective_plan } = await this.billing.getSubscription(accessToken);
    const limits = getLimits(effective_plan);

    // Get business id + timezone from the user's JWT-scoped client
    const client = this.supabase.forUser(accessToken);
    const { data, error } = await client
      .from('business_members')
      .select('business_id, businesses(timezone)')
      .maybeSingle();
    if (error || !data) throw new InternalServerErrorException('Unable to resolve tenant');
    const row = data as unknown as { business_id: string; businesses: { timezone: string } | null };

    return {
      plan:       effective_plan,
      limits,
      businessId: row.business_id,
      timezone:   row.businesses?.timezone ?? 'UTC',
    };
  }

  /** Get current usage counts for a tenant. */
  async getUsage(businessId: string, timezone: string): Promise<UsageCounters> {
    // Services count
    const { count: servicesCount } = await this.supabase.admin
      .from('services')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId);

    // Providers count (active only)
    const { count: providersCount } = await this.supabase.admin
      .from('providers')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'active');

    // Monthly bookings — count confirmed/completed/no_show in the current calendar month
    // in the business's timezone
    const now = new Date();
    const monthLabel = new Intl.DateTimeFormat('en', {
      month: 'long', year: 'numeric', timeZone: timezone,
    }).format(now);

    // Get the first day of the current month in business timezone
    const tzParts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: timezone,
    }).formatToParts(now);
    const y = tzParts.find((p) => p.type === 'year')?.value ?? String(now.getUTCFullYear());
    const m = tzParts.find((p) => p.type === 'month')?.value ?? '01';
    const monthStart = new Date(`${y}-${m}-01T00:00:00`);
    // Compute the start of month in business tz as UTC
    const monthStartUtc = this.toUtcFromTz(`${y}-${m}-01`, '00:00', timezone);
    const monthEndDate = new Date(monthStartUtc);
    monthEndDate.setMonth(monthEndDate.getMonth() + 1);

    void monthStart; // suppress unused warning

    const { count: monthlyBookingsCount } = await this.supabase.admin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .in('status', ['confirmed', 'completed', 'no_show'])
      .gte('created_at', new Date(monthStartUtc).toISOString())
      .lt('created_at', monthEndDate.toISOString());

    return {
      services_count:         servicesCount ?? 0,
      providers_count:        providersCount ?? 0,
      monthly_bookings_count: monthlyBookingsCount ?? 0,
      month_label:            monthLabel,
    };
  }

  /**
   * Assert monthly booking limit for a business (used by the public booking flow).
   * Fetches the business's subscription from DB and checks against the limit.
   */
  async assertMonthlyBookingLimit(businessId: string, timezone: string): Promise<void> {
    // Resolve effective plan for this business via admin client
    const now = new Date().toISOString();
    const { data: sub } = await this.supabase.admin
      .from('subscriptions')
      .select('plan,status,expires_at')
      .eq('tenant_id', businessId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const isProActive =
      sub !== null &&
      (sub as { plan: string; status: string; expires_at: string | null }).plan === 'pro' &&
      (sub as { plan: string; status: string; expires_at: string | null }).status === 'active' &&
      (!(sub as { expires_at: string | null }).expires_at || (sub as { expires_at: string }).expires_at > now);

    const plan = isProActive ? 'pro' : 'free';
    const limits = getLimits(plan as 'free' | 'pro');

    await this.assertLimit(businessId, 'monthly_bookings', limits, timezone, plan as 'free' | 'pro');
  }

  /**
   * Assert a hard limit is not exceeded.
   * Throws ForbiddenException with PLAN_LIMIT_REACHED code if over.
   */
  async assertLimit(
    businessId: string,
    resource: 'services' | 'providers' | 'monthly_bookings',
    limits: PlanLimits,
    timezone: string,
    plan: Plan,
  ): Promise<void> {
    const maxKey = `${resource}_max` as keyof PlanLimits;
    const max = limits[maxKey] as number | null;
    if (max === null) return; // unlimited

    const usage = await this.getUsage(businessId, timezone);
    const countKey = `${resource}_count` as keyof UsageCounters;
    const current = usage[countKey] as number;

    const labels: Record<string, string> = {
      services:         'services',
      providers:        'providers',
      monthly_bookings: 'bookings this month',
    };

    if (current >= max) {
      throw new ForbiddenException({
        message: `You have reached the ${plan} plan limit of ${max} ${labels[resource]}. Upgrade to Pro to continue.`,
        code:    'PLAN_LIMIT_REACHED',
        resource,
        limit:   max,
        current,
      });
    }
  }

  /**
   * Assert a boolean feature flag is enabled.
   * Throws ForbiddenException with PLAN_FEATURE_REQUIRED code if not.
   */
  assertFeature(feature: keyof PlanLimits, limits: PlanLimits, plan: Plan): void {
    if (!limits[feature]) {
      throw new ForbiddenException({
        message: `This feature is not available on the ${plan} plan. Upgrade to Pro to unlock it.`,
        code:    'PLAN_FEATURE_REQUIRED',
        feature: String(feature),
        required_plan: 'pro',
      });
    }
  }

  /** Simple UTC timestamp from a local date + time in a given timezone. */
  private toUtcFromTz(date: string, time: string, timezone: string): number {
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute]     = time.split(':').map(Number);
    const targetLocal = Date.UTC(year, month - 1, day, hour, minute);
    // Iterative correction for DST
    let candidate = targetLocal;
    for (let i = 0; i < 5; i++) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).formatToParts(new Date(candidate));
      const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
      const actual = Date.UTC(Number(v.year), Number(v.month) - 1, Number(v.day), Number(v.hour), Number(v.minute));
      if (actual === targetLocal) return candidate;
      candidate += targetLocal - actual;
    }
    return candidate;
  }
}
