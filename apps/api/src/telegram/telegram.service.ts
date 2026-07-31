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

  onModuleInit() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — Telegram bot disabled.');
      return;
    }

    this.bot = new Telegraf(token);
    this.registerHandlers(this.bot);
    this.bot.launch();
    this.logger.log('Telegram bot started (long polling).');
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
