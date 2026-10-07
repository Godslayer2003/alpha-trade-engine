import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { SecurityQuotaService } from './security-quota.service';
import { MfaService } from './mfa.service';
import { MfaSetupDto, MfaConfirmDto } from './dto/mfa.dto';
import { AccountTokenService } from './account-token.service';
import { AccountTokenDto, RecoveryRequestDto, ResetPasswordDto } from './dto/account-token.dto';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from './current-user.decorator';

const SESSION_COOKIE = 'alpha_trade_session';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Tighter than the app-wide default (see ThrottlerModule.forRoot in
// app.module.ts) — these two are the actual brute-force targets.
const AUTH_THROTTLE = { default: { ttl: 60_000, limit: 10 } };

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly quota: SecurityQuotaService,
    private readonly mfa: MfaService, private readonly accountTokens: AccountTokenService) {}

  @Post('register')
  @Throttle(AUTH_THROTTLE)
  async register(@Body() dto: RegisterDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.quota.consume('register-ip', request.ip ?? 'unknown', 10, 900_000);
    const result = await this.authService.register(dto);
    this.setSessionCookie(response, result.accessToken);
    return { user: result.user };
  }

  @Post('login')
  @Throttle(AUTH_THROTTLE)
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.quota.consume('login-ip', request.ip ?? 'unknown', 30, 900_000);
    await this.quota.consume('login-account', dto.email, 15, 900_000);
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
  async logout(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) response: Response) {
    await this.authService.revokeSession(user.sessionId, user.userId);
    response.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) response: Response) {
    await this.authService.revokeAllSessions(user.userId);
    response.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Post('password')
  @Throttle(AUTH_THROTTLE)
  @UseGuards(JwtAuthGuard)
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response) {
    await this.quota.consume('password-user', user.userId, 10, 900_000);
    await this.authService.changePassword(user.userId, dto.currentPassword, dto.newPassword, dto.otp);
    response.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  @Throttle(AUTH_THROTTLE)
  async setupMfa(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaSetupDto) {
    await this.quota.consume('mfa-user', user.userId, 10, 900_000);
    return this.mfa.begin(user.userId, dto.password);
  }

  @Post('recovery')
  @Throttle(AUTH_THROTTLE)
  async recovery(@Body() dto: RecoveryRequestDto, @Req() request: Request) {
    await this.quota.consume('recovery-ip', request.ip ?? 'unknown', 10, 900_000);
    await this.quota.consume('recovery-email', dto.email, 3, 900_000);
    await this.accountTokens.request(dto.email, 'reset');
    return { message: 'If that account exists, a recovery email will arrive shortly.' };
  }

  @Post('reset-password')
  @Throttle(AUTH_THROTTLE)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() request: Request) {
    await this.quota.consume('reset-ip', request.ip ?? 'unknown', 10, 900_000);
    await this.accountTokens.consume(dto.token, 'reset', dto.password);
    return { ok: true };
  }

  @Post('verification')
  @UseGuards(JwtAuthGuard)
  @Throttle(AUTH_THROTTLE)
  async requestVerification(@CurrentUser() user: AuthenticatedUser) {
    await this.quota.consume('verification-user', user.userId, 3, 900_000);
    await this.accountTokens.request(user.email, 'verify');
    return { message: 'A verification email will arrive shortly if your address is not yet verified.' };
  }

  @Post('verify-email')
  @Throttle(AUTH_THROTTLE)
  async verifyEmail(@Body() dto: AccountTokenDto) {
    await this.accountTokens.consume(dto.token, 'verify');
    return { ok: true };
  }

  @Post('mfa/confirm')
  @UseGuards(JwtAuthGuard)
  @Throttle(AUTH_THROTTLE)
  async confirmMfa(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaConfirmDto,
    @Res({ passthrough: true }) response: Response) {
    await this.quota.consume('mfa-user', user.userId, 10, 900_000);
    const result = await this.mfa.confirm(user.userId, dto.code);
    response.clearCookie(SESSION_COOKIE, { path: '/' });
    response.setHeader('Cache-Control', 'no-store');
    return result;
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
