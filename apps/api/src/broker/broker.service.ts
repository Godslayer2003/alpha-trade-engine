import { Injectable } from '@nestjs/common';
import { BrokerMatch, InvestmentStyle } from '@alpha-trade/shared-types';

@Injectable()
export class BrokerService {
  private readonly RECOMMENDATION_MATRIX: Record<InvestmentStyle, BrokerMatch[]> = {
    [InvestmentStyle.SWING_TRADING]: [
      {
        brokerName: 'Interactive Brokers (IBKR)',
        matchScore: 0.98,
        apiSupported: true,
        reason: 'Advanced order types, low margin rates, deep short-borrow availability.',
      },
      {
        brokerName: 'Alpaca Crypto & Stocks',
        matchScore: 0.92,
        apiSupported: true,
        reason: 'Developer-first API infrastructure, zero commission options.',
      },
    ],
    [InvestmentStyle.WEEKEND_POSITIONING]: [
      {
        brokerName: 'Charles Schwab',
        matchScore: 0.95,
        apiSupported: true,
        reason: 'Robust long-term research tools, strong weekend execution capabilities.',
      },
      {
        brokerName: 'Fidelity',
        matchScore: 0.9,
        apiSupported: true,
        reason: 'Excellent execution quality and comprehensive sector analysis reports.',
      },
    ],
    [InvestmentStyle.LONG_TERM_HOLD]: [
      {
        brokerName: 'Vanguard',
        matchScore: 0.99,
        apiSupported: false,
        reason: 'Industry gold standard for low-cost indexing (QQQ, SPY, VOO).',
      },
      {
        brokerName: 'Fidelity',
        matchScore: 0.96,
        apiSupported: true,
        reason: 'Zero-fee index fund options and reliable custodial interface.',
      },
    ],
    [InvestmentStyle.DAY_TRADING]: [
      {
        brokerName: 'TradeStation',
        matchScore: 0.97,
        apiSupported: true,
        reason: 'Institutional-grade charting and execution speeds.',
      },
      {
        brokerName: 'Interactive Brokers (IBKR)',
        matchScore: 0.95,
        apiSupported: true,
        reason: 'Direct market access (DMA) routing.',
      },
    ],
    [InvestmentStyle.OPTIONS_INCOME]: [
      {
        brokerName: 'Tastytrade',
        matchScore: 0.99,
        apiSupported: true,
        reason: 'Built by options traders for options strategies, superior margin mechanics.',
      },
      {
        brokerName: 'Charles Schwab (ThinkOrSwim)',
        matchScore: 0.96,
        apiSupported: true,
        reason: 'Industry-leading options analysis matrix and scripting.',
      },
    ],
  };

  recommendBrokers(style: InvestmentStyle): BrokerMatch[] {
    return this.RECOMMENDATION_MATRIX[style] ?? [];
  }
}
