import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { TelegramService } from './telegram.service';

@Controller('api/v1/telegram')
@UseGuards(JwtAuthGuard)
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('link-code')
  async createLinkCode(@CurrentUser() user: AuthenticatedUser) {
    const code = await this.telegramService.createLinkCode(user.userId);
    return { code };
  }

  @Get('status')
  async getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.telegramService.getLinkStatus(user.userId);
  }
}
