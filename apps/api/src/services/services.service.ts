import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { EntitlementsService } from '../billing/entitlements.service.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';

interface Membership {
  business_id: string;
  role: string;
}

interface DatabaseError {
  code?: string;
  message?: string;
}

@Injectable()
export class ServicesService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async list(accessToken: string) {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);
    const { data, error } = await client
      .from('services')
      .select('*')
      .eq('business_id', membership.business_id)
      .order('created_at', { ascending: false });
    if (error) this.fail(error);
    return data ?? [];
  }

  async get(id: string, accessToken: string) {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);
    const { data, error } = await client
      .from('services')
      .select('*')
      .eq('business_id', membership.business_id)
      .eq('id', id)
      .maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException('Service not found');
    return data;
  }

  async create(dto: CreateServiceDto, accessToken: string) {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);

    // Enforce plan limit before inserting
    const { plan, limits, timezone } = await this.entitlements.resolve(accessToken);
    await this.entitlements.assertLimit(membership.business_id, 'services', limits, timezone, plan);

    const { data, error } = await client
      .from('services')
      .insert({ ...dto, business_id: membership.business_id })
      .select('*')
      .single();
    if (error) this.fail(error);
    return data;
  }

  async update(id: string, dto: UpdateServiceDto, accessToken: string) {
    if (Object.keys(dto).length === 0) throw new BadRequestException('Provide at least one field to update');
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);
    const { data, error } = await client
      .from('services')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('business_id', membership.business_id)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException('Service not found');
    return data;
  }

  async delete(id: string, accessToken: string) {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);
    const { data, error } = await client
      .from('services')
      .delete()
      .eq('business_id', membership.business_id)
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException('Service not found');
  }

  private async getMembership(client: SupabaseClient): Promise<Membership> {
    const { data, error } = await client
      .from('business_members')
      .select('business_id,role')
      .maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException('No business membership found');
    const membership = data as unknown as Membership;
    if (!['owner', 'admin'].includes(membership.role)) throw new ForbiddenException('You cannot manage services');
    return membership;
  }

  private fail(error: DatabaseError): never {
    if (error.code === 'PGRST116') throw new NotFoundException('Service not found');
    if (error.code === 'PGRST205') {
      throw new ServiceUnavailableException('Services database is not initialized. Apply the services migration and retry.');
    }
    if (error.code === '23514' || error.code === '22P02') throw new BadRequestException('Invalid service data');
    throw new InternalServerErrorException('Unable to complete service request');
  }
}