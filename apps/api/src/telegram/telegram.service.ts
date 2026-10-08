import { createHash, randomBytes } from 'crypto';
import { BadRequestException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Context, Telegraf } from 'telegraf';
import { AssetClass } from '@alpha-trade/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { AnalysisService } from '../analysis/analysis.service';
import { AssistantService } from '../assistant/assistant.service';
import { PaymentsService } from '../payments/payments.service';
import { SecurityQuotaService } from '../auth/security-quota.service';

const currency = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf | null = null;
  private launchGeneration = 0;
  private shuttingDown = false;
  private readonly launchTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly portfolioService: PortfolioService,
    private readonly analysisService: AnalysisService,
    private readonly assistantService: AssistantService,
    private readonly paymentsService: PaymentsService,
    private readonly quota: SecurityQuotaService,
  ) {}

  private token: string | null = null;

  onModuleInit() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — Telegram bot disabled.');
      return;
    }
    this.token = token;
    this.launchWithRetry();
  }

  // Rolling deploys can briefly run the old and new containers at
  // once, so the new instance's first getUpdates call reliably 409s against
  // the still-shutting-down old one. A Telegraf instance whose launch()
  // already rejected can't just be re-launched (its internal polling state
  // is left inconsistent and a second launch() call on the same object
  // silently hangs) — build a fresh Telegraf each attempt instead.
  //
  // Telegraf's launch() (see node_modules/telegraf/lib/telegraf.js) does
  // `await this.startPolling(...)`, which awaits an infinite polling loop
  // — it does NOT resolve on a successful connection, only once the bot is
  // stopped. It only *rejects*, and does so quickly (within a few
  // seconds), if something fails before the loop takes over: a bad token,
  // or a 409/401 on the very first getUpdates call. So "launch() resolved"
  // can never be used as a success signal — treat the absence of a fast
  // rejection within a grace window as success instead.
  private static readonly LAUNCH_GRACE_MS = 8_000;

  private launchWithRetry(attempt = 1) {
    if (this.shuttingDown || !this.token) return;
    const generation = ++this.launchGeneration;
    this.logger.log(`Telegram: launch attempt ${attempt} starting`);
    const bot = new Telegraf(this.token!);
    bot.catch((err, ctx) => {
      this.logger.error('Unhandled error in a Telegram command handler.');
      ctx.reply('Something went wrong handling that — try again in a moment.').catch(() => {});
    });
    this.registerHandlers(bot);

    let markedRunning = false;
    let graceTimer: ReturnType<typeof setTimeout>;

    bot.launch().catch((err) => {
      if (generation !== this.launchGeneration) return;
      clearTimeout(graceTimer);
      this.launchTimers.delete(graceTimer);
      if (markedRunning) {
        // Was healthy past the grace window, but the connection has now
        // genuinely failed (e.g. a conflicting poller started later) —
        // clear it so sendMessage() doesn't keep trying a dead instance.
        this.bot = null;
      }
      this.logger.warn(`Telegram bot launch attempt ${attempt} failed.`);
      // Keeps retrying indefinitely (capped backoff) rather than giving up —
      // a stale container from a previous deploy can hold the getUpdates
      // lock longer than a few quick attempts would cover.
      const delay = Math.min(attempt * 5_000, 30_000);
      this.logger.log(`Telegram: retrying in ${delay}ms`);
      const retryTimer = setTimeout(() => {
        this.launchTimers.delete(retryTimer);
        if (this.shuttingDown) return;
        this.logger.log('Telegram: retry timer fired');
        this.launchWithRetry(attempt + 1);
      }, delay);
      this.launchTimers.add(retryTimer);
    });

    graceTimer = setTimeout(() => {
      this.launchTimers.delete(graceTimer);
      if (generation !== this.launchGeneration) return;
      markedRunning = true;
      this.bot = bot;
      this.logger.log('Telegram bot started (long polling).');
    }, TelegramService.LAUNCH_GRACE_MS);
    this.launchTimers.add(graceTimer);
  }

  onModuleDestroy() {
    this.shuttingDown = true;
    this.launchGeneration += 1;
    for (const timer of this.launchTimers) clearTimeout(timer);
    this.launchTimers.clear();
    this.bot?.stop('module_destroy');
    this.bot = null;
  }

  /** Proactive push (e.g. from the daily-report cron), separate from the reactive command handlers below. */
  async sendMessage(chatId: string, text: string): Promise<void> {
    if (!/^[1-9]\d*$/.test(chatId)) {
      throw new Error('Account notifications require a private Telegram chat. Relink from Settings.');
    }
    if (!this.bot) {
      throw new Error('Telegram bot is not currently running — cannot send message.');
    }
    await this.bot.telegram.sendMessage(chatId, text);
  }

  /** Sends a minimal ping so a user can verify their Telegram link actually works — the "Telegram Test Message" component. */
  async sendTestMessage(userId: string): Promise<void> {
    const link = await this.prisma.telegramLink.findUnique({ where: { userId } });
    if (!link?.chatId) {
      throw new BadRequestException('Telegram is not linked yet — use "Connect Telegram" first.');
    }
    await this.sendMessage(link.chatId, 'Test message from Alpha-Trade Engine — your Telegram connection is working.');
  }

  async getLinkStatus(userId: string): Promise<{ linked: boolean; linkedAt: string | null }> {
    const link = await this.prisma.telegramLink.findUnique({ where: { userId } });
    return { linked: !!link?.chatId && /^[1-9]\d*$/.test(link.chatId), linkedAt: link?.linkedAt?.toISOString() ?? null };
  }

  async createLinkCode(userId: string): Promise<string> {
    await this.quota.consume('telegram-link-user', userId, 10, 900_000);
    const code = randomBytes(16).toString('hex');
    const linkCode = createHash('sha256').update(code).digest('hex');
    const linkCodeExpiresAt = new Date(Date.now() + 600_000);
    await this.prisma.telegramLink.upsert({
      where: { userId },
      create: { userId, linkCode, linkCodeExpiresAt },
      update: { linkCode, linkCodeExpiresAt },
    });
    return code;
  }

  async disconnect(userId: string): Promise<void> {
    await this.prisma.telegramLink.deleteMany({ where: { userId } });
  }

  private registerHandlers(bot: Telegraf) {
    bot.start(async (ctx) => {
      const payload = ctx.startPayload?.trim();
      if (payload) {
        await this.handleLink(ctx, payload);
        return;
      }
      await ctx.reply(
        'Welcome to Alpha-Trade Engine. Link your account from the dashboard\'s "Connect Telegram" ' +
          'button, then paste the code here with /link <code>.\n\nCommands: /portfolio, /signal <symbol>, /ask <question>',
      );
    });

    bot.command('link', async (ctx) => {
      const code = ctx.message.text.replace('/link', '').trim();
      if (!code) {
        await ctx.reply('Usage: /link <code> — get the code from the dashboard.');
        return;
      }
      await this.handleLink(ctx, code);
    });

    bot.command('portfolio', async (ctx) => {
      const userId = await this.requireLinkedUser(ctx);
      if (!userId) return;
      try {
        const portfolio = await this.portfolioService.getPortfolio(userId);
        const lines = [
          `Cash: ${currency(portfolio.cashBalance)}`,
          `Total value: ${currency(portfolio.totalValue)}`,
        ];
        if (portfolio.holdings.length > 0) {
          lines.push('', 'Holdings:');
          for (const h of portfolio.holdings) {
            lines.push(
              `${h.ticker} · ${h.quantity} @ avg ${currency(h.averagePrice)}, now ${currency(h.currentPrice)} (${h.unrealizedPnL >= 0 ? '+' : ''}${currency(h.unrealizedPnL)})`,
            );
          }
        }
        await ctx.reply(lines.join('\n'));
      } catch (err) {
        await ctx.reply(`Could not load portfolio: ${(err as Error).message}`);
      }
    });

    bot.command('signal', async (ctx) => {
      const symbol = ctx.message.text.replace('/signal', '').trim().toUpperCase();
      if (!symbol) {
        await ctx.reply('Usage: /signal <symbol> (e.g. /signal AAPL)');
        return;
      }
      try {
        const signal = await this.analysisService.getTradeSignal({
          symbol,
          assetClass: AssetClass.EQUITY,
          timeframe: '1D',
        });
        await ctx.reply(
          `${symbol}: ${signal.patternDetected} (${signal.dealType})\n` +
            `Entry ${signal.entryPrice}` +
            (signal.stopLoss !== null ? ` · Stop ${signal.stopLoss}` : '') +
            (signal.targetPrice !== null ? ` · Target ${signal.targetPrice}` : '') +
            `\nConfidence ${Math.round(signal.confidence * 100)}%\n\n${signal.disclaimer}`,
        );
      } catch (err) {
        await ctx.reply(`Could not get a signal: ${(err as Error).message}`);
      }
    });

    bot.command('ask', async (ctx) => {
      const question = ctx.message.text.replace('/ask', '').trim();
      if (!question) {
        await ctx.reply('Usage: /ask <question>');
        return;
      }
      if (question.length > 4_000) {
        await ctx.reply('Keep your question within 4,000 characters.');
        return;
      }
      try {
        const userId = await this.requireLinkedUser(ctx);
        if (!userId) return;
        const { paid } = await this.paymentsService.getStatus(userId);
        if (!paid) {
          await ctx.reply('AI Guide access is not unlocked for this account. Complete checkout in the dashboard first.');
          return;
        }
        await this.quota.consume('chat-user', userId, 50, 86_400_000);
        await this.quota.consume('ai-global', 'application', 500, 86_400_000);
        const result = await this.assistantService.chat([{ role: 'user', content: question }]);
        await ctx.reply(result.reply);
      } catch (err) {
        await ctx.reply(`Could not reach the AI guide: ${(err as Error).message}`);
      }
    });
  }

  private async handleLink(ctx: Context, code: string) {
    if (ctx.chat?.type !== 'private') {
      await ctx.reply('Link your account in a private chat with this bot, not a group.');
      return;
    }
    if (!/^[a-f0-9]{32}$/.test(code)) {
      await ctx.reply('That code is invalid or expired — generate a new one from the dashboard.');
      return;
    }
    try {
      await this.quota.consume('telegram-link-chat', String(ctx.chat.id), 5, 900_000);
      const result = await this.prisma.telegramLink.updateMany({
        where: { linkCode: createHash('sha256').update(code).digest('hex'), linkCodeExpiresAt: { gt: new Date() } },
        data: { chatId: String(ctx.chat.id), linkedAt: new Date(), linkCode: randomBytes(32).toString('hex'), linkCodeExpiresAt: null },
      });
      if (result.count !== 1) {
        await ctx.reply('That code is invalid or expired — generate a new one from the dashboard.');
        return;
      }
    } catch {
      await ctx.reply('Could not link this chat. Try again later or generate a new code in Settings.');
      return;
    }
    await ctx.reply('Linked! Try /portfolio, /signal <symbol>, or /ask <question>.');
  }

  private async requireLinkedUser(ctx: { chat?: { id: number; type: string }; reply: (text: string) => Promise<unknown> }) {
    if (ctx.chat?.type !== 'private') {
      await ctx.reply('Use a private chat with this bot for account commands.');
      return null;
    }
    const link = await this.prisma.telegramLink.findUnique({ where: { chatId: String(ctx.chat.id) } });
    if (!link) {
      await ctx.reply('Not linked yet. Get a code from the dashboard and send /link <code>.');
      return null;
    }
    return link.userId;
  }
}
