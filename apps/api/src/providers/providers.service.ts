import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { EntitlementsService } from '../billing/entitlements.service.js';
import { CreateProviderDto } from './dto/create-provider.dto.js';
import { UpdateProviderDto } from './dto/update-provider.dto.js';
import { WorkingHoursDto } from './dto/working-hours.dto.js';

interface Membership {
  business_id: string;
  role: string;
}

interface DatabaseError {
  code?: string;
  message?: string;
}

@Injectable()
export class ProvidersService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async list(accessToken: string) {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);
    const { data, error } = await client.from('providers').select('*')
      .eq('business_id', membership.business_id).order('created_at', { ascending: false });
    if (error) this.fail(error);
    return data ?? [];
  }

  async get(id: string, accessToken: string) {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);
    const { data, error } = await client.from('providers').select('*')
      .eq('business_id', membership.business_id).eq('id', id).maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException('Provider not found');
    return data;
  }

  async create(dto: CreateProviderDto, accessToken: string) {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);

    // Enforce plan limit before inserting
    const { plan, limits, timezone } = await this.entitlements.resolve(accessToken);
    await this.entitlements.assertLimit(membership.business_id, 'providers', limits, timezone, plan);

    const { data, error } = await client.from('providers')
      .insert({ ...dto, business_id: membership.business_id }).select('*').single();
    if (error) this.fail(error);
    return data;
  }

  async update(id: string, dto: UpdateProviderDto, accessToken: string) {
    if (Object.keys(dto).length === 0) throw new BadRequestException('Provide at least one field to update');
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);
    const { data, error } = await client.from('providers')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('business_id', membership.business_id).eq('id', id).select('*').maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException('Provider not found');
    return data;
  }

  async delete(id: string, accessToken: string) {
    const client = this.supabase.forUser(accessToken);
    const membership = await this.getMembership(client);
    const { data, error } = await client.from('providers').delete()
      .eq('business_id', membership.business_id).eq('id', id).select('id').maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException('Provider not found');
  }

  async getWorkingHours(providerId: string, accessToken: string) {
    const client = this.supabase.forUser(accessToken);
    await this.get(providerId, accessToken);
    const { data, error } = await client.from('provider_working_hours').select('*')
      .eq('provider_id', providerId).order('day_of_week', { ascending: true });
    if (error) this.fail(error);
    return data ?? [];
  }

  async replaceWorkingHours(providerId: string, dto: WorkingHoursDto, accessToken: string) {
    for (const item of dto.hours) {
      if (item.start_time >= item.end_time) {
        throw new BadRequestException('Start time must be before end time');
      }
    }
    const client = this.supabase.forUser(accessToken);
    await this.get(providerId, accessToken);
    const { error } = await client.rpc('replace_provider_working_hours', {
      p_provider_id: providerId,
      p_hours: dto.hours,
    });
    if (error) this.fail(error);
    return this.getWorkingHours(providerId, accessToken);
  }

  private async getMembership(client: SupabaseClient): Promise<Membership> {
    const { data, error } = await client.from('business_members').select('business_id,role').maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException('No business membership found');
    const membership = data as unknown as Membership;
    if (!['owner', 'admin'].includes(membership.role)) throw new ForbiddenException('You cannot manage providers');
    return membership;
  }

  private fail(error: DatabaseError): never {
    if (error.code === 'PGRST116') throw new NotFoundException('Provider not found');
    if (error.code === 'PGRST205' || error.code === 'PGRST202') {
      throw new ServiceUnavailableException('Providers database is not initialized. Apply the providers migration and retry.');
    }
    if (error.code === '23505') throw new ConflictException('A provider working-hours row already exists for that day');
    if (error.code === '23514' || error.code === '22P02') throw new BadRequestException('Invalid provider or working-hours data');
    throw new InternalServerErrorException('Unable to complete provider request');
  }
}