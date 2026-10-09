import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { ClientQueryDto } from './dto/client-query.dto.js';
import type { UpdateClientDto } from './dto/update-client.dto.js';

interface Membership {
  business_id: string;
  role: string;
}

interface DbError {
  code?: string;
}

const DEFAULT_PAGE  = 1;
const DEFAULT_LIMIT = 20;

@Injectable()
export class ClientsService {
  constructor(private readonly supabase: SupabaseService) {}

  // ── List clients (paginated, searchable) ────────────────────────
  async list(accessToken: string, query: ClientQueryDto) {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);

    const page  = Math.max(query.page  ?? DEFAULT_PAGE,  1);
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, 100);
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    // Build base query with aggregate stats via a view-style select.
    // PostgREST supports embedded resource counts through !inner joins,
    // but counting with filters is done more reliably via a raw select
    // that we compute in two steps:
    // 1. Fetch clients with booking counts aggregated via a subquery column.
    // 2. PostgREST doesn't support subquery columns directly, so we use
    //    a separate aggregated query per client — but that's N+1.
    //
    // To avoid N+1 we use the admin client for the aggregated stats query
    // (which bypasses RLS) after confirming membership. We ALWAYS scope
    // stats queries by the already-verified business_id.

    let clientsQuery = client
      .from('clients')
      .select('id,name,email,phone,created_at', { count: 'exact' })
      .eq('business_id', membership.business_id)
      .order('name', { ascending: true })
      .range(from, to);

    if (query.search) {
      const term = `%${query.search.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      clientsQuery = clientsQuery.or(
        `name.ilike.${term},email.ilike.${term},phone.ilike.${term}`,
      );
    }

    const { data: rows, error, count } = await clientsQuery;
    if (error) this.fail(error);
    if (!rows || rows.length === 0) {
      return { clients: [], total: count ?? 0, page, limit };
    }

    // Batch-fetch booking stats for all returned client ids using admin client
    // to run a single aggregated query scoped by business_id.
    const clientIds = rows.map((r) => (r as { id: string }).id);
    const { data: stats, error: statsErr } = await this.supabase.admin
      .from('bookings')
      .select('client_id,status,start_at')
      .eq('business_id', membership.business_id)
      .in('client_id', clientIds);
    if (statsErr) this.fail(statsErr);

    const now = new Date().toISOString();

    // Build a stats map keyed by client_id
    const statsMap = new Map<
      string,
      { total: number; completed: number; cancelled: number; last: string | null; next: string | null }
    >();
    for (const row of rows) {
      statsMap.set((row as { id: string }).id, {
        total: 0, completed: 0, cancelled: 0, last: null, next: null,
      });
    }
    for (const b of stats ?? []) {
      const booking = b as { client_id: string; status: string; start_at: string };
      if (!booking.client_id) continue;
      const s = statsMap.get(booking.client_id);
      if (!s) continue;
      s.total++;
      if (booking.status === 'completed') s.completed++;
      if (booking.status === 'cancelled') s.cancelled++;
      if (booking.start_at < now) {
        if (!s.last || booking.start_at > s.last) s.last = booking.start_at;
      } else {
        if (!s.next || booking.start_at < s.next) s.next = booking.start_at;
      }
    }

    const clients = rows.map((row) => {
      const r = row as { id: string; name: string; email: string | null; phone: string | null; created_at: string };
      const s = statsMap.get(r.id);
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        created_at: r.created_at,
        total_bookings:     s?.total     ?? 0,
        completed_bookings: s?.completed ?? 0,
        cancelled_bookings: s?.cancelled ?? 0,
        last_appointment:   s?.last      ?? null,
        next_appointment:   s?.next      ?? null,
      };
    });

    return { clients, total: count ?? 0, page, limit };
  }

  // ── Get single client with full stats ───────────────────────────
  async get(id: string, accessToken: string) {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);

    const { data, error } = await client
      .from('clients')
      .select('id,name,email,phone,notes,created_at,updated_at')
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException('Client not found');

    // Fetch booking stats via admin — already scoped by business_id
    const now = new Date().toISOString();
    const { data: bookings, error: bErr } = await this.supabase.admin
      .from('bookings')
      .select('id,status,start_at,end_at,services(name,price,currency,duration_minutes),providers(name)')
      .eq('business_id', membership.business_id)
      .eq('client_id', id);
    if (bErr) this.fail(bErr);

    let total = 0, completed = 0, cancelled = 0;
    let last: string | null = null;
    let next: string | null = null;
    let lifetimeValue = 0;

    for (const b of bookings ?? []) {
      const booking = b as unknown as {
        id: string; status: string; start_at: string; end_at: string;
        services: { name: string; price: number; currency: string; duration_minutes: number } | null;
        providers: { name: string } | null;
      };
      total++;
      if (booking.status === 'completed') {
        completed++;
        if (booking.services?.price) lifetimeValue += Number(booking.services.price);
      }
      if (booking.status === 'cancelled') cancelled++;
      if (booking.start_at < now) {
        if (!last || booking.start_at > last) last = booking.start_at;
      } else {
        if (!next || booking.start_at < next) next = booking.start_at;
      }
    }

    const r = data as {
      id: string; name: string; email: string | null; phone: string | null;
      notes: string | null; created_at: string; updated_at: string;
    };

    return {
      ...r,
      total_bookings:     total,
      completed_bookings: completed,
      cancelled_bookings: cancelled,
      last_appointment:   last,
      next_appointment:   next,
      lifetime_value:     lifetimeValue > 0 ? lifetimeValue : null,
    };
  }

  // ── Update client ────────────────────────────────────────────────
  async update(id: string, accessToken: string, dto: UpdateClientDto) {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);

    // Verify ownership first
    const { data: existing, error: readErr } = await client
      .from('clients')
      .select('id')
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .maybeSingle();
    if (readErr) this.fail(readErr);
    if (!existing) throw new NotFoundException('Client not found');

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (dto.name  !== undefined) updates.name  = dto.name;
    if (dto.email !== undefined) updates.email = dto.email || null;
    if (dto.phone !== undefined) updates.phone = dto.phone || null;
    if (dto.notes !== undefined) updates.notes = dto.notes || null;

    const { data, error } = await client
      .from('clients')
      .update(updates)
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .select('id,name,email,phone,notes,updated_at')
      .single();
    if (error) this.fail(error);
    return data;
  }

  // ── Booking history for a client ─────────────────────────────────
  async getBookings(clientId: string, accessToken: string) {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);

    // Verify client belongs to this business
    const { data: existing, error: readErr } = await client
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('business_id', membership.business_id)
      .maybeSingle();
    if (readErr) this.fail(readErr);
    if (!existing) throw new NotFoundException('Client not found');

    // Fetch bookings — scoped to business AND client
    const { data, error } = await client
      .from('bookings')
      .select(
        'id,start_at,end_at,status,created_at,services(id,name,duration_minutes,price,currency),providers(id,name)',
      )
      .eq('business_id', membership.business_id)
      .eq('client_id', clientId)
      .order('start_at', { ascending: false });
    if (error) this.fail(error);
    return data ?? [];
  }

  // ── Used by BookingsService to resolve/create client on booking ──
  async upsertForBooking(
    businessId: string,
    name: string,
    email: string,
    phone: string,
  ): Promise<string> {
    // Use admin client — this runs in the context of a public booking creation
    // where there is no user JWT. businessId is always resolved from the slug
    // by the BookingsService, never from user input.
    const { data, error } = await this.supabase.admin.rpc('upsert_client_for_booking', {
      p_business_id: businessId,
      p_name:        name,
      p_email:       email,
      p_phone:       phone,
    });
    if (error) {
      // Non-fatal: log and continue — booking must succeed even if client upsert fails
      console.error('upsert_client_for_booking failed:', error.message);
      return '';
    }
    return (data as string) ?? '';
  }

  // ── Private helpers ──────────────────────────────────────────────
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

  private fail(error: DbError): never {
    if (error.code === 'PGRST116') throw new NotFoundException('Client not found');
    if (error.code === '23505')    throw new NotFoundException('A client with that email already exists for this business');
    throw new InternalServerErrorException('Unable to complete client request');
  }
}
