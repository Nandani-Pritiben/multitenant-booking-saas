import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { localDateAt, localDateTimeToEpoch, nextDate } from '../availability/availability.logic.js';

interface Membership {
  business_id: string;
  role: string;
}

export interface DashboardSummary {
  todayBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly supabase: SupabaseService) {}

  async getSummary(accessToken: string): Promise<DashboardSummary> {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);

    // Fetch business timezone
    const { data: business, error: bizError } = await client
      .from('businesses')
      .select('timezone')
      .eq('id', membership.business_id)
      .maybeSingle();
    if (bizError) this.fail(bizError);
    if (!business) throw new NotFoundException('Business not found');

    const timezone = (business as { timezone: string }).timezone;
    const now = Date.now();
    const today = localDateAt(now, timezone);
    const dayStart = localDateTimeToEpoch(today, '00:00', timezone);
    const dayEnd = localDateTimeToEpoch(nextDate(today), '00:00', timezone);
    if (dayStart === null || dayEnd === null) {
      throw new InternalServerErrorException('Could not resolve business local day');
    }

    const dayStartIso = new Date(dayStart).toISOString();
    const dayEndIso = new Date(dayEnd).toISOString();
    const nowIso = new Date(now).toISOString();

    // Today's bookings (any status, starting today in business timezone)
    const { count: todayBookings, error: todayErr } = await client
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', membership.business_id)
      .gte('start_at', dayStartIso)
      .lt('start_at', dayEndIso);
    if (todayErr) this.fail(todayErr);

    // Upcoming bookings: confirmed, starting after now (not just today)
    const { count: upcomingBookings, error: upcomingErr } = await client
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', membership.business_id)
      .eq('status', 'confirmed')
      .gt('start_at', nowIso);
    if (upcomingErr) this.fail(upcomingErr);

    // Completed bookings (all time)
    const { count: completedBookings, error: completedErr } = await client
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', membership.business_id)
      .eq('status', 'completed');
    if (completedErr) this.fail(completedErr);

    // Cancelled bookings (all time)
    const { count: cancelledBookings, error: cancelledErr } = await client
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', membership.business_id)
      .eq('status', 'cancelled');
    if (cancelledErr) this.fail(cancelledErr);

    return {
      todayBookings: todayBookings ?? 0,
      upcomingBookings: upcomingBookings ?? 0,
      completedBookings: completedBookings ?? 0,
      cancelledBookings: cancelledBookings ?? 0,
    };
  }

  private async getMembership(client: SupabaseClient): Promise<Membership> {
    const { data, error } = await client
      .from('business_members')
      .select('business_id,role')
      .maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException('No business membership found');
    const membership = data as unknown as Membership;
    if (!['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenException('Access denied');
    }
    return membership;
  }

  private fail(error: { code?: string }): never {
    if (error.code === 'PGRST116') throw new NotFoundException('Resource not found');
    throw new InternalServerErrorException('Unable to load dashboard data');
  }
}
