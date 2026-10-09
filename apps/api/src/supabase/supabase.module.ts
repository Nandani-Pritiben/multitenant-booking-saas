import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service.js';

export const SUPABASE_SERVICE = Symbol('SUPABASE_SERVICE');

@Global()
@Module({
  providers: [
    SupabaseService,
    {
      provide: SUPABASE_SERVICE,
      useClass: SupabaseService,
    },
  ],
  exports: [SupabaseService, SUPABASE_SERVICE],
})
export class SupabaseModule {}
