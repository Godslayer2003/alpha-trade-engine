import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AssetClass } from '@alpha-trade/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { MarketService } from '../market/market.service';

export interface Mover {
  symbol: string;
  assetClass: AssetClass;
  price: number;
  pctChange: number;
  zScore: number;
  asOf: string;
}

// A fixed, curated watchlist rather than a full-market screener — there's no
// screener data source wired up (Yahoo's public chart endpoint is per-symbol
// only), so "unusual movers" means unusual *within this list* of liquid
// large-cap stocks and broad/sector ETFs, not the entire market.
const WATCHLIST: string[] = [
  // Mega/large-cap stocks across sectors
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'V', 'UNH',
  'XOM', 'WMT', 'PG', 'HD', 'DIS', 'NFLX', 'AMD', 'INTC', 'BA', 'KO',
  // Broad-market & sector ETFs
  'SPY', 'QQQ', 'DIA', 'IWM', 'XLF', 'XLE', 'XLK', 'XLV', 'XLY', 'XLI',
  'GLD', 'SLV', 'TLT', 'ARKK', 'VTI', 'EEM', 'SMH', 'XBI',
];

// A move only counts as "abnormal" if it clears both bars: large relative to
// the symbol's own recent volatility (z-score) AND large in absolute terms
// — the first alone would flag ordinary noise in already-choppy names, the
// second alone would miss a genuinely unusual move in a normally-quiet ETF.
const MIN_ABS_PCT_CHANGE = 3;
const MIN_ABS_Z_SCORE = 2;
const BASELINE_WINDOW = 20;
const TOP_N = 10;
const CONCURRENCY = 8;

@Injectable()
export class MoversService {
  private readonly logger = new Logger(MoversService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketService: MarketService,
  ) {}

  async getOrScan(): Promise<Mover[]> {
    const scanDate = new Date().toISOString().slice(0, 10);
    const cached = await this.prisma.moverScan.findUnique({ where: { scanDate } });
    if (cached) return cached.movers as unknown as Mover[];
    return this.scan(scanDate);
  }

  private async scan(scanDate: string): Promise<Mover[]> {
    const evaluated: Mover[] = [];

    for (let i = 0; i < WATCHLIST.length; i += CONCURRENCY) {
      const batch = WATCHLIST.slice(i, i + CONCURRENCY);
      const settled = await Promise.allSettled(batch.map((symbol) => this.evaluate(symbol)));
      for (const outcome of settled) {
        if (outcome.status === 'fulfilled' && outcome.value) evaluated.push(outcome.value);
        else if (outcome.status === 'rejected') {
          this.logger.warn(`Movers scan: symbol evaluation failed: ${(outcome.reason as Error).message}`);
        }
      }
    }

    const movers = evaluated
      .filter((m) => Math.abs(m.pctChange) >= MIN_ABS_PCT_CHANGE && Math.abs(m.zScore) >= MIN_ABS_Z_SCORE)
      .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))
      .slice(0, TOP_N);

    await this.prisma.moverScan.upsert({
      where: { scanDate },
      create: { scanDate, movers: movers as unknown as Prisma.InputJsonValue },
      update: { movers: movers as unknown as Prisma.InputJsonValue },
    });

    return movers;
  }

  private async evaluate(symbol: string): Promise<Mover | null> {
    try {
      const candles = await this.marketService.getCandles({
        symbol,
        assetClass: AssetClass.EQUITY,
        timeframe: '1D',
      });
      if (candles.length < BASELINE_WINDOW + 2) return null;

      const closes = candles.map((c) => c.close);
      const returns: number[] = [];
      for (let i = 1; i < closes.length; i++) {
        returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
      }

      const latestReturn = returns[returns.length - 1];
      const baseline = returns.slice(0, -1).slice(-BASELINE_WINDOW);
      const mean = baseline.reduce((s, r) => s + r, 0) / baseline.length;
      const variance = baseline.reduce((s, r) => s + (r - mean) ** 2, 0) / baseline.length;
      const stddev = Math.sqrt(variance);
      if (stddev === 0) return null;

      const last = candles[candles.length - 1];
      return {
        symbol,
        assetClass: AssetClass.EQUITY,
        price: last.close,
        pctChange: latestReturn * 100,
        zScore: (latestReturn - mean) / stddev,
        asOf: last.time,
      };
    } catch (err) {
      this.logger.warn(`Movers scan: skipping ${symbol} (${(err as Error).message})`);
      return null;
    }
  }
}
