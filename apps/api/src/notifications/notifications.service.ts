import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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

export function isWithinDueWindow(dailyReportTime: string, currentMinutes: number): boolean {
  const [hours, minutes] = dailyReportTime.split(':').map(Number);
  const targetMinutes = hours * 60 + minutes;
  const minutesSinceTarget = (currentMinutes - targetMinutes + 1440) % 1440;
  return minutesSinceTarget < 5;
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

        const { sent, errors } = await this.dispatchToChannels(
          profile.userId,
          profile.user.email,
          profile.notificationEmail,
          profile.dailyReportChannels,
        );
        if (errors.length > 0) {
          this.logger.warn(`Daily report partially failed for user ${profile.userId}: ${errors.join('; ')}`);
        }

        if (sent.length > 0) {
          await this.prisma.userProfile.update({
            where: { id: profile.id },
            data: { lastDailyReportSentAt: new Date() },
          });
        }
      } catch (err) {
        this.logger.warn(`Daily report failed for user ${profile.userId}: ${(err as Error).message}`);
      }
    }
  }

  /** Runs the Daily Portfolio Briefing workflow on demand for one user. */
  async runBriefingForUser(userId: string): Promise<{ sent: string[]; errors: string[] }> {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId }, include: { user: true } });
    if (!profile) throw new NotFoundException('No profile for this user.');
    return this.dispatchToChannels(profile.userId, profile.user.email, profile.notificationEmail, profile.dailyReportChannels);
  }

  /** Sends a workflow-specific message through the user's existing notification channels. */
  async sendWorkflowMessage(
    userId: string,
    subject: string,
    text: string,
  ): Promise<{ sent: string[]; errors: string[] }> {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId }, include: { user: true } });
    if (!profile) throw new NotFoundException('No profile for this user.');

    const sent: string[] = [];
    const errors: string[] = [];
    if (profile.dailyReportChannels.includes('TELEGRAM')) {
      try {
        const link = await this.prisma.telegramLink.findUnique({ where: { userId } });
        if (!link?.chatId) errors.push('Telegram: not linked yet — use "Connect Telegram" first.');
        else {
          await this.telegramService.sendMessage(link.chatId, text);
          sent.push('TELEGRAM');
        }
      } catch (err) {
        errors.push(`Telegram: ${(err as Error).message}`);
      }
    }
    if (profile.dailyReportChannels.includes('EMAIL')) {
      try {
        const html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
        await this.emailService.sendDailyReport(profile.notificationEmail ?? profile.user.email, subject, html);
        sent.push('EMAIL');
      } catch (err) {
        errors.push(`Email: ${(err as Error).message}`);
      }
    }
    return { sent, errors };
  }

  /** Sends the daily briefing via whichever channels are given, isolating failures per channel. */
  async dispatchToChannels(
    userId: string,
    accountEmail: string,
    notificationEmail: string | null,
    channels: string[],
  ): Promise<{ sent: string[]; errors: string[] }> {
    const sent: string[] = [];
    const errors: string[] = [];

    // Each channel is isolated so one failing channel (e.g. no
    // RESEND_API_KEY) can't stop a working channel from sending, and can't
    // stop lastDailyReportSentAt from being recorded in handleDailyReports
    // above — which would otherwise leave the user permanently "due" and
    // re-triggered on every 5-minute cron tick.
    if (channels.includes('TELEGRAM')) {
      try {
        const link = await this.prisma.telegramLink.findUnique({ where: { userId } });
        if (!link?.chatId) {
          errors.push('Telegram: not linked yet — use "Connect Telegram" first.');
        } else {
          const text = await this.buildReportText(userId);
          await this.telegramService.sendMessage(link.chatId, text);
          sent.push('TELEGRAM');
        }
      } catch (err) {
        errors.push(`Telegram: ${(err as Error).message}`);
      }
    }

    if (channels.includes('EMAIL')) {
      try {
        const html = await this.buildReportHtml(userId);
        await this.emailService.sendDailyReport(notificationEmail ?? accountEmail, 'Your Daily Alpha-Trade Report', html);
        sent.push('EMAIL');
      } catch (err) {
        errors.push(`Email: ${(err as Error).message}`);
      }
    }

    return { sent, errors };
  }

  async buildReportText(userId: string): Promise<string> {
    const portfolio = await this.portfolioService.getPortfolio(userId);
    const performance = await this.portfolioService.getPerformance(userId, portfolio);

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
    return isWithinDueWindow(dailyReportTime, currentMinutes);
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
