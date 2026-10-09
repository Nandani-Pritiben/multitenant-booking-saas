import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module.js';
import { CurrentUserGuard } from '../common/guards/current-user.guard.js';
import { ServicesController } from './services.controller.js';
import { ServicesService } from './services.service.js';

@Module({
  imports:     [BillingModule],
  controllers: [ServicesController],
  providers:   [ServicesService, CurrentUserGuard],
})
export class ServicesModule {}
