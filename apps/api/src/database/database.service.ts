import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { AppConfigService } from './app.config.js';

@Injectable()
export class DatabaseService {
  private supabase = createClient(
    this.configService.get('SUPABASE_URL'),
    this.configService.get('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  constructor(private readonly configService: AppConfigService) {}

  get supabase() {
    return this.supabase;
  }
}