import { Module, Optional } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AppConfigService } from './config/app.config.js';
import { ConfigModule as AppConfigModule, APP_CONFIG_SERVICE } from './config/config.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [
    AppConfigModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    SupabaseModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, AppConfigService, { provide: APP_CONFIG_SERVICE, useClass: AppConfigService }],
})
export class AppModule {}
