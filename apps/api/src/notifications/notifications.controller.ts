import { BadRequestException, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from './notifications.service';

@Controller('api/v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
    private readonly emailService: EmailService,
  ) {}

  /** Sends the daily report immediately via whatever channels are currently configured — lets a user verify their setup without waiting for the scheduled time. */
  @Post('test')
  async sendTest(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId: user.userId } });
    if (!profile || profile.dailyReportChannels.length === 0) {
      throw new BadRequestException('Enable at least one notification channel in Settings first.');
    }

    const sent: string[] = [];

    if (profile.dailyReportChannels.includes('TELEGRAM')) {
      const link = await this.prisma.telegramLink.findUnique({ where: { userId: user.userId } });
      if (link?.chatId) {
        const text = await this.notificationsService.buildReportText(user.userId);
        await this.telegramService.sendMessage(link.chatId, text);
        sent.push('TELEGRAM');
      }
    }

    if (profile.dailyReportChannels.includes('EMAIL')) {
      const html = await this.notificationsService.buildReportHtml(user.userId);
      await this.emailService.sendDailyReport(profile.notificationEmail ?? user.email, 'Your Daily Alpha-Trade Report', html);
      sent.push('EMAIL');
    }

    return { sent };
  }
}
