import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { atr, Candle, chunkText, ema, generateSignal, macd, rsi, Signal, sma } from './analysis.js';

interface Fixture { candles: Candle[]; sma: (number | null)[]; ema: (number | null)[]; rsi: (number | null)[]; macd: (number | null)[][]; atr: (number | null)[]; signal: Omit<Signal, 'generated_at'> }
const fixtures = JSON.parse(readFileSync(join(__dirname, '../parity-fixtures.json'), 'utf8')) as {cases: Fixture[]; chunks: ReturnType<typeof chunkText>};
function compare(actual: unknown, expected: unknown): void {
  if (typeof actual === 'number' && typeof expected === 'number') { assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`); return; }
  if (Array.isArray(actual) && Array.isArray(expected)) { assert.equal(actual.length, expected.length); actual.forEach((v, i) => compare(v, expected[i])); return; }
  assert.deepEqual(actual, expected);
}
fixtures.cases.forEach((fixture, i) => test(`legacy calculation parity ${i + 1}`, () => {
  const closes = fixture.candles.map(c => c.close);
  compare(sma(closes, 20), fixture.sma); compare(ema(closes, 12), fixture.ema);
  compare(rsi(closes, 14), fixture.rsi); compare(macd(closes), fixture.macd);
  compare(atr(fixture.candles, 14), fixture.atr);
  const {generated_at, ...signal} = generateSignal(fixture.candles, 'fixture');
  assert.ok(Number.isFinite(Date.parse(generated_at))); assert.deepEqual(signal, fixture.signal);
}));
test('legacy chunk parity and half-even estimates', () => {
  assert.deepEqual(chunkText('These are five short words. Another short sentence. A final sentence remains.', 8), fixtures.chunks);
  assert.equal(chunkText('One two three four five.', 8)[0]?.tokens, 6);
  assert.deepEqual(chunkText(''), []);
});
test('reject unusable signal histories and invalid chunk sizes', () => {
  assert.throws(() => generateSignal([], 'fixture'));
  for (const size of [0, 7, 4097, 8.5, NaN]) assert.throws(() => chunkText('test', size));
});
