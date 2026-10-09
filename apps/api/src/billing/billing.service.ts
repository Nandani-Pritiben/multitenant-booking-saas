import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service.js';

export type Plan   = 'free' | 'pro';
export type SubStatus = 'active' | 'cancelled' | 'expired';

export interface Subscription {
  id: string;
  tenant_id: string;
  plan: Plan;
  status: SubStatus;
  started_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EffectiveSubscription {
  subscription: Subscription | null;
  effective_plan: Plan;
  is_pro_active: boolean;
}

interface Membership {
  business_id: string;
  role: string;
}

const PLAN_DURATION_DAYS = 30;

// Static plan catalogue — never trust plan data from the frontend
export const PLANS = [
  {
    id: 'free' as Plan,
    name: 'Free',
    price_display: '₹0 / month',
    features: [
      { text: 'Public booking page',                included: true  },
      { text: '3 services',                         included: true  },
      { text: '2 providers / staff',                included: true  },
      { text: '50 bookings per month',              included: true  },
      { text: 'Working hours configuration',        included: true  },
      { text: 'Booking confirmation emails',        included: true  },
      { text: 'Dashboard summary',                  included: true  },
      { text: 'Double-booking prevention',          included: true  },
      { text: 'Cancel & status management',         included: true  },
      { text: 'Booking list & filters',             included: true  },
      { text: 'Basic client list',                  included: true  },
      { text: 'Calendar view',                      included: true  },
      { text: 'Full CRM (notes, metrics, history)', included: false },
      { text: 'Unlimited services',                 included: false },
      { text: 'Unlimited providers',                included: false },
      { text: 'Unlimited bookings',                 included: false },
      { text: 'Booking status change emails',       included: false },
      { text: 'Automated 24-hour reminders',        included: false },
      { text: 'Advanced analytics',                 included: false },
    ],
  },
  {
    id: 'pro' as Plan,
    name: 'Pro',
    price_display: '₹999 / month',
    features: [
      { text: 'Everything in Free',                    included: true  },
      { text: 'Unlimited services',                    included: true  },
      { text: 'Unlimited providers / staff',           included: true  },
      { text: 'Unlimited bookings',                    included: true  },
      { text: 'Full CRM — history, notes & metrics',  included: true  },
      { text: 'Advanced calendar (day/week/month)',    included: true  },
      { text: 'Booking status change emails',          included: true  },
      { text: 'Priority support',                      included: true  },
      { text: 'Automated 24-hour reminders',           included: false, soon: true },
      { text: 'Advanced analytics & reports',          included: false, soon: true },
      { text: 'Advanced team management',              included: false, soon: true },
    ],
    demo_note: 'DEMO MODE — NO REAL PAYMENTS. Activate for 30 days free.',
  },
];

@Injectable()
export class BillingService {
  constructor(private readonly supabase: SupabaseService) {}

  // ── Read current subscription ─────────────────────────────────────

  async getSubscription(accessToken: string): Promise<EffectiveSubscription> {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client, ['owner', 'admin']);

    const { data, error } = await client
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', membership.business_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) this.fail(error);

    const sub = data as Subscription | null;
    const now = new Date().toISOString();

    // If subscription has expired in the DB but status not yet updated, treat as free
    if (sub && sub.plan === 'pro' && sub.expires_at && sub.expires_at < now) {
      // Mark it expired in the background — fire-and-forget, never block the response
      void this.supabase.admin
        .from('subscriptions')
        .update({ status: 'expired', updated_at: now })
        .eq('id', sub.id);

      return { subscription: { ...sub, status: 'expired' }, effective_plan: 'free', is_pro_active: false };
    }

    const isProActive = sub !== null && sub.plan === 'pro' && sub.status === 'active';
    return {
      subscription:   sub,
      effective_plan: isProActive ? 'pro' : 'free',
      is_pro_active:  isProActive,
    };
  }

  // ── Activate demo Pro ─────────────────────────────────────────────

  async activateDemo(accessToken: string): Promise<Subscription> {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client, ['owner']); // owners only

    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAt = new Date(now.getTime() + PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Check for an already-active pro subscription
    const { data: existing } = await this.supabase.admin
      .from('subscriptions')
      .select('id,status,expires_at')
      .eq('tenant_id', membership.business_id)
      .eq('plan', 'pro')
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      const sub = existing as { id: string; status: string; expires_at: string | null };
      // If it hasn't expired yet, reject
      if (!sub.expires_at || sub.expires_at > nowIso) {
        throw new ConflictException('An active Pro subscription already exists for this tenant');
      }
      // If it logically expired, mark it so and allow re-activation
      await this.supabase.admin
        .from('subscriptions')
        .update({ status: 'expired', updated_at: nowIso })
        .eq('id', sub.id);
    }

    // Insert new subscription using admin client (bypasses RLS)
    // tenant_id is always from the authenticated membership — never from request body
    const { data, error } = await this.supabase.admin
      .from('subscriptions')
      .insert({
        tenant_id:  membership.business_id,
        plan:       'pro',
        status:     'active',
        started_at: nowIso,
        expires_at: expiresAt,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23P01') {
        throw new ConflictException('A conflicting active subscription already exists');
      }
      this.fail(error);
    }
    return data as Subscription;
  }

  // ── Cancel subscription ───────────────────────────────────────────

  async cancel(accessToken: string): Promise<Subscription> {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client, ['owner']); // owners only

    const { data: existing, error: readErr } = await this.supabase.admin
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', membership.business_id)
      .eq('plan', 'pro')
      .eq('status', 'active')
      .maybeSingle();
    if (readErr) this.fail(readErr);
    if (!existing) throw new NotFoundException('No active Pro subscription found');

    const nowIso = new Date().toISOString();
    const { data, error } = await this.supabase.admin
      .from('subscriptions')
      .update({ status: 'cancelled', expires_at: nowIso, updated_at: nowIso })
      .eq('id', (existing as Subscription).id)
      .select('*')
      .single();
    if (error) this.fail(error);
    return data as Subscription;
  }

  // ── Plans catalogue (public, no auth) ────────────────────────────

  getPlans() {
    return PLANS;
  }

  // ── Private helpers ───────────────────────────────────────────────

  private async getMembership(
    client: SupabaseClient,
    allowedRoles: string[],
  ): Promise<Membership> {
    const { data, error } = await client
      .from('business_members')
      .select('business_id,role')
      .maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException('No business membership found');
    const m = data as unknown as Membership;
    if (!allowedRoles.includes(m.role)) {
      throw new ForbiddenException(
        `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
      );
    }
    return m;
  }

  private fail(error: { code?: string; message?: string }): never {
    if (error.code === 'PGRST116') throw new NotFoundException('Subscription not found');
    throw new InternalServerErrorException('Unable to process billing request');
  }
}
