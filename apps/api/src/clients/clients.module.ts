import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BillingModule } from '../billing/billing.module.js';
import { CurrentUserGuard } from '../common/guards/current-user.guard.js';
import { PlanGuard } from '../common/guards/plan.guard.js';
import { ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';

@Module({
  imports:     [BillingModule],
  controllers: [ClientsController],
  providers:   [ClientsService, CurrentUserGuard, PlanGuard, Reflector],
  exports:     [ClientsService],
})
export class ClientsModule {}
