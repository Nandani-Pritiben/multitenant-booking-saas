import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  constructor(private readonly configService: ConfigService) {}

  get admin() {
    return createClient(this.required('SUPABASE_URL'), this.required('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  get publicClient() {
    return createClient(this.required('SUPABASE_URL'), this.required('SUPABASE_ANON_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  forUser(accessToken: string): SupabaseClient {
    if (!accessToken) throw new UnauthorizedException('Authentication required');
    return createClient(this.required('SUPABASE_URL'), this.required('SUPABASE_ANON_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
  }

  async verifyAccessToken(accessToken: string): Promise<User> {
    const { data, error } = await this.publicClient.auth.getUser(accessToken);
    if (error || !data.user) throw new UnauthorizedException('Invalid or expired session');
    return data.user;
  }

  private required(name: string): string {
    const value = this.configService.get<string>(name);
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    return value;
  }
}
