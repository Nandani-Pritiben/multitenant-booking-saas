import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module.js';
import { CurrentUserGuard } from '../common/guards/current-user.guard.js';
import { ProvidersController } from './providers.controller.js';
import { ProvidersService } from './providers.service.js';

@Module({
  imports:     [BillingModule],
  controllers: [ProvidersController],
  providers:   [ProvidersService, CurrentUserGuard],
})
export class ProvidersModule {}
