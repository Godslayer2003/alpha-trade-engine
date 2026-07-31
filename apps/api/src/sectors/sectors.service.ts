import { Injectable } from '@nestjs/common';
import { CompanyRecommendation, InvestmentStyle, Sector } from '@alpha-trade/shared-types';

@Injectable()
export class SectorsService {
  private readonly SECTOR_MATRIX: Record<Sector, CompanyRecommendation[]> = {
    [Sector.TECHNOLOGY]: [
      {
        ticker: 'QQQ',
        companyName: 'Invesco QQQ Trust (Nasdaq-100 ETF)',
        reason: 'Broad, diversified large-cap tech exposure — a standard long-term compounding vehicle.',
        suitableStyles: [InvestmentStyle.LONG_TERM_HOLD, InvestmentStyle.WEEKEND_POSITIONING],
      },
      {
        ticker: 'NVDA',
        companyName: 'NVIDIA Corporation',
        reason: 'High liquidity and volatility make it a common name for swing and day setups.',
        suitableStyles: [InvestmentStyle.SWING_TRADING, InvestmentStyle.DAY_TRADING],
      },
      {
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        reason: 'Deep options chain and steady liquidity suit premium-selling strategies.',
        suitableStyles: [InvestmentStyle.OPTIONS_INCOME, InvestmentStyle.LONG_TERM_HOLD],
      },
    ],
    [Sector.HEALTHCARE]: [
      {
        ticker: 'UNH',
        companyName: 'UnitedHealth Group',
        reason: 'Defensive large-cap with steady long-term fundamentals.',
        suitableStyles: [InvestmentStyle.LONG_TERM_HOLD],
      },
      {
        ticker: 'LLY',
        companyName: 'Eli Lilly and Company',
        reason: 'Strong recent momentum and news-driven volatility fit swing timeframes.',
        suitableStyles: [InvestmentStyle.SWING_TRADING, InvestmentStyle.WEEKEND_POSITIONING],
      },
    ],
    [Sector.FINANCIALS]: [
      {
        ticker: 'JPM',
        companyName: 'JPMorgan Chase & Co.',
        reason: 'Rate-sensitive large-cap with liquid weekly options for income strategies.',
        suitableStyles: [InvestmentStyle.OPTIONS_INCOME, InvestmentStyle.LONG_TERM_HOLD],
      },
      {
        ticker: 'XLF',
        companyName: 'Financial Select Sector SPDR Fund',
        reason: 'Sector-wide exposure useful for weekend positioning ahead of rate decisions.',
        suitableStyles: [InvestmentStyle.WEEKEND_POSITIONING],
      },
    ],
    [Sector.ENERGY]: [
      {
        ticker: 'XLE',
        companyName: 'Energy Select Sector SPDR Fund',
        reason: 'Tracks the broader energy sector, smoothing out single-name commodity risk.',
        suitableStyles: [InvestmentStyle.LONG_TERM_HOLD, InvestmentStyle.WEEKEND_POSITIONING],
      },
      {
        ticker: 'XOM',
        companyName: 'Exxon Mobil Corporation',
        reason: 'High-volume large-cap that reacts sharply to oil price swings — a day-trading staple.',
        suitableStyles: [InvestmentStyle.DAY_TRADING, InvestmentStyle.SWING_TRADING],
      },
    ],
    [Sector.CONSUMER_DISCRETIONARY]: [
      {
        ticker: 'AMZN',
        companyName: 'Amazon.com, Inc.',
        reason: 'High liquidity and consistent trend behavior suit swing entries.',
        suitableStyles: [InvestmentStyle.SWING_TRADING, InvestmentStyle.LONG_TERM_HOLD],
      },
      {
        ticker: 'TSLA',
        companyName: 'Tesla, Inc.',
        reason: 'Elevated intraday range and volume make it a common day-trading name.',
        suitableStyles: [InvestmentStyle.DAY_TRADING],
      },
    ],
    [Sector.INDUSTRIALS]: [
      {
        ticker: 'CAT',
        companyName: 'Caterpillar Inc.',
        reason: 'Cyclical large-cap with a strong long-term dividend growth record.',
        suitableStyles: [InvestmentStyle.LONG_TERM_HOLD],
      },
      {
        ticker: 'XLI',
        companyName: 'Industrial Select Sector SPDR Fund',
        reason: 'Diversified industrial exposure for lower-turnover weekend positioning.',
        suitableStyles: [InvestmentStyle.WEEKEND_POSITIONING],
      },
    ],
  };

  listSectors(): Sector[] {
    return Object.values(Sector);
  }

  recommend(sector: Sector, style?: InvestmentStyle): CompanyRecommendation[] {
    const companies = this.SECTOR_MATRIX[sector] ?? [];
    if (!style) return companies;
    return companies.filter((c) => c.suitableStyles.includes(style));
  }

  /** Flattens every sector's matrix and filters to companies suited to a style — used by the recommendation engine. */
  recommendAcrossSectors(style: InvestmentStyle, limit = 5): CompanyRecommendation[] {
    return Object.values(this.SECTOR_MATRIX)
      .flat()
      .filter((c) => c.suitableStyles.includes(style))
      .slice(0, limit);
  }
}
