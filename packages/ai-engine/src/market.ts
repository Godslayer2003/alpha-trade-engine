import { Candle, MarketError } from './analysis.js';
export const timeframes = ['1H', '1D', '1W', '1M', '3M', '6M', '9M', '1Y', '5Y', '10Y'] as const;
export type Timeframe = typeof timeframes[number];
export type AssetClass = 'EQUITY' | 'CRYPTO' | 'COMMODITY';
const yahoo: Record<Timeframe, [string, string]> = {
  '1H': ['60m','1mo'], '1D': ['1d','6mo'], '1W': ['1wk','2y'], '1M': ['30m','1mo'],
  '3M': ['1d','3mo'], '6M': ['1d','6mo'], '9M': ['1d','1y'], '1Y': ['1d','2y'], '5Y': ['1wk','5y'], '10Y': ['1wk','10y'],
};
const binance: Record<Timeframe, [string, number]> = {
  '1H': ['1h',200], '1D': ['1d',180], '1W': ['1w',104], '1M': ['30m',700],
  '3M': ['1d',90], '6M': ['1d',180], '9M': ['1d',270], '1Y': ['1d',365], '5Y': ['1w',260], '10Y': ['1w',520],
};
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new MarketError('Invalid response structure.');
  return value as Record<string, unknown>;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new MarketError('Invalid response array.');
  return value;
}
function numeric(value: unknown): number {
  const n = typeof value === 'string' && value.trim() ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new MarketError('Invalid market value.');
  return n;
}
function candle(time: unknown, values: unknown[], milliseconds = false): Candle {
  const timestamp = numeric(time) * (milliseconds ? 1 : 1000);
  if (timestamp < 0 || timestamp > 8.64e15) throw new MarketError('Invalid market timestamp.');
  const [open, high, low, close, volume] = values.map(numeric);
  if (open === undefined || high === undefined || low === undefined || close === undefined || volume === undefined || volume < 0 || high < low) throw new MarketError('Invalid candle.');
  return {time: new Date(timestamp).toISOString(), open, high, low, close, volume};
}
export function normalizeSymbol(symbol: string): string {
  const upper = symbol.toUpperCase().replace(/[-/]/g, '');
  return ['USDT','BUSD','USDC','USD','BTC','ETH','BNB'].some(q => upper.endsWith(q) && upper.length > q.length) ? upper : `${upper}USDT`;
}
export function parseBinance(payload: unknown): Candle[] {
  const rows = array(payload);
  if (!rows.length) throw new MarketError('No market data returned.', 404);
  return rows.map(value => { const row = array(value); return candle(row[0], row.slice(1,6), true); });
}
export function parseYahoo(payload: unknown): Candle[] {
  const chart = object(object(payload).chart);
  if (chart.error) throw new MarketError('Unknown market symbol.', 404);
  const results = array(chart.result ?? []);
  if (!results.length) throw new MarketError('No market data returned.', 404);
  const result = object(results[0]);
  const timestamps = array(result.timestamp ?? []);
  const quote = object(array(object(result.indicators).quote)[0]);
  const open = array(quote.open), high = array(quote.high), low = array(quote.low), close = array(quote.close);
  const volume = array(quote.volume ?? Array(timestamps.length).fill(0));
  const out: Candle[] = [];
  timestamps.forEach((time, i) => {
    const values = [open[i], high[i], low[i], close[i]];
    if (values.some(v => v == null)) return;
    out.push(candle(time, [...values, volume[i] ?? 0]));
  });
  if (!out.length) throw new MarketError('No usable candles returned.', 404);
  return out;
}
export type Fetcher = typeof fetch;
export async function fetchCandles(symbol: string, asset: AssetClass, timeframe: Timeframe, request: Fetcher = fetch): Promise<Candle[]> {
  const crypto = asset === 'CRYPTO';
  const url = new URL(crypto ? 'https://api.binance.com/api/v3/klines' : `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  if (crypto) {
    const [interval, limit] = binance[timeframe];
    url.search = new URLSearchParams({symbol: normalizeSymbol(symbol), interval, limit: String(limit)}).toString();
  } else {
    const [interval, range] = yahoo[timeframe];
    url.search = new URLSearchParams({interval, range}).toString();
  }
  const get = (target: URL) => request(target, {signal: AbortSignal.timeout(8000), redirect: 'error', headers: {'User-Agent':'Mozilla/5.0 (compatible; AlphaTradeEngine/0.1)'}});
  try {
    let response = await get(url);
    if (crypto && [403,451].includes(response.status)) { url.hostname = 'api.binance.us'; response = await get(url); }
    if (response.status === 404 || crypto && response.status === 400) throw new MarketError(`Unknown symbol "${symbol}".`, 404);
    if (!response.ok) throw new MarketError(`Market provider responded with status ${response.status}.`);
    // Bound upstream JSON as well as client requests.
    let size = 0; const chunks: Uint8Array[] = [];
    if (!response.body) throw new MarketError('Empty market response.');
    for await (const chunk of response.body) { size += chunk.length; if (size > 2_000_000) throw new MarketError('Market response too large.'); chunks.push(chunk); }
    const payload: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return crypto ? parseBinance(payload) : parseYahoo(payload);
  } catch (error) {
    if (error instanceof MarketError) throw error;
    throw new MarketError('Could not read market data.');
  }
}
