import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { CurrentUserGuard } from '../common/guards/current-user.guard.js';
import type { AuthenticatedRequest } from '../common/guards/current-user.guard.js';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
@UseGuards(CurrentUserGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  async summary(@Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.dashboard.getSummary(request.accessToken) };
  }
}
