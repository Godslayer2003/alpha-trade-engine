import { z } from 'zod';

// Mirrors packages/database/prisma/schema.prisma enums.
export enum InvestmentStyle {
  SWING_TRADING = 'SWING_TRADING',
  WEEKEND_POSITIONING = 'WEEKEND_POSITIONING',
  LONG_TERM_HOLD = 'LONG_TERM_HOLD',
  DAY_TRADING = 'DAY_TRADING',
  OPTIONS_INCOME = 'OPTIONS_INCOME',
}

export enum DealType {
  LONG = 'LONG',
  SHORT = 'SHORT',
  NEUTRAL = 'NEUTRAL',
}

export enum RiskTolerance {
  CONSERVATIVE = 'CONSERVATIVE',
  MODERATE = 'MODERATE',
  AGGRESSIVE = 'AGGRESSIVE',
}

// Determines which upstream market-data source a symbol is resolved against
// (see packages/ai-engine/app/data_sources). EQUITY covers stocks/ETFs/indices,
// COMMODITY covers futures (oil, gold, ...) — both via the same Yahoo Finance
// fetcher — CRYPTO goes to Binance.
export enum AssetClass {
  EQUITY = 'EQUITY',
  CRYPTO = 'CRYPTO',
  COMMODITY = 'COMMODITY',
}

export const GetSignalRequestSchema = z.object({
  symbol: z.string().min(1),
  assetClass: z.nativeEnum(AssetClass),
  timeframe: z.string().min(1),
});
export type GetSignalRequest = z.infer<typeof GetSignalRequestSchema>;

// A real, computed technical-analysis signal — not a trained ML model, and
// never a substitute for financial advice. dataSource/disclaimer/generatedAt
// are load-bearing: every consumer must be able to show where the number
// came from and that it's rules-based TA, not certainty.
export const TradeSignalSchema = z.object({
  patternDetected: z.string(),
  dealType: z.nativeEnum(DealType),
  entryPrice: z.number(),
  stopLoss: z.number().nullable(),
  targetPrice: z.number().nullable(),
  confidence: z.number().min(0).max(1),
  riskRewardRatio: z.number().nullable(),
  dataSource: z.string(),
  disclaimer: z.string(),
  generatedAt: z.string(),
});
export type TradeSignal = z.infer<typeof TradeSignalSchema>;

export const BrokerMatchSchema = z.object({
  brokerName: z.string(),
  matchScore: z.number().min(0).max(1),
  apiSupported: z.boolean(),
  reason: z.string(),
});
export type BrokerMatch = z.infer<typeof BrokerMatchSchema>;

export enum Sector {
  TECHNOLOGY = 'TECHNOLOGY',
  HEALTHCARE = 'HEALTHCARE',
  FINANCIALS = 'FINANCIALS',
  ENERGY = 'ENERGY',
  CONSUMER_DISCRETIONARY = 'CONSUMER_DISCRETIONARY',
  INDUSTRIALS = 'INDUSTRIALS',
}

// Curated reference data, not a live-market prediction — same trust level as
// BrokerMatch above, so it does not carry an is_mock flag the way TradeSignal does.
export const CompanyRecommendationSchema = z.object({
  ticker: z.string(),
  companyName: z.string(),
  reason: z.string(),
  suitableStyles: z.array(z.nativeEnum(InvestmentStyle)),
});
export type CompanyRecommendation = z.infer<typeof CompanyRecommendationSchema>;
