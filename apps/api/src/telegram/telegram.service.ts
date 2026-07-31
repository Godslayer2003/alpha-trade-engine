import { randomBytes } from 'crypto';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Context, Telegraf } from 'telegraf';
import { AssetClass } from '@alpha-trade/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { AnalysisService } from '../analysis/analysis.service';
import { AssistantService } from '../assistant/assistant.service';

const currency = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly portfolioService: PortfolioService,
    private readonly analysisService: AnalysisService,
    private readonly assistantService: AssistantService,
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

  // Railway's rolling deploys briefly run the old and new containers at
  // once, so the new instance's first getUpdates call reliably 409s against
  // the still-shutting-down old one. A Telegraf instance whose launch()
  // already rejected can't just be re-launched (its internal polling state
  // is left inconsistent and a second launch() call on the same object
  // silently hangs) — build a fresh Telegraf each attempt instead.
  private launchWithRetry(attempt = 1) {
    const bot = new Telegraf(this.token!);
    bot.catch((err, ctx) => {
      this.logger.error(`Unhandled error in Telegram handler: ${(err as Error).message}`, (err as Error).stack);
      ctx.reply('Something went wrong handling that — try again in a moment.').catch(() => {});
    });
    this.registerHandlers(bot);

    bot
      .launch()
      .then(() => {
        this.bot = bot;
        this.logger.log('Telegram bot started (long polling).');
      })
      .catch((err) => {
        this.logger.warn(`Telegram bot launch attempt ${attempt} failed: ${(err as Error).message}`);
        // Keeps retrying indefinitely (capped backoff) rather than giving up —
        // a stale container from a previous deploy can hold the getUpdates
        // lock longer than a few quick attempts would cover.
        const delay = Math.min(attempt * 5_000, 30_000);
        setTimeout(() => this.launchWithRetry(attempt + 1), delay);
      });
  }

  onModuleDestroy() {
    this.bot?.stop('module_destroy');
  }

  async createLinkCode(userId: string): Promise<string> {
    const code = randomBytes(4).toString('hex');
    await this.prisma.telegramLink.upsert({
      where: { userId },
      create: { userId, linkCode: code },
      update: { linkCode: code },
    });
    return code;
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
      try {
        const reply = await this.assistantService.chat([{ role: 'user', content: question }]);
        await ctx.reply(reply);
      } catch (err) {
        await ctx.reply(`Could not reach the AI guide: ${(err as Error).message}`);
      }
    });
  }

  private async handleLink(ctx: Context, code: string) {
    const link = await this.prisma.telegramLink.findUnique({ where: { linkCode: code } });
    if (!link) {
      await ctx.reply('That code is invalid or expired — generate a new one from the dashboard.');
      return;
    }
    const chatId = String(ctx.chat!.id);
    await this.prisma.telegramLink.update({
      where: { id: link.id },
      data: { chatId, linkedAt: new Date() },
    });
    await ctx.reply('Linked! Try /portfolio, /signal <symbol>, or /ask <question>.');
  }

  private async requireLinkedUser(ctx: { chat: { id: number }; reply: (text: string) => Promise<unknown> }) {
    const link = await this.prisma.telegramLink.findUnique({ where: { chatId: String(ctx.chat.id) } });
    if (!link) {
      await ctx.reply('Not linked yet. Get a code from the dashboard and send /link <code>.');
      return null;
    }
    return link.userId;
  }
}
