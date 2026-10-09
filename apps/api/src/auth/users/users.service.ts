import { Injectable, InternalException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findBySupabaseId(supabaseId: string) {
    const { data, error } = await this.databaseService
      .supabase
      .from('user_profiles')
      .select('*')
      .eq('supabase_id', supabaseId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new InternalException('Failed to fetch user');
    }

    return data;
  }

  async createProfile(supabaseId: string, email: string, role: string) {
    const { data, error } = await this.databaseService
      .supabase
      .from('user_profiles')
      .insert({
        supabase_id: supabaseId,
        email,
        role,
      })
      .select()
      .single();

    if (error) {
      throw new InternalException('Failed to create user profile');
    }

    return data;
  }
}