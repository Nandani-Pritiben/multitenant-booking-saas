import { NotFoundException, BadRequestException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it, vi } from 'vitest';
import { ProvidersService } from '../../dist/providers/providers.service.js';
import type { SupabaseService } from '../supabase/supabase.service.js';
import { CreateProviderDto } from '../../dist/providers/dto/create-provider.dto.js';
import { UpdateProviderDto } from '../../dist/providers/dto/update-provider.dto.js';
import { WorkingHoursDto } from '../../dist/providers/dto/working-hours.dto.js';

function makeQuery(result: { data: unknown; error: { code?: string } | null }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'eq', 'order', 'insert', 'update', 'delete']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.single = vi.fn(async () => result);
  builder.order = vi.fn(async () => result);
  return builder;
}

function setup(results: Record<string, { data: unknown; error: { code?: string } | null }>) {
  const queries = Object.fromEntries(Object.entries(results).map(([table, result]) => [table, makeQuery(result)]));
  const from = vi.fn((table: string) => queries[table]);
  const rpc = vi.fn(async () => ({ error: null }));
  const client = { from, rpc } as unknown as SupabaseClient;
  const forUser = vi.fn(() => client);
  return {
    service: new ProvidersService({ forUser } as unknown as SupabaseService),
    forUser,
    queries,
    rpc,
  };
}

const membership = { data: { business_id: 'business-a', role: 'owner' }, error: null };

describe('ProvidersService', () => {
  it('creates a provider using the authenticated membership business', async () => {
    const provider = { id: 'provider-a', business_id: 'business-a', name: 'John Doe' };
    const { service, queries } = setup({
      business_members: membership,
      providers: { data: provider, error: null },
    });
    const dto = plainToInstance(CreateProviderDto, { name: 'John Doe' });

    await expect(service.create(dto, 'access-token')).resolves.toEqual(provider);
    expect(queries.providers.insert).toHaveBeenCalledWith(expect.objectContaining({ business_id: 'business-a' }));
  });

  it('hides a provider belonging to another tenant', async () => {
    const { service, queries } = setup({
      business_members: membership,
      providers: { data: null, error: null },
    });

    await expect(service.get('provider-b', 'access-token')).rejects.toBeInstanceOf(NotFoundException);
    expect(queries.providers.eq).toHaveBeenCalledWith('business_id', 'business-a');
  });

  it('updates a provider only within the caller business', async () => {
    const provider = { id: 'provider-a', business_id: 'business-a', status: 'inactive' };
    const { service, queries } = setup({
      business_members: membership,
      providers: { data: provider, error: null },
    });
    const dto = plainToInstance(UpdateProviderDto, { status: 'inactive' });

    await expect(service.update('provider-a', dto, 'access-token')).resolves.toEqual(provider);
    expect(queries.providers.eq).toHaveBeenCalledWith('business_id', 'business-a');
    expect(queries.providers.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'inactive' }));
  });

  it('deletes a provider only within the caller business', async () => {
    const { service, queries } = setup({
      business_members: membership,
      providers: { data: { id: 'provider-a' }, error: null },
    });

    await expect(service.delete('provider-a', 'access-token')).resolves.toBeUndefined();
    expect(queries.providers.eq).toHaveBeenCalledWith('business_id', 'business-a');
  });

  it('replaces working hours through the database transaction RPC', async () => {
    const provider = { id: 'provider-a', business_id: 'business-a' };
    const hours = [{ day_of_week: 1, start_time: '09:00', end_time: '17:00' }];
    const { service, rpc } = setup({
      business_members: membership,
      providers: { data: provider, error: null },
      provider_working_hours: { data: hours, error: null },
    });
    const dto = plainToInstance(WorkingHoursDto, { hours });

    await expect(service.replaceWorkingHours('provider-a', dto, 'access-token')).resolves.toEqual(hours);
    expect(rpc).toHaveBeenCalledWith('replace_provider_working_hours', {
      p_provider_id: 'provider-a',
      p_hours: hours,
    });
  });

  it('rejects a schedule interval whose end is not after its start', async () => {
    const { service, rpc } = setup({});
    const dto = plainToInstance(WorkingHoursDto, {
      hours: [{ day_of_week: 1, start_time: '17:00', end_time: '09:00' }],
    });

    await expect(service.replaceWorkingHours('provider-a', dto, 'access-token')).rejects.toBeInstanceOf(BadRequestException);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('validates weekday bounds and time format', async () => {
    const dto = plainToInstance(WorkingHoursDto, {
      hours: [{ day_of_week: 7, start_time: '9am', end_time: '17:00' }],
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('hours');
  });

  it('rejects invalid provider name, email, and phone values', async () => {
    const dto = plainToInstance(CreateProviderDto, {
      name: '  ',
      email: 'not-an-email',
      phone: 'phone!',
    });
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(['name', 'email', 'phone']));
  });
});