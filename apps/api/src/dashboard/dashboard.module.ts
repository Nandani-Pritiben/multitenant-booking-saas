import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module.js';
import { CurrentUserGuard } from '../common/guards/current-user.guard.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [AvailabilityModule],
  controllers: [DashboardController],
  providers: [DashboardService, CurrentUserGuard],
})
export class DashboardModule {}
