import { Module } from '@nestjs/common';
import { BusinessesController } from './businesses.controller.js';
import { BusinessesService } from './businesses.service.js';
import { CurrentUserGuard } from '../common/guards/current-user.guard.js';

@Module({
  controllers: [BusinessesController],
  providers: [BusinessesService, CurrentUserGuard],
  exports: [BusinessesService],
})
export class BusinessesModule {}