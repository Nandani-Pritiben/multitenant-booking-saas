import { Controller, Get, Param, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service.js';
import { AvailabilityQueryDto, PublicAvailabilityQueryDto } from './dto/availability-query.dto.js';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  async get(@Query() query: AvailabilityQueryDto) {
    return { success: true, data: await this.availability.getAvailability(query) };
  }
}

@Controller('public/businesses')
export class PublicBookingController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get(':slug')
  async business(@Param('slug') slug: string) {
    return { success: true, data: await this.availability.getBusiness(slug) };
  }

  @Get(':slug/services')
  async services(@Param('slug') slug: string) {
    return { success: true, data: await this.availability.getServices(slug) };
  }

  @Get(':slug/providers')
  async providers(@Param('slug') slug: string) {
    return { success: true, data: await this.availability.getProviders(slug) };
  }

  @Get(':slug/availability')
  async slots(@Param('slug') slug: string, @Query() query: PublicAvailabilityQueryDto) {
    return {
      success: true,
      data: await this.availability.getAvailability({ ...query, business_slug: slug }),
    };
  }
}