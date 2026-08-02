import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AssetClass } from '@alpha-trade/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { MarketService } from '../market/market.service';

interface HoldingSnapshot {
  id: string;
  portfolioId: string;
  ticker: string;
  assetClass: AssetClass;
  stopLossPrice: number;
}

@Injectable()
export class StopLossService {
  private readonly logger = new Logger(StopLossService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketService: MarketService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkStopLosses() {
    const holdings = await this.prisma.holding.findMany({
      where: { stopLossPrice: { not: null } },
    });

    for (const holding of holdings) {
      if (holding.stopLossPrice === null) continue;
      try {
        await this.checkOne(holding as HoldingSnapshot);
      } catch (err) {
        this.logger.warn(`Stop-loss check failed for holding ${holding.id}: ${(err as Error).message}`);
      }
    }
  }

  private async checkOne(snapshot: HoldingSnapshot) {
    const quote = await this.marketService.getQuote(snapshot.ticker, snapshot.assetClass);
    if (quote.price > snapshot.stopLossPrice) return;

    await this.prisma.$transaction(async (tx) => {
      // Guarded on stopLossPrice still matching this snapshot (not since
      // cleared, changed, or already triggered by an earlier tick / a
      // concurrent manual sell) — same guarded-conditional-update pattern
      // executeTrade uses, so this can't double-trigger.
      const claimed = await tx.holding.updateMany({
        where: { id: snapshot.id, stopLossPrice: snapshot.stopLossPrice, quantity: { gt: 0 } },
        data: { stopLossPrice: null },
      });
      if (claimed.count === 0) return;

      const fresh = await tx.holding.findUniqueOrThrow({ where: { id: snapshot.id } });
      await tx.holding.delete({ where: { id: snapshot.id } });
      await tx.portfolio.update({
        where: { id: snapshot.portfolioId },
        data: { cashBalance: { increment: quote.price * fresh.quantity } },
      });
      await tx.trade.create({
        data: {
          portfolioId: snapshot.portfolioId,
          ticker: snapshot.ticker,
          assetClass: snapshot.assetClass,
          side: 'SELL',
          quantity: fresh.quantity,
          price: quote.price,
          triggeredByStopLoss: true,
        },
      });

      this.logger.log(
        `Stop-loss triggered: sold ${fresh.quantity} ${snapshot.ticker} @ ${quote.price} (stop was ${snapshot.stopLossPrice})`,
      );
    });
  }
}
