import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService
  ) {
    this.supabase = createClient(
      this.configService.get('SUPABASE_URL'),
      this.configService.get('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }

  get supabaseClient(): SupabaseClient {
    return this.supabase;
  }

  get supabase() {
    return this.databaseService.supabase;
  }

  async signUp(email: string, password: string, redirectTo?: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        redirectTo: redirectTo ?? `http://localhost:5173/onboarding`,
      },
    });

    if (error) {
      this.logger.error('Supabase signup failed');
      if (error.message.includes('already registered')) {
        throw new BadRequestException('Email already registered');
      }
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      this.logger.error('Supabase sign-in failed');
      if (error.message.includes('Invalid login credentials')) {
        throw new UnauthorizedException('Invalid email or password');
      }
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async signOut(idToken: string) {
    const { error } = await this.supabase.auth.signOut({ token: idToken });
    if (error) {
      this.logger.error('Supabase sign-out failed');
      throw new BadRequestException('Failed to sign out');
    }
  }

  async getCurrentUser(idToken: string) {
    const { data, error } = await this.supabase.auth.getUser({ token: idToken });
    if (error || !data?.user) {
      throw new UnauthorizedException('Unauthorized');
    }
    return data.user;
  }
}