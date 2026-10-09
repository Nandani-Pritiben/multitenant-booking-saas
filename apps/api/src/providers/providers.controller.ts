import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/guards/current-user.guard.js';
import { CurrentUserGuard } from '../common/guards/current-user.guard.js';
import { CreateProviderDto } from './dto/create-provider.dto.js';
import { UpdateProviderDto } from './dto/update-provider.dto.js';
import { WorkingHoursDto } from './dto/working-hours.dto.js';
import { ProvidersService } from './providers.service.js';

@Controller('providers')
@UseGuards(CurrentUserGuard)
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.providers.list(request.accessToken) };
  }

  @Get(':id/working-hours')
  async getWorkingHours(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.providers.getWorkingHours(id, request.accessToken) };
  }

  @Put(':id/working-hours')
  async putWorkingHours(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WorkingHoursDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return { success: true, data: await this.providers.replaceWorkingHours(id, dto, request.accessToken) };
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.providers.get(id, request.accessToken) };
  }

  @Post()
  async create(@Body() dto: CreateProviderDto, @Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.providers.create(dto, request.accessToken) };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProviderDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return { success: true, data: await this.providers.update(id, dto, request.accessToken) };
  }

  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    await this.providers.delete(id, request.accessToken);
    return { success: true, data: { deleted: true } };
  }
}