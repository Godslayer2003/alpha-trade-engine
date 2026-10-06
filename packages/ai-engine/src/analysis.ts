export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
type Series = (number | null)[];
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
export function sma(values: number[], period: number): Series {
  return values.map((_, i) => i < period - 1 ? null : mean(values.slice(i - period + 1, i + 1)));
}
export function ema(values: number[], period: number): Series {
  const out: Series = Array(values.length).fill(null);
  if (values.length < period) return out;
  let previous = mean(values.slice(0, period));
  out[period - 1] = previous;
  for (let i = period; i < values.length; i++) {
    previous = values[i]! * (2 / (period + 1)) + previous * (1 - 2 / (period + 1));
    out[i] = previous;
  }
  return out;
}
export function rsi(values: number[], period: number): Series {
  const out: Series = Array(values.length).fill(null);
  if (values.length <= period) return out;
  const deltas = values.slice(1).map((v, i) => v - values[i]!);
  let gain = mean(deltas.slice(0, period).map(v => Math.max(v, 0)));
  let loss = mean(deltas.slice(0, period).map(v => Math.max(-v, 0)));
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = period + 1; i < values.length; i++) {
    gain = (gain * (period - 1) + Math.max(deltas[i - 1]!, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-deltas[i - 1]!, 0)) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}
export function macd(values: number[]): [Series, Series, Series] {
  const fast = ema(values, 12), slow = ema(values, 26);
  const line = values.map((_, i) => fast[i] == null || slow[i] == null ? null : fast[i]! - slow[i]!);
  const signal: Series = Array(values.length).fill(null);
  const known = line.filter((v): v is number => v !== null);
  if (known.length >= 9) {
    const start = line.findIndex(v => v !== null) + 8;
    let previous = mean(known.slice(0, 9));
    signal[start] = previous;
    for (let i = start + 1; i < line.length; i++) {
      previous = line[i]! * 0.2 + previous * 0.8;
      signal[i] = previous;
    }
  }
  return [line, signal, line.map((v, i) => v === null || signal[i] == null ? null : v - signal[i]!)];
}
export function atr(candles: Candle[], period: number): Series {
  const out: Series = Array(candles.length).fill(null);
  if (candles.length <= period) return out;
  const ranges = candles.slice(1).map((c, i) => Math.max(c.high - c.low, Math.abs(c.high - candles[i]!.close), Math.abs(c.low - candles[i]!.close)));
  let previous = mean(ranges.slice(0, period));
  out[period] = previous;
  for (let i = period + 1; i < candles.length; i++) {
    previous = (previous * (period - 1) + ranges[i - 1]!) / period;
    out[i] = previous;
  }
  return out;
}
export class MarketError extends Error {
  constructor(message: string, public readonly status = 502) { super(message); }
}
export interface Signal {
  pattern_detected: string;
  deal_type: 'LONG' | 'SHORT' | 'NEUTRAL';
  entry_price: number;
  stop_loss: number | null;
  target_price: number | null;
  confidence: number;
  risk_reward_ratio: number | null;
  data_source: string;
  disclaimer: string;
  generated_at: string;
}
export function generateSignal(candles: Candle[], source: string): Signal {
  if (candles.length < 50) throw new MarketError(`Only ${candles.length} candles available; need at least 50 for a reliable signal.`, 422);
  const closes = candles.map(c => c.close);
  const short = sma(closes, 20).at(-1)!, long = sma(closes, 50).at(-1)!;
  const momentum = rsi(closes, 14).at(-1)!, histogram = macd(closes)[2].at(-1)!;
  const volatility = atr(candles, 14).at(-1) ?? 0;
  let score = 0;
  const reasons: string[] = [];
  if (short > long) { score++; reasons.push('uptrend (SMA20 above SMA50)'); }
  else if (short < long) { score--; reasons.push('downtrend (SMA20 below SMA50)'); }
  if (momentum > 55) { score++; reasons.push(`RSI ${momentum.toFixed(1)} shows bullish momentum`); }
  else if (momentum < 45) { score--; reasons.push(`RSI ${momentum.toFixed(1)} shows bearish momentum`); }
  if (histogram > 0) { score++; reasons.push('MACD histogram positive (bullish crossover)'); }
  else if (histogram < 0) { score--; reasons.push('MACD histogram negative (bearish crossover)'); }
  const entry = closes.at(-1)!;
  const direction = score >= 2 ? 1 : score <= -2 ? -1 : 0;
  let stop: number | null = null, target: number | null = null;
  if (direction !== 0) {
    const swing = direction === 1 ? Math.min(...candles.slice(-10).map(c => c.low)) : Math.max(...candles.slice(-10).map(c => c.high));
    stop = swing - direction * 0.5 * volatility;
    let risk = direction * (entry - stop);
    if (risk <= 0) { risk = Math.max(volatility, Math.abs(entry) * 0.01, Number.EPSILON); stop = entry - direction * risk; }
    target = entry + direction * 2 * risk;
  }
  const rounded = (v: number) => Number(v.toFixed(4));
  return {
    pattern_detected: reasons.join('; ') || 'No clear directional bias',
    deal_type: direction === 1 ? 'LONG' : direction === -1 ? 'SHORT' : 'NEUTRAL',
    entry_price: rounded(entry), stop_loss: stop === null ? null : rounded(stop),
    target_price: target === null ? null : rounded(target),
    confidence: Number((0.3 + Math.abs(score) / 3 * 0.5).toFixed(2)),
    risk_reward_ratio: direction === 0 ? null : 2, data_source: source,
    disclaimer: 'Rules-based technical analysis (moving averages, RSI, MACD, ATR) — not financial advice. Markets involve risk; verify independently before trading.',
    generated_at: new Date().toISOString(),
  };
}
export interface Chunk { index: number; text: string; tokens: number }
// Preserve the legacy Python half-even rounding at .5 token estimates.
function tokens(text: string): number {
  const value = text.trim().split(/\s+/).length * 1.3;
  const floor = Math.floor(value);
  return Math.max(1, value - floor === 0.5 ? floor + floor % 2 : Math.round(value));
}
export function chunkText(text: string, size = 128): Chunk[] {
  if (!Number.isInteger(size) || size < 8 || size > 4096) throw new MarketError('chunk_size must be between 8 and 4096.', 422);
  const chunks: Chunk[] = [];
  let current: string[] = [], count = 0;
  const flush = () => { const joined = current.join(' '); chunks.push({index: chunks.length, text: joined, tokens: tokens(joined)}); current = []; count = 0; };
  for (const sentence of text.trim().split(/(?<=[.!?])\s+/).filter(Boolean)) {
    const next = tokens(sentence);
    if (current.length && count + next > size) flush();
    current.push(sentence); count += next;
  }
  if (current.length) flush();
  return chunks;
}
