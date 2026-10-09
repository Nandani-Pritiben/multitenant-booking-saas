import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { localDateAt, localDateTimeToEpoch, generateSlots, isValidDateOnly, nextDate, weekdayForDate, type OccupiedInterval, type WorkingInterval } from './availability.logic.js';
import type { AvailabilityQueryDto } from './dto/availability-query.dto.js';

export interface BusinessRecord {
  id: string;
  name: string;
  slug: string;
  timezone: string;
}

interface ProviderRecord {
  id: string;
  name: string;
}

interface DatabaseError {
  code?: string;
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly supabase: SupabaseService) {}

  async getBusiness(slug: string) {
    return this.resolveBusiness(undefined, slug);
  }

  async getServices(slug: string) {
    const business = await this.resolveBusiness(undefined, slug);
    const { data, error } = await this.supabase.admin.from('services')
      .select('id,name,description,duration_minutes,price,currency')
      .eq('business_id', business.id).eq('status', 'active').order('name');
    if (error) this.fail(error);
    return data ?? [];
  }

  async getProviders(slug: string) {
    const business = await this.resolveBusiness(undefined, slug);
    const { data, error } = await this.supabase.admin.from('providers')
      .select('id,name').eq('business_id', business.id).eq('status', 'active').order('name');
    if (error) this.fail(error);
    return data ?? [];
  }

  async getAvailability(query: AvailabilityQueryDto) {
    if (Boolean(query.business_id) === Boolean(query.business_slug)) {
      throw new BadRequestException('Provide exactly one of business_id or business_slug');
    }
    if (!isValidDateOnly(query.date)) throw new BadRequestException('Date must be a valid YYYY-MM-DD calendar date');
    const business = await this.resolveBusiness(query.business_id, query.business_slug);
    const today = localDateAt(Date.now(), business.timezone);
    if (query.date < today) throw new BadRequestException('Availability date cannot be in the past');

    const { data: service, error: serviceError } = await this.supabase.admin.from('services')
      .select('id,business_id,duration_minutes').eq('id', query.service_id)
      .eq('business_id', business.id).eq('status', 'active').maybeSingle();
    if (serviceError) this.fail(serviceError);
    if (!service) throw new NotFoundException('Service not found for this business');

    let providersQuery = this.supabase.admin.from('providers').select('id,name')
      .eq('business_id', business.id).eq('status', 'active');
    if (query.provider_id) providersQuery = providersQuery.eq('id', query.provider_id);
    const { data: providers, error: providersError } = await providersQuery.order('name');
    if (providersError) this.fail(providersError);
    if (query.provider_id && (!providers || providers.length === 0)) {
      throw new NotFoundException('Provider not found for this business');
    }

    const dayOfWeek = weekdayForDate(query.date);
    const dayStart = localDateTimeToEpoch(query.date, '00:00', business.timezone);
    const dayEnd = localDateTimeToEpoch(nextDate(query.date), '00:00', business.timezone);
    if (dayStart === null || dayEnd === null) throw new BadRequestException('Could not resolve date in business timezone');

    const slots = (await Promise.all((providers ?? []).map(async (provider: ProviderRecord) => {
      const { data: hours, error: hoursError } = await this.supabase.admin.from('provider_working_hours')
        .select('start_time,end_time').eq('provider_id', provider.id).eq('day_of_week', dayOfWeek).maybeSingle();
      if (hoursError) this.fail(hoursError);
      if (!hours) return [];

      const { data: bookings, error: bookingsError } = await this.supabase.admin.from('bookings')
        .select('start_at,end_at,status').eq('business_id', business.id).eq('provider_id', provider.id)
        .lt('start_at', new Date(dayEnd).toISOString()).gt('end_at', new Date(dayStart).toISOString())
        .neq('status', 'cancelled');
      if (bookingsError) this.fail(bookingsError);

      const generated = generateSlots(
        query.date,
        business.timezone,
        hours as WorkingInterval,
        service.duration_minutes,
        (bookings ?? []) as OccupiedInterval[],
      );
      return generated.map((slot) => ({
        ...slot,
        provider_id: provider.id,
        provider_name: provider.name,
      }));
    }))).flat().sort((a, b) => a.start_at.localeCompare(b.start_at) || a.provider_name.localeCompare(b.provider_name));

    return { date: query.date, timezone: business.timezone, slots };
  }

  private async resolveBusiness(id?: string, slug?: string): Promise<BusinessRecord> {
    let request = this.supabase.admin.from('businesses').select('id,name,slug,timezone')
      .eq('status', 'active');
    request = id ? request.eq('id', id) : request.eq('slug', slug);
    const { data, error } = await request.maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException('Business not found');
    return data as BusinessRecord;
  }

  private fail(error: DatabaseError): never {
    if (error.code === 'PGRST116') throw new NotFoundException('Requested public resource not found');
    if (['PGRST202', 'PGRST205'].includes(error.code ?? '')) {
      throw new ServiceUnavailableException('Availability schema is not initialized. Apply the Phase 4 migration and retry.');
    }
    throw new InternalServerErrorException('Unable to load public booking information');
  }
}