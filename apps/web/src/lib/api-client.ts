import { AssetClass, MarketCountry, MarketHoursStatus, TradeSignal } from '@alpha-trade/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type { TradeSignal };

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function throwOnError(res: Response, label: string): Promise<never> {
  const body = await res.json().catch(() => null);
  const message = (body && (body as { message?: string }).message) || `status ${res.status}`;
  throw new Error(`${label}: ${message}`);
}

export async function fetchCandles(
  symbol: string,
  assetClass: AssetClass,
  timeframe: string,
): Promise<Candle[]> {
  const params = new URLSearchParams({ symbol, assetClass, timeframe });
  const res = await fetch(`${API_URL}/api/v1/market/candles?${params.toString()}`);
  if (!res.ok) return throwOnError(res, 'Could not load market data');
  return res.json();
}

export async function fetchTradeSignal(
  symbol: string,
  assetClass: AssetClass,
  timeframe: string,
): Promise<TradeSignal> {
  const res = await fetch(`${API_URL}/api/v1/analysis/signal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, assetClass, timeframe }),
  });
  if (!res.ok) return throwOnError(res, 'Could not get a trade signal');
  return res.json();
}

export interface BrokerMatch {
  brokerName: string;
  matchScore: number;
  apiSupported: boolean;
  reason: string;
}

export async function fetchBrokerRecommendations(style: string): Promise<BrokerMatch[]> {
  const res = await fetch(`${API_URL}/api/v1/broker/recommend?style=${encodeURIComponent(style)}`);
  if (!res.ok) {
    throw new Error(`Broker recommendation request failed: ${res.status}`);
  }
  return res.json();
}

export interface CompanyRecommendation {
  ticker: string;
  companyName: string;
  reason: string;
  suitableStyles: string[];
}

export async function fetchSectors(): Promise<string[]> {
  const res = await fetch(`${API_URL}/api/v1/sectors`);
  if (!res.ok) {
    throw new Error(`Sectors request failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchSectorRecommendations(
  sector: string,
  style?: string,
): Promise<CompanyRecommendation[]> {
  const params = new URLSearchParams({ sector });
  if (style) params.set('style', style);
  const res = await fetch(`${API_URL}/api/v1/sectors/recommend?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Sector recommendation request failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchMarketHours(countries?: MarketCountry[]): Promise<MarketHoursStatus[]> {
  const params = countries && countries.length > 0 ? `?countries=${countries.join(',')}` : '';
  const res = await fetch(`${API_URL}/api/v1/market-hours${params}`);
  if (!res.ok) {
    throw new Error(`Market hours request failed: ${res.status}`);
  }
  return res.json();
}

// --- Unusual movers ---

export interface Mover {
  symbol: string;
  assetClass: AssetClass;
  price: number;
  pctChange: number;
  zScore: number;
  asOf: string;
}

export async function fetchMovers(): Promise<Mover[]> {
  const res = await fetch(`${API_URL}/api/v1/movers`);
  if (!res.ok) {
    throw new Error(`Movers request failed: ${res.status}`);
  }
  return res.json();
}

// --- Auth ---

export interface AuthResult {
  accessToken: string;
  user: { id: string; email: string };
}

export async function registerAccount(email: string, password: string, acceptedTerms: boolean): Promise<AuthResult> {
  const res = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, acceptedTerms }),
  });
  if (!res.ok) return throwOnError(res, 'Could not create account');
  return res.json();
}

export async function loginAccount(email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return throwOnError(res, 'Could not log in');
  return res.json();
}

// --- Portfolio (paper trading) ---

export interface Holding {
  id: string;
  ticker: string;
  assetClass: AssetClass;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  stopLossPrice: number | null;
}

export interface Portfolio {
  id: string;
  cashBalance: number;
  totalValue: number;
  holdings: Holding[];
}

export interface Trade {
  id: string;
  ticker: string;
  assetClass: AssetClass;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  triggeredByStopLoss: boolean;
  executedAt: string;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function fetchPortfolio(token: string): Promise<Portfolio> {
  const res = await fetch(`${API_URL}/api/v1/portfolio`, { headers: authHeaders(token) });
  if (!res.ok) return throwOnError(res, 'Could not load portfolio');
  return res.json();
}

export async function fetchTrades(token: string): Promise<Trade[]> {
  const res = await fetch(`${API_URL}/api/v1/portfolio/trades`, { headers: authHeaders(token) });
  if (!res.ok) return throwOnError(res, 'Could not load trade history');
  return res.json();
}

export async function postTrade(
  token: string,
  params: { symbol: string; assetClass: AssetClass; side: 'BUY' | 'SELL'; quantity: number },
): Promise<Portfolio> {
  const res = await fetch(`${API_URL}/api/v1/portfolio/trade`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(params),
  });
  if (!res.ok) return throwOnError(res, 'Trade failed');
  return res.json();
}

export async function setStopLoss(token: string, holdingId: string, stopLossPrice: number | null): Promise<Portfolio> {
  const res = await fetch(`${API_URL}/api/v1/portfolio/holdings/${holdingId}/stop-loss`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ stopLossPrice }),
  });
  if (!res.ok) return throwOnError(res, 'Could not update stop-loss');
  return res.json();
}

export interface PerformanceTrade {
  ticker: string;
  pnl: number;
  executedAt: string;
}

export interface Performance {
  startingCash: number;
  equityCurve: { t: string; value: number }[];
  totalReturnPct: number;
  realizedPnL: number;
  winRate: number | null;
  tradeCount: number;
  bestTrade: PerformanceTrade | null;
  worstTrade: PerformanceTrade | null;
}

export async function resetPortfolio(token: string): Promise<Portfolio> {
  const res = await fetch(`${API_URL}/api/v1/portfolio/reset`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) return throwOnError(res, 'Could not reset portfolio');
  return res.json();
}

export async function fetchPerformance(token: string): Promise<Performance> {
  const res = await fetch(`${API_URL}/api/v1/portfolio/performance`, {
    headers: authHeaders(token),
  });
  if (!res.ok) return throwOnError(res, 'Could not load performance data');
  return res.json();
}

// --- Custom investment strategies ---

export interface Strategy {
  id: string;
  name: string;
  style: string;
  preferredTickers: string[];
  maxRiskPerTrade: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface StrategyInput {
  name: string;
  style: string;
  preferredTickers: string[];
  maxRiskPerTrade: number;
  notes?: string;
}

export async function fetchStrategies(token: string): Promise<Strategy[]> {
  const res = await fetch(`${API_URL}/api/v1/strategies`, { headers: authHeaders(token) });
  if (!res.ok) return throwOnError(res, 'Could not load strategies');
  return res.json();
}

export async function createStrategy(token: string, input: StrategyInput): Promise<Strategy> {
  const res = await fetch(`${API_URL}/api/v1/strategies`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (!res.ok) return throwOnError(res, 'Could not create strategy');
  return res.json();
}

export async function updateStrategy(
  token: string,
  id: string,
  input: Partial<StrategyInput & { isActive: boolean }>,
): Promise<Strategy> {
  const res = await fetch(`${API_URL}/api/v1/strategies/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (!res.ok) return throwOnError(res, 'Could not update strategy');
  return res.json();
}

export async function deleteStrategy(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/strategies/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) await throwOnError(res, 'Could not delete strategy');
}

// --- Risk profile / questionnaire ---

export interface Profile {
  riskTolerance: string;
  capitalBase: number;
  investmentGoal: string | null;
  timeHorizonYears: number | null;
  experienceLevel: string | null;
  firstName: string | null;
  lastName: string | null;
  age: number | null;
  gender: string | null;
  profilePictureUrl: string | null;
  notificationEmail: string | null;
  dailyReportEnabled: boolean;
  dailyReportTime: string;
  dailyReportTimezone: string;
  dailyReportChannels: string[];
}

export type ProfileInput = Partial<{
  riskTolerance: string;
  capitalBase: number;
  investmentGoal: string;
  timeHorizonYears: number;
  experienceLevel: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  profilePictureUrl: string;
  notificationEmail: string;
  dailyReportEnabled: boolean;
  dailyReportTime: string;
  dailyReportTimezone: string;
  dailyReportChannels: string[];
}>;

export async function fetchProfile(token: string): Promise<Profile | null> {
  const res = await fetch(`${API_URL}/api/v1/profile`, { headers: authHeaders(token) });
  if (!res.ok) return throwOnError(res, 'Could not load profile');
  return res.json();
}

export async function updateProfile(token: string, input: ProfileInput): Promise<Profile> {
  const res = await fetch(`${API_URL}/api/v1/profile`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (!res.ok) return throwOnError(res, 'Could not save profile');
  return res.json();
}

export async function sendTestNotification(token: string): Promise<{ sent: string[]; errors: string[] }> {
  const res = await fetch(`${API_URL}/api/v1/notifications/test`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) return throwOnError(res, 'Could not send test notification');
  return res.json();
}

// --- Personalized recommendations ---

export interface Recommendation {
  id: string;
  ticker: string;
  assetClass: AssetClass;
  dealType: string;
  horizonStyle: string;
  entryPrice: number;
  stopLoss: number | null;
  targetPrice: number | null;
  justification: string;
  createdAt: string;
}

export async function fetchRecommendations(token: string): Promise<Recommendation[]> {
  const res = await fetch(`${API_URL}/api/v1/recommendations`, { headers: authHeaders(token) });
  if (!res.ok) return throwOnError(res, 'Could not load recommendations');
  return res.json();
}

export async function generateRecommendations(token: string): Promise<Recommendation[]> {
  const res = await fetch(`${API_URL}/api/v1/recommendations/generate`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) return throwOnError(res, 'Could not generate recommendations');
  return res.json();
}

// --- Telegram linking ---

export async function createTelegramLinkCode(token: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/v1/telegram/link-code`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) return throwOnError(res, 'Could not create a Telegram link code');
  const body = (await res.json()) as { code: string };
  return body.code;
}

export interface TelegramStatus {
  linked: boolean;
  linkedAt: string | null;
}

export async function fetchTelegramStatus(token: string): Promise<TelegramStatus> {
  const res = await fetch(`${API_URL}/api/v1/telegram/status`, { headers: authHeaders(token) });
  if (!res.ok) return throwOnError(res, 'Could not check Telegram link status');
  return res.json();
}

// --- AI insight reports ---

export interface AiReport {
  id: string;
  symbol: string;
  assetClass: AssetClass;
  periodLabel: string;
  content: string;
  grounded: boolean;
  generatedAt: string;
}

export async function fetchReport(
  symbol: string,
  assetClass: AssetClass,
  months: number,
): Promise<AiReport> {
  const params = new URLSearchParams({ symbol, assetClass, months: String(months) });
  const res = await fetch(`${API_URL}/api/v1/reports?${params.toString()}`);
  if (!res.ok) return throwOnError(res, 'Could not generate report');
  return res.json();
}

// --- AI guide chat ---

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chatWithAssistant(
  messages: ChatMessage[],
  context?: Record<string, unknown>,
): Promise<string> {
  const res = await fetch(`${API_URL}/api/v1/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
  });
  if (!res.ok) return throwOnError(res, 'Assistant request failed');
  const body = (await res.json()) as { reply: string };
  return body.reply;
}
