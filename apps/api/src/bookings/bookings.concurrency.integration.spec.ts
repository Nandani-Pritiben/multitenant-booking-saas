import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

try {
  loadEnvFile('.env');
} catch {
  // CI can provide the same values through process environment variables.
}

const enabled = process.env.RUN_BOOKING_CONCURRENCY_TEST === '1';
const apiUrl = process.env.API_URL ?? 'http://127.0.0.1:4000';

describe.skipIf(!enabled)('public booking database concurrency', () => {
  let admin: SupabaseClient;
  let businessId = '';
  let serviceId = '';
  let providerId = '';
  let slug = '';
  let requestUrl = '';

  beforeAll(async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Set backend Supabase env vars to enable this integration test.');
    admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const fixtureSuffix = randomUUID().slice(0, 8);
    slug = `booking-race-${fixtureSuffix}`;
    const businessResult = await admin.from('businesses').insert({
      name: `Booking race ${fixtureSuffix}`,
      slug,
      timezone: 'UTC',
      status: 'active',
    }).select('id').single();
    if (businessResult.error) throw businessResult.error;
    businessId = businessResult.data.id;

    const serviceResult = await admin.from('services').insert({
      business_id: businessId,
      name: 'Concurrency test service',
      duration_minutes: 30,
      price: 0,
      currency: 'INR',
      status: 'active',
    }).select('id').single();
    if (serviceResult.error) throw serviceResult.error;
    serviceId = serviceResult.data.id;

    const providerResult = await admin.from('providers').insert({
      business_id: businessId,
      name: 'Concurrency test provider',
      status: 'active',
    }).select('id').single();
    if (providerResult.error) throw providerResult.error;
    providerId = providerResult.data.id;

    const targetDate = new Date();
    targetDate.setUTCDate(targetDate.getUTCDate() + 2);
    const dayOfWeek = targetDate.getUTCDay();
    const scheduleResult = await admin.from('provider_working_hours').insert({
      provider_id: providerId,
      day_of_week: dayOfWeek,
      start_time: '09:00',
      end_time: '11:00',
    });
    if (scheduleResult.error) throw scheduleResult.error;

    const date = targetDate.toISOString().slice(0, 10);
    requestUrl = `${apiUrl}/api/public/businesses/${slug}/bookings`;
    (globalThis as { concurrencyPayload?: object }).concurrencyPayload = {
      service_id: serviceId,
      provider_id: providerId,
      start_at: `${date}T09:00:00.000Z`,
      customer_name: 'Concurrent Customer',
      customer_email: `concurrent-${fixtureSuffix}@example.com`,
      customer_phone: '+15551234567',
    };
  }, 30_000);

  afterAll(async () => {
    if (!admin || !businessId) return;
    await admin.from('bookings').delete().eq('business_id', businessId);
    await admin.from('businesses').delete().eq('id', businessId);
  }, 30_000);

  it('creates exactly one row when two requests race for one slot', async () => {
    const payload = (globalThis as { concurrencyPayload?: object }).concurrencyPayload;
    if (!payload) throw new Error('Concurrency fixture was not initialized.');
    const responses = await Promise.all([
      fetch(requestUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
      fetch(requestUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
    ]);
    const statuses = responses.map((response) => response.status).sort((left, right) => left - right);
    expect(statuses).toEqual([201, 409]);

    const { data, error } = await admin.from('bookings').select('id').eq('business_id', businessId);
    if (error) throw error;
    expect(data).toHaveLength(1);
  }, 30_000);
});