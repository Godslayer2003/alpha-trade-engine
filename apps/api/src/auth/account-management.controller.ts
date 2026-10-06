import { Body, Controller, Delete, Post, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from './current-user.decorator';
import { AccountManagementService } from './account-management.service';
import { AccountConfirmationDto, DeleteAccountDto } from './dto/account-management.dto';
import { SecurityQuotaService } from './security-quota.service';

@Controller('api/v1/account')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60_000, limit: 5 } })
export class AccountManagementController {
  constructor(private readonly accounts: AccountManagementService, private readonly quota: SecurityQuotaService) {}
  @Post('export')
  async exportData(@CurrentUser() user: AuthenticatedUser, @Body() dto: AccountConfirmationDto,
    @Res({ passthrough: true }) response: Response) {
    await this.quota.consume('account-confirm', user.userId, 10, 900_000);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Disposition', 'attachment; filename="alpha-trade-data.json"');
    return { exportedAt: new Date().toISOString(), data: await this.accounts.exportData(user.userId, dto) };
  }
  @Delete()
  async deleteAccount(@CurrentUser() user: AuthenticatedUser, @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) response: Response) {
    await this.quota.consume('account-confirm', user.userId, 10, 900_000);
    await this.accounts.deleteAccount(user.userId, dto);
    response.clearCookie('alpha_trade_session', { path: '/' });
    return { ok: true };
  }
  @Delete('picture')
  async removePicture(@CurrentUser() user: AuthenticatedUser) {
    await this.accounts.removePicture(user.userId);
    return { ok: true };
  }
}
