import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/guards/current-user.guard.js';
import { CurrentUserGuard } from '../common/guards/current-user.guard.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto.js';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto.js';
import { BookingsService } from './bookings.service.js';
import { SlotUnavailableFilter } from './slot-unavailable.exception.js';

@Controller('public/businesses/:slug/bookings')
export class PublicBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseFilters(SlotUnavailableFilter)
  async create(@Param('slug') slug: string, @Body() dto: CreateBookingDto) {
    return { success: true, data: await this.bookings.createPublic(slug, dto) };
  }
}

@Controller('bookings')
@UseGuards(CurrentUserGuard)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest, @Query() query: ListBookingsQueryDto) {
    return { success: true, data: await this.bookings.listForMember(request.accessToken, query) };
  }

  @Get('today')
  async today(@Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.bookings.listTodayForMember(request.accessToken) };
  }

  @Get(':id')
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return { success: true, data: await this.bookings.getForMember(id, request.accessToken) };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      success: true,
      data: await this.bookings.updateStatusForMember(id, request.accessToken, dto),
    };
  }

  @Patch(':id/cancel')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return { success: true, data: await this.bookings.cancelForMember(id, request.accessToken) };
  }
}
