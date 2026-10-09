import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './app.config.js';

export const APP_CONFIG_SERVICE = Symbol('APP_CONFIG_SERVICE');

@Global()
@Module({
  providers: [
    AppConfigService,
    {
      provide: APP_CONFIG_SERVICE,
      useClass: AppConfigService,
    },
  ],
  exports: [AppConfigService, APP_CONFIG_SERVICE],
})
export class ConfigModule {}
