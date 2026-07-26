import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketService } from '../market/market.service';
import { TradeDto } from './dto/trade.dto';

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

  async getTrades(userId: string) {
    const portfolio = await this.findPortfolioOrThrow(userId);
    return this.prisma.trade.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: { executedAt: 'desc' },
    });
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
