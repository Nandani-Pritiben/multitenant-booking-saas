import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { CreateBusinessDto } from './dto/create-business.dto.js';
import { UpdateBusinessDto } from './dto/update-business.dto.js';

@Injectable()
export class BusinessesService {
  constructor(private readonly supabase: SupabaseService) {}

  async getForUser(accessToken: string) {
    const { data, error } = await this.supabase.forUser(accessToken)
      .from('businesses')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error) throw new InternalServerErrorException('Unable to load business');
    return data;
  }

  async create(dto: CreateBusinessDto, accessToken: string) {
    const client = this.supabase.forUser(accessToken);
    const { data: businessId, error } = await client.rpc('create_business_for_current_user', {
      p_name: dto.name,
      p_slug: dto.slug,
      p_timezone: dto.timezone,
      p_email: dto.email ?? null,
      p_phone: dto.phone ?? null,
    });
    if (error) this.handleWriteError(error);
    const { data, error: readError } = await client
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();
    if (readError) throw new InternalServerErrorException('Unable to load created business');
    return data;
  }

  async update(dto: UpdateBusinessDto, accessToken: string) {
    const client = this.supabase.forUser(accessToken);

    // First get the business id for this user (needed for the explicit eq filter)
    const { data: existing, error: readErr } = await client
      .from('businesses')
      .select('id')
      .limit(1)
      .maybeSingle();
    if (readErr) throw new InternalServerErrorException('Unable to load business');
    if (!existing) throw new NotFoundException('No business found for user');

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (dto.name      !== undefined) updates.name      = dto.name;
    if (dto.slug      !== undefined) updates.slug      = dto.slug;
    if (dto.timezone  !== undefined) updates.timezone  = dto.timezone;
    if (dto.email     !== undefined) updates.email     = dto.email;
    if (dto.phone     !== undefined) updates.phone     = dto.phone;

    const { data, error } = await client
      .from('businesses')
      .update(updates)
      .eq('id', (existing as { id: string }).id)
      .select('*')
      .single();

    if (error) this.handleWriteError(error);
    if (!data) throw new NotFoundException('No business found for user');
    return data;
  }

  private handleWriteError(error: { code?: string }): never {
    if (error.code === '23505') throw new ConflictException('Business slug is already in use');
    if (error.code === 'PGRST116') throw new NotFoundException('No business found for user');
    throw new InternalServerErrorException('Unable to save business');
  }
}
