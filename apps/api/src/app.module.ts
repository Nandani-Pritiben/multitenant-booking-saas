import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BusinessesModule } from './businesses/businesses.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';
import { ServicesModule } from './services/services.module.js';
import { ProvidersModule } from './providers/providers.module.js';
import { AvailabilityModule } from './availability/availability.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { BillingModule } from './billing/billing.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    SupabaseModule,
    HealthModule,
    AuthModule,
    BusinessesModule,
    ServicesModule,
    ProvidersModule,
    AvailabilityModule,
    ClientsModule,
    BookingsModule,
    DashboardModule,
    NotificationsModule,
    BillingModule,
  ],
})
export class AppModule {}
