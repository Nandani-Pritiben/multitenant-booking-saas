import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { AvailabilityService } from '../availability/availability.service.js';
import { BookingsService } from '../../dist/bookings/bookings.service.js';
import type { BookingEmailService } from './booking-email.service.js';
import type { SupabaseService } from '../supabase/supabase.service.js';
import { CreateBookingDto } from '../../dist/bookings/dto/create-booking.dto.js';
import { SlotUnavailableException } from '../../dist/bookings/slot-unavailable.exception.js';

const business = { id: 'business-a', name: 'Studio A', slug: 'studio-a', timezone: 'UTC' };
const service = { id: 'service-a', duration_minutes: 30 };
const provider = { id: 'provider-a' };
const requestedStart = '2026-10-12T10:00:00.000Z';
const dto = {
  service_id: 'service-a',
  provider_id: 'provider-a',
  start_at: requestedStart,
  customer_name: 'Customer One',
  customer_email: 'customer@example.com',
  customer_phone: '+15551234567',
};

function makeSingleQuery(result: { data: unknown; error: { code?: string } | null }) {
  const query: Record<string, (...args: unknown[]) => unknown> = {};
  query.select = () => query;
  query.eq = () => query;
  query.maybeSingle = async () => result;
  query.single = async () => result;
  return query;
}

function createService(insertResult?: (inserted: Record<string, unknown>) => { data: unknown; error: { code?: string } | null }) {
  const inserts: Record<string, unknown>[] = [];
  const sendConfirmation = vi.fn().mockResolvedValue(true);
  let bookingInsertCount = 0;
  const admin = {
    from: (table: string) => {
      if (table === 'services') return makeSingleQuery({ data: service, error: null });
      if (table === 'providers') return makeSingleQuery({ data: provider, error: null });
      const query: Record<string, (...args: unknown[]) => unknown> = {};
      query.insert = (row: Record<string, unknown>) => {
        inserts.push(row);
        bookingInsertCount += 1;
        return query;
      };
      query.select = () => query;
      query.single = async () => insertResult
        ? insertResult(inserts.at(-1) ?? {})
        : { data: { ...inserts.at(-1), id: `booking-${bookingInsertCount}` }, error: null };
      return query;
    },
  };
  const getBusiness = vi.fn(async () => business);
  const getAvailability = vi.fn(async () => ({
    date: '2026-10-12',
    timezone: 'UTC',
    slots: [{ start: '10:00', end: '10:30', start_at: requestedStart, end_at: '2026-10-12T10:30:00.000Z', provider_id: 'provider-a', provider_name: 'Provider A' }],
  }));
  const bookings = new BookingsService(
    { get admin() { return admin; } } as unknown as SupabaseService,
    { getBusiness, getAvailability } as unknown as AvailabilityService,
    { sendConfirmation } as unknown as BookingEmailService,
  );
  return { bookings, inserts, getAvailability, sendConfirmation };
}

describe('BookingsService', () => {
  it('derives tenant and end time from the business, service, and selected slot', async () => {
    const { bookings, inserts, getAvailability, sendConfirmation } = createService();
    const result = await bookings.createPublic('studio-a', dto as CreateBookingDto);

    expect(getAvailability).toHaveBeenCalledWith({
      business_slug: 'studio-a', service_id: 'service-a', provider_id: 'provider-a', date: '2026-10-12',
    });
    expect(inserts[0]).toMatchObject({
      business_id: 'business-a',
      service_id: 'service-a',
      provider_id: 'provider-a',
      start_at: requestedStart,
      end_at: '2026-10-12T10:30:00.000Z',
      status: 'confirmed',
    });
    expect(result).toMatchObject({ business_id: 'business-a', end_at: '2026-10-12T10:30:00.000Z' });
    expect(sendConfirmation).toHaveBeenCalledWith(expect.objectContaining({
      to: dto.customer_email,
      bookingId: result.id,
      timezone: 'UTC',
    }));
  });

  it('rejects a service not returned from the requested business', async () => {
    const admin = { from: () => makeSingleQuery({ data: null, error: null }) };
    const bookings = new BookingsService(
      { get admin() { return admin; } } as unknown as SupabaseService,
      { getBusiness: vi.fn(async () => business) } as unknown as AvailabilityService,
      { sendConfirmation: vi.fn().mockResolvedValue(true) } as unknown as BookingEmailService,
    );

    await expect(bookings.createPublic('studio-a', dto as CreateBookingDto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps a database exclusion violation to slot unavailable', async () => {
    const { bookings } = createService(() => ({ data: null, error: { code: '23P01' } }));

    await expect(bookings.createPublic('studio-a', dto as CreateBookingDto)).rejects.toBeInstanceOf(SlotUnavailableException);
  });

  it('explains when the hosted Phase 5 booking columns have not been applied', async () => {
    const { bookings } = createService(() => ({ data: null, error: { code: '42703' } }));

    await expect(bookings.createPublic('studio-a', dto as CreateBookingDto)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('allows exactly one result when concurrent inserts collide at the database constraint', async () => {
    let committedRows = 0;
    const { bookings } = createService(() => {
      if (committedRows > 0) return { data: null, error: { code: '23P01' } };
      committedRows += 1;
      return { data: { id: 'only-booking', business_id: 'business-a' }, error: null };
    });

    const results = await Promise.allSettled([
      bookings.createPublic('studio-a', dto as CreateBookingDto),
      bookings.createPublic('studio-a', dto as CreateBookingDto),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(committedRows).toBe(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status === 'rejected' && rejected.reason).toBeInstanceOf(SlotUnavailableException);
  });

  it('queries today using midnight boundaries in the business timezone', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-12T20:00:00.000Z'));
    const filters: { method: string; value: unknown }[] = [];
    const results: Record<string, unknown> = {
      business_members: { data: { business_id: 'business-a', role: 'owner' }, error: null },
      businesses: { data: { timezone: 'Asia/Kolkata' }, error: null },
      bookings: { data: [], error: null },
    };
    const from = (table: string) => {
      const query: Record<string, (...args: unknown[]) => unknown> = {};
      query.select = () => query;
      query.eq = () => query;
      query.gte = (_column: unknown, value: unknown) => { filters.push({ method: 'gte', value }); return query; };
      query.lt = (_column: unknown, value: unknown) => { filters.push({ method: 'lt', value }); return query; };
      query.order = async () => results[table];
      query.maybeSingle = async () => results[table];
      return query;
    };
    const client = { from } as unknown as SupabaseClient;
    const bookings = new BookingsService(
      { forUser: () => client } as unknown as SupabaseService,
      {} as AvailabilityService,
      { sendConfirmation: vi.fn() } as unknown as BookingEmailService,
    );

    try {
      const result = await bookings.listTodayForMember('access-token');
      expect(result).toMatchObject({ date: '2026-10-13', timezone: 'Asia/Kolkata', bookings: [] });
      expect(filters).toEqual([
        { method: 'gte', value: '2026-10-12T18:30:00.000Z' },
        { method: 'lt', value: '2026-10-13T18:30:00.000Z' },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });
});