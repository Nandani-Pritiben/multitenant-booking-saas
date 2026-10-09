import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { BusinessesService } from './businesses.service.js';
import { CreateBusinessDto } from './dto/create-business.dto.js';
import { UpdateBusinessDto } from './dto/update-business.dto.js';
import { CurrentUserGuard, type AuthenticatedRequest } from '../common/guards/current-user.guard.js';

@Controller('businesses')
@UseGuards(CurrentUserGuard)
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    return { success: true, data: await this.businessesService.getForUser(req.accessToken) };
  }

  @Post()
  async create(@Body() dto: CreateBusinessDto, @Req() req: AuthenticatedRequest) {
    return { success: true, data: await this.businessesService.create(dto, req.accessToken) };
  }

  @Patch('me')
  async updateMe(@Body() dto: UpdateBusinessDto, @Req() req: AuthenticatedRequest) {
    return { success: true, data: await this.businessesService.update(dto, req.accessToken) };
  }
}
