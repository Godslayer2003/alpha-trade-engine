import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { TelegramService } from '../telegram/telegram.service';
import { EmailService } from '../email/email.service';

const currency = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

interface LocalClock {
  minutesSinceMidnight: number;
  dateKey: string; // YYYY-MM-DD in the target timezone
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly portfolioService: PortfolioService,
    private readonly telegramService: TelegramService,
    private readonly emailService: EmailService,
  ) {}

  // Runs every 5 minutes; each run buckets "now" into a 5-minute window per
  // user's own timezone and fires for anyone whose configured time falls in
  // that window — handles arbitrary (non-5-aligned) times a user might pick.
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleDailyReports() {
    const candidates = await this.prisma.userProfile.findMany({
      where: { dailyReportEnabled: true },
      include: { user: true },
    });

    for (const profile of candidates) {
      try {
        const clock = this.getLocalClock(profile.dailyReportTimezone);
        if (!this.isDue(profile.dailyReportTime, clock.minutesSinceMidnight)) continue;
        if (this.alreadySentToday(profile.lastDailyReportSentAt, profile.dailyReportTimezone, clock.dateKey)) continue;

        await this.sendReport(profile.userId, profile.user.email, profile.notificationEmail, profile.dailyReportChannels);

        await this.prisma.userProfile.update({
          where: { id: profile.id },
          data: { lastDailyReportSentAt: new Date() },
        });
      } catch (err) {
        this.logger.warn(`Daily report failed for user ${profile.userId}: ${(err as Error).message}`);
      }
    }
  }

  private async sendReport(
    userId: string,
    accountEmail: string,
    notificationEmail: string | null,
    channels: string[],
  ) {
    if (channels.includes('TELEGRAM')) {
      const link = await this.prisma.telegramLink.findUnique({ where: { userId } });
      if (link?.chatId) {
        const text = await this.buildReportText(userId);
        await this.telegramService.sendMessage(link.chatId, text);
      }
    }

    if (channels.includes('EMAIL')) {
      const html = await this.buildReportHtml(userId);
      await this.emailService.sendDailyReport(notificationEmail ?? accountEmail, 'Your Daily Alpha-Trade Report', html);
    }
  }

  async buildReportText(userId: string): Promise<string> {
    const [portfolio, performance] = await Promise.all([
      this.portfolioService.getPortfolio(userId),
      this.portfolioService.getPerformance(userId),
    ]);

    const lines = [
      '📊 Your Daily Portfolio Report',
      '',
      `💰 Cash: ${currency(portfolio.cashBalance)}`,
      `📈 Total value: ${currency(portfolio.totalValue)}`,
      `${performance.totalReturnPct >= 0 ? '📈' : '📉'} Total return: ${performance.totalReturnPct.toFixed(2)}%`,
    ];

    if (portfolio.holdings.length > 0) {
      lines.push('', 'Holdings:');
      for (const h of portfolio.holdings) {
        lines.push(
          `• ${h.ticker}: ${h.quantity} @ avg ${currency(h.averagePrice)}, now ${currency(h.currentPrice)} (${h.unrealizedPnL >= 0 ? '+' : ''}${currency(h.unrealizedPnL)})`,
        );
      }
    } else {
      lines.push('', 'No open positions right now.');
    }

    if (performance.bestTrade) {
      lines.push('', `🏆 Best trade: ${performance.bestTrade.ticker} +${currency(performance.bestTrade.pnl)}`);
    }
    if (performance.worstTrade && performance.worstTrade.pnl < 0) {
      lines.push(`💀 Worst trade: ${performance.worstTrade.ticker} ${currency(performance.worstTrade.pnl)}`);
    }

    lines.push('', 'Practice portfolio — not financial advice.');
    return lines.join('\n');
  }

  async buildReportHtml(userId: string): Promise<string> {
    const text = await this.buildReportText(userId);
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');
    return `<div style="font-family: -apple-system, sans-serif; font-size: 14px; color: #0f172a;">${escaped}</div>`;
  }

  private getLocalClock(timezone: string): LocalClock {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((p) => [p.type, p.value]));
    const hour = Number(parts.hour === '24' ? '0' : parts.hour);
    const minute = Number(parts.minute);
    return {
      minutesSinceMidnight: hour * 60 + minute,
      dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    };
  }

  private isDue(dailyReportTime: string, currentMinutes: number): boolean {
    const [h, m] = dailyReportTime.split(':').map(Number);
    const targetMinutes = h * 60 + m;
    const diff = (targetMinutes - currentMinutes + 1440) % 1440;
    return diff < 5;
  }

  private alreadySentToday(lastSentAt: Date | null, timezone: string, todayKey: string): boolean {
    if (!lastSentAt) return false;
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = Object.fromEntries(formatter.formatToParts(lastSentAt).map((p) => [p.type, p.value]));
    const lastSentKey = `${parts.year}-${parts.month}-${parts.day}`;
    return lastSentKey === todayKey;
  }
}
