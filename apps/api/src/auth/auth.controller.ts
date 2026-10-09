import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { Session } from '@supabase/supabase-js';
import { AuthService } from './auth.service.js';
import { SignupDto } from './dto/signup.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CurrentUserGuard, type AuthenticatedRequest } from '../common/guards/current-user.guard.js';
import { clearAuthCookies, setAuthCookies } from '../common/auth-cookies.js';
import type { User } from '@supabase/supabase-js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() signupDto: SignupDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.signUp(signupDto.name, signupDto.email, signupDto.password, signupDto.businessName);
    setAuthCookies(response, result.session);
    return { user: result.user, business: result.business };
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.signIn(loginDto.email, loginDto.password);
    setAuthCookies(response, result.session as Session);
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CurrentUserGuard)
  async logout(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) response: Response) {
    await this.authService.signOut(req.accessToken);
    clearAuthCookies(response);
    return { message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(CurrentUserGuard)
  me(@CurrentUser() user: User) {
    return { id: user.id, email: user.email, name: user.user_metadata?.name ?? '' };
  }
}