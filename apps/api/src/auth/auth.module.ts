import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CurrentUserGuard } from '../common/guards/current-user.guard.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, CurrentUserGuard],
  exports: [AuthService],
})
export class AuthModule {}