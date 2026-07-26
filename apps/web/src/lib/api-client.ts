import { AssetClass, TradeSignal } from '@alpha-trade/shared-types';

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

// --- Auth ---

export interface AuthResult {
  accessToken: string;
  user: { id: string; email: string };
}

export async function registerAccount(email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
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
