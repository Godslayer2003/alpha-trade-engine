import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketService } from '../market/market.service';
import { TradeDto } from './dto/trade.dto';
import { STARTING_CASH_BALANCE } from '../common/constants';

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketService: MarketService,
  ) {}

  async getPortfolio(userId: string) {
    const portfolio = await this.findPortfolioOrThrow(userId);

    const holdings = await Promise.all(
      portfolio.holdings.map(async (holding) => {
        try {
          const quote = await this.marketService.getQuote(holding.ticker, holding.assetClass);
          const unrealizedPnL = (quote.price - holding.averagePrice) * holding.quantity;
          await this.prisma.holding.update({
            where: { id: holding.id },
            data: { currentPrice: quote.price, unrealizedPnL },
          });
          return { ...holding, currentPrice: quote.price, unrealizedPnL };
        } catch {
          // Quote fetch failed (upstream data source down) — fall back to last known values
          // rather than failing the whole portfolio view.
          return holding;
        }
      }),
    );

    const totalValue =
      portfolio.cashBalance + holdings.reduce((sum, h) => sum + h.currentPrice * h.quantity, 0);

    return {
      id: portfolio.id,
      cashBalance: portfolio.cashBalance,
      totalValue,
      holdings,
    };
  }

  // Reconstructs an approximate equity curve and realized-P&L stats purely
  // from trade history + the current live portfolio value — no scheduled
  // snapshot job exists, so between-trade granularity is stepped (valued at
  // each trade's own fill price, not continuous intraday marks).
  async getPerformance(userId: string) {
    const portfolio = await this.findPortfolioOrThrow(userId);
    const trades = await this.prisma.trade.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: { executedAt: 'asc' },
    });

    // Reverse-engineer the starting cash from the current balance plus the
    // net cash effect of every trade, rather than assuming a fixed constant.
    const netCashFromTrades = trades.reduce(
      (sum, t) => sum + (t.side === 'SELL' ? t.price * t.quantity : -t.price * t.quantity),
      0,
    );
    const startingCash = portfolio.cashBalance - netCashFromTrades;

    let runningCash = startingCash;
    const positions = new Map<string, { qty: number; avgCost: number; lastPrice: number }>();
    const equityCurve: { t: string; value: number }[] = [];
    let realizedPnL = 0;
    let sellCount = 0;
    let wins = 0;
    let bestTrade: { ticker: string; pnl: number; executedAt: string } | null = null;
    let worstTrade: { ticker: string; pnl: number; executedAt: string } | null = null;

    for (const trade of trades) {
      const key = `${trade.ticker}:${trade.assetClass}`;
      const existing = positions.get(key);

      if (trade.side === 'BUY') {
        runningCash -= trade.price * trade.quantity;
        const prevQty = existing?.qty ?? 0;
        const prevCost = existing?.avgCost ?? 0;
        const newQty = prevQty + trade.quantity;
        const newAvgCost = (prevCost * prevQty + trade.price * trade.quantity) / newQty;
        positions.set(key, { qty: newQty, avgCost: newAvgCost, lastPrice: trade.price });
      } else {
        runningCash += trade.price * trade.quantity;
        const avgCost = existing?.avgCost ?? trade.price;
        const pnl = (trade.price - avgCost) * trade.quantity;
        realizedPnL += pnl;
        sellCount += 1;
        if (pnl > 0) wins += 1;
        const entry = { ticker: trade.ticker, pnl, executedAt: trade.executedAt.toISOString() };
        if (!bestTrade || pnl > bestTrade.pnl) bestTrade = entry;
        if (!worstTrade || pnl < worstTrade.pnl) worstTrade = entry;

        const remainingQty = (existing?.qty ?? trade.quantity) - trade.quantity;
        if (remainingQty > 0) {
          positions.set(key, { qty: remainingQty, avgCost, lastPrice: trade.price });
        } else {
          positions.delete(key);
        }
      }

      const positionsValue = Array.from(positions.values()).reduce(
        (sum, p) => sum + p.qty * p.lastPrice,
        0,
      );
      equityCurve.push({ t: trade.executedAt.toISOString(), value: runningCash + positionsValue });
    }

    const live = await this.getPortfolio(userId);
    equityCurve.push({ t: new Date().toISOString(), value: live.totalValue });

    return {
      startingCash,
      equityCurve,
      totalReturnPct: startingCash > 0 ? ((live.totalValue - startingCash) / startingCash) * 100 : 0,
      realizedPnL,
      winRate: sellCount > 0 ? wins / sellCount : null,
      tradeCount: trades.length,
      bestTrade,
      worstTrade,
    };
  }

  async getTrades(userId: string) {
    const portfolio = await this.findPortfolioOrThrow(userId);
    return this.prisma.trade.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: { executedAt: 'desc' },
    });
  }

  /** Wipes trade history and holdings, restoring cash to the original starting balance. */
  async resetPortfolio(userId: string) {
    const portfolio = await this.findPortfolioOrThrow(userId);

    await this.prisma.$transaction([
      this.prisma.trade.deleteMany({ where: { portfolioId: portfolio.id } }),
      this.prisma.holding.deleteMany({ where: { portfolioId: portfolio.id } }),
      this.prisma.portfolio.update({
        where: { id: portfolio.id },
        data: { cashBalance: STARTING_CASH_BALANCE, totalValue: STARTING_CASH_BALANCE },
      }),
    ]);

    return this.getPortfolio(userId);
  }

  async executeTrade(userId: string, dto: TradeDto) {
    const portfolio = await this.findPortfolioOrThrow(userId);
    const quote = await this.marketService.getQuote(dto.symbol, dto.assetClass);
    const cost = quote.price * dto.quantity;

    const existingHolding = await this.prisma.holding.findUnique({
      where: {
        portfolioId_ticker_assetClass: {
          portfolioId: portfolio.id,
          ticker: dto.symbol,
          assetClass: dto.assetClass,
        },
      },
    });

    if (dto.side === 'BUY') {
      if (cost > portfolio.cashBalance) {
        throw new BadRequestException(
          `Insufficient cash: trade costs ${cost.toFixed(2)}, available ${portfolio.cashBalance.toFixed(2)}.`,
        );
      }

      await this.prisma.$transaction([
        this.prisma.portfolio.update({
          where: { id: portfolio.id },
          data: { cashBalance: { decrement: cost } },
        }),
        existingHolding
          ? this.prisma.holding.update({
              where: { id: existingHolding.id },
              data: {
                quantity: existingHolding.quantity + dto.quantity,
                averagePrice:
                  (existingHolding.averagePrice * existingHolding.quantity + cost) /
                  (existingHolding.quantity + dto.quantity),
                currentPrice: quote.price,
              },
            })
          : this.prisma.holding.create({
              data: {
                portfolioId: portfolio.id,
                ticker: dto.symbol,
                assetClass: dto.assetClass,
                quantity: dto.quantity,
                averagePrice: quote.price,
                currentPrice: quote.price,
                unrealizedPnL: 0,
              },
            }),
        this.prisma.trade.create({
          data: {
            portfolioId: portfolio.id,
            ticker: dto.symbol,
            assetClass: dto.assetClass,
            side: 'BUY',
            quantity: dto.quantity,
            price: quote.price,
          },
        }),
      ]);
    } else {
      if (!existingHolding || existingHolding.quantity < dto.quantity) {
        throw new BadRequestException(
          `Insufficient shares: you hold ${existingHolding?.quantity ?? 0} of ${dto.symbol}, tried to sell ${dto.quantity}.`,
        );
      }

      const remaining = existingHolding.quantity - dto.quantity;

      await this.prisma.$transaction([
        this.prisma.portfolio.update({
          where: { id: portfolio.id },
          data: { cashBalance: { increment: cost } },
        }),
        remaining === 0
          ? this.prisma.holding.delete({ where: { id: existingHolding.id } })
          : this.prisma.holding.update({
              where: { id: existingHolding.id },
              data: { quantity: remaining, currentPrice: quote.price },
            }),
        this.prisma.trade.create({
          data: {
            portfolioId: portfolio.id,
            ticker: dto.symbol,
            assetClass: dto.assetClass,
            side: 'SELL',
            quantity: dto.quantity,
            price: quote.price,
          },
        }),
      ]);
    }

    return this.getPortfolio(userId);
  }

  private async findPortfolioOrThrow(userId: string) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { userId },
      include: { holdings: true },
    });
    if (!portfolio) {
      throw new NotFoundException('No portfolio found for this account.');
    }
    return portfolio;
  }
}
