import type { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it, vi } from 'vitest';
import { ServicesService } from '../../dist/services/services.service.js';
import type { SupabaseService } from '../supabase/supabase.service.js';
import { CreateServiceDto } from '../../dist/services/dto/create-service.dto.js';
import { UpdateServiceDto } from '../../dist/services/dto/update-service.dto.js';

interface QueryResult {
  data: unknown;
  error: { code?: string; message?: string } | null;
}

interface QueryBuilder {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

function query(result: QueryResult): QueryBuilder {
  const builder = {} as QueryBuilder;
  Object.assign(builder, {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
  });
  return builder;
}

function setup(serviceResult: QueryResult) {
  const membershipQuery = query({ data: { business_id: 'business-a', role: 'owner' }, error: null });
  const serviceQuery = query(serviceResult);
  const from = vi.fn((table: string) => table === 'business_members' ? membershipQuery : serviceQuery);
  const client = { from } as unknown as SupabaseClient;
  const forUser = vi.fn(() => client);
  const service = new ServicesService({ forUser } as unknown as SupabaseService);
  return { service, forUser, from, membershipQuery, serviceQuery };
}

describe('ServicesService', () => {
  it('lists only the authenticated member business services', async () => {
    const rows = [{ id: 'service-a', business_id: 'business-a' }];
    const { service, forUser, serviceQuery } = setup({ data: rows, error: null });

    await expect(service.list('user-token')).resolves.toEqual(rows);
    expect(forUser).toHaveBeenCalledWith('user-token');
    expect(serviceQuery.eq).toHaveBeenCalledWith('business_id', 'business-a');
  });

  it('creates a service using the membership business, not caller input', async () => {
    const created = { id: 'service-a', business_id: 'business-a', name: 'Haircut' };
    const { service, serviceQuery } = setup({ data: created, error: null });
    const dto = plainToInstance(CreateServiceDto, {
      name: 'Haircut', duration_minutes: 30, price: 500,
    });

    await expect(service.create(dto, 'user-token')).resolves.toEqual(created);
    expect(serviceQuery.insert).toHaveBeenCalledWith(expect.objectContaining({ business_id: 'business-a' }));
  });

  it('returns not found for a service hidden by tenant RLS', async () => {
    const { service, serviceQuery } = setup({ data: null, error: null });

    await expect(service.get('service-from-business-b', 'user-token')).rejects.toBeInstanceOf(NotFoundException);
    expect(serviceQuery.eq).toHaveBeenCalledWith('business_id', 'business-a');
  });

  it('updates a service only within the caller business', async () => {
    const updated = { id: 'service-a', business_id: 'business-a', status: 'inactive' };
    const { service, serviceQuery } = setup({ data: updated, error: null });
    const dto = plainToInstance(UpdateServiceDto, { status: 'inactive' });

    await expect(service.update('service-a', dto, 'user-token')).resolves.toEqual(updated);
    expect(serviceQuery.eq).toHaveBeenCalledWith('business_id', 'business-a');
    expect(serviceQuery.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'inactive' }));
  });

  it('deletes a service only within the caller business', async () => {
    const { service, serviceQuery } = setup({ data: { id: 'service-a' }, error: null });

    await expect(service.delete('service-a', 'user-token')).resolves.toBeUndefined();
    expect(serviceQuery.eq).toHaveBeenCalledWith('business_id', 'business-a');
  });

  it('rejects invalid service values', async () => {
    const dto = plainToInstance(CreateServiceDto, { name: '   ', duration_minutes: 1441, price: -1 });
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(['name', 'duration_minutes', 'price']));
  });

  it('explains when the hosted services migration has not been applied', async () => {
    const { service } = setup({ data: null, error: { code: 'PGRST205' } });

    await expect(service.list('user-token')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});