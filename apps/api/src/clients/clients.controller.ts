import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserGuard, type AuthenticatedRequest } from '../common/guards/current-user.guard.js';
import { PlanGuard, RequirePlan } from '../common/guards/plan.guard.js';
import { ClientsService } from './clients.service.js';
import { ClientQueryDto } from './dto/client-query.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';

/** All CRM endpoints require an active Pro subscription. */
@Controller('clients')
@UseGuards(CurrentUserGuard, PlanGuard)
@RequirePlan('pro')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest, @Query() query: ClientQueryDto) {
    return { success: true, data: await this.clients.list(req.accessToken, query) };
  }

  @Get(':id')
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return { success: true, data: await this.clients.get(id, req.accessToken) };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return { success: true, data: await this.clients.update(id, req.accessToken, dto) };
  }

  @Get(':id/bookings')
  async bookings(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return { success: true, data: await this.clients.getBookings(id, req.accessToken) };
  }
}
