import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/guards/current-user.guard.js';
import { CurrentUserGuard } from '../common/guards/current-user.guard.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { ServicesService } from './services.service.js';

@Controller('services')
@UseGuards(CurrentUserGuard)
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.services.list(request.accessToken) };
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.services.get(id, request.accessToken) };
  }

  @Post()
  async create(@Body() dto: CreateServiceDto, @Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.services.create(dto, request.accessToken) };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return { success: true, data: await this.services.update(id, dto, request.accessToken) };
  }

  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    await this.services.delete(id, request.accessToken);
    return { success: true, data: { deleted: true } };
  }
}