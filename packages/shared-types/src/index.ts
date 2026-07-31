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

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum NotificationChannel {
  TELEGRAM = 'TELEGRAM',
  EMAIL = 'EMAIL',
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

// Mirrors packages/ai-engine/app/data_sources/common.py's SUPPORTED_TIMEFRAMES
// exactly — the ai-engine is the source of truth for what's fetchable; this
// enum exists so the frontend has a canonical, typed list + labels to render.
export enum Timeframe {
  ONE_HOUR = '1H',
  ONE_DAY = '1D',
  ONE_WEEK = '1W',
  ONE_MONTH = '1M',
  THREE_MONTHS = '3M',
  SIX_MONTHS = '6M',
  NINE_MONTHS = '9M',
  ONE_YEAR = '1Y',
  FIVE_YEARS = '5Y',
  TEN_YEARS = '10Y',
}

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  [Timeframe.ONE_HOUR]: '1 Hour',
  [Timeframe.ONE_DAY]: '1 Day',
  [Timeframe.ONE_WEEK]: '1 Week',
  [Timeframe.ONE_MONTH]: '1 Month',
  [Timeframe.THREE_MONTHS]: '3 Months',
  [Timeframe.SIX_MONTHS]: '6 Months',
  [Timeframe.NINE_MONTHS]: '9 Months',
  [Timeframe.ONE_YEAR]: '1 Year',
  [Timeframe.FIVE_YEARS]: '5 Years',
  [Timeframe.TEN_YEARS]: '10 Years',
};

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

export enum MarketCountry {
  USA = 'USA',
  CANADA = 'CANADA',
  UK = 'UK',
  GERMANY = 'GERMANY',
  FRANCE = 'FRANCE',
  CHINA = 'CHINA',
  JAPAN = 'JAPAN',
  KOREA = 'KOREA',
  RUSSIA = 'RUSSIA',
  SOUTH_AFRICA = 'SOUTH_AFRICA',
  ARGENTINA = 'ARGENTINA',
  AUSTRALIA = 'AUSTRALIA',
}

// Computed live from each exchange's regular trading calendar (timezone +
// weekday sessions) — weekends are accounted for, exchange-specific public
// holidays are not, hence the disclaimer field carried on every response.
export const MarketHoursStatusSchema = z.object({
  country: z.nativeEnum(MarketCountry),
  countryLabel: z.string(),
  exchangeName: z.string(),
  timezone: z.string(),
  isOpen: z.boolean(),
  currentLocalTime: z.string(),
  sessionsLocal: z.array(z.object({ opens: z.string(), closes: z.string() })),
  nextTransition: z.object({
    type: z.enum(['OPEN', 'CLOSE']),
    localLabel: z.string(),
    inMinutes: z.number(),
  }),
  disclaimer: z.string(),
});
export type MarketHoursStatus = z.infer<typeof MarketHoursStatusSchema>;
