import { BadRequestException, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Controller('api/v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  /** Sends the daily report immediately via whatever channels are currently configured — lets a user verify their setup without waiting for the scheduled time. */
  @Post('test')
  async sendTest(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId: user.userId } });
    if (!profile || profile.dailyReportChannels.length === 0) {
      throw new BadRequestException('Enable at least one notification channel in Settings first.');
    }

    return this.notificationsService.dispatchToChannels(
      user.userId,
      user.email,
      profile.notificationEmail,
      profile.dailyReportChannels,
    );
  }
}
