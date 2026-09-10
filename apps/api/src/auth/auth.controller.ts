import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from './current-user.decorator';

const SESSION_COOKIE = 'alpha_trade_session';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Tighter than the app-wide default (see ThrottlerModule.forRoot in
// app.module.ts) — these two are the actual brute-force targets.
const AUTH_THROTTLE = { default: { ttl: 60_000, limit: 10 } };

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle(AUTH_THROTTLE)
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.register(dto);
    this.setSessionCookie(response, result.accessToken);
    return { user: result.user };
  }

  @Post('login')
  @Throttle(AUTH_THROTTLE)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(dto);
    this.setSessionCookie(response, result.accessToken);
    return { user: result.user };
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  session(@CurrentUser() user: AuthenticatedUser) {
    return { user: { id: user.userId, email: user.email } };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  private setSessionCookie(response: Response, token: string) {
    response.setHeader('Cache-Control', 'no-store');
    response.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_MS,
    });
  }
}
