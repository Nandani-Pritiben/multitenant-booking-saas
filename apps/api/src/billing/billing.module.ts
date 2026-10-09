import { Module } from '@nestjs/common';
import { CurrentUserGuard } from '../common/guards/current-user.guard.js';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { EntitlementsService } from './entitlements.service.js';

@Module({
  controllers: [BillingController],
  providers:   [BillingService, EntitlementsService, CurrentUserGuard],
  exports:     [BillingService, EntitlementsService],
})
export class BillingModule {}
