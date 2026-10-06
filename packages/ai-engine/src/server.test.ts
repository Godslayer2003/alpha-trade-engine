import assert from 'node:assert/strict';
import test from 'node:test';
import { AddressInfo } from 'node:net';
import { once } from 'node:events';
import { makeServer } from './server.js';
import { fetchCandles, normalizeSymbol, parseBinance, parseYahoo } from './market.js';
test('HTTP authorization, validation and unchanged market contract', async () => {
  const server = makeServer('disposable-test-secret', async () => new Response(JSON.stringify([[1700000000000,'10','12','9','11','50']])));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const headers = {'x-internal-secret':'disposable-test-secret','content-type':'application/json'};
  try {
    assert.equal((await fetch(`${url}/health`)).status, 200);
    assert.equal((await fetch(`${url}/v1/market/quote`)).status, 401);
    assert.equal((await fetch(`${url}/v1/market/quote`, {headers:{'x-internal-secret':'wrong'}})).status, 401);
    assert.equal((await fetch(`${url}/v1/market/quote`, {headers})).status, 422);
    assert.equal((await fetch(`${url}/v1/market/quote?symbol=BTC&asset_class=CRYPTO&timeframe=BAD`, {headers})).status, 400);
    const quote = await fetch(`${url}/v1/market/quote?symbol=BTC&asset_class=CRYPTO`, {headers});
    assert.equal(quote.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await quote.json(), {symbol:'BTC',price:11,as_of:'2023-11-14T22:13:20.000Z',data_source:'binance'});
    for (const payload of ['{', '[]', JSON.stringify({knowledge_base:'test',chunk_size:7}), JSON.stringify({knowledge_base:'test',chunk_size:'8'})]) {
      assert.equal((await fetch(`${url}/v1/assistant/chunks`, {method:'POST',headers,body:payload})).status, 422);
    }
    assert.equal((await fetch(`${url}/v1/assistant/chunks`, {method:'POST',headers,body:JSON.stringify({knowledge_base:'A sentence.',chunk_size:8})})).status, 200);
    assert.equal((await fetch(`${url}/v1/assistant/chunks`, {method:'POST',headers,body:JSON.stringify({knowledge_base:'x'.repeat(140000)})})).status, 413);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
});
test('untrusted market data and crypto pair normalization', () => {
  assert.equal(normalizeSymbol('BTC'), 'BTCUSDT'); assert.equal(normalizeSymbol('btc/usdt'), 'BTCUSDT');
  assert.throws(() => parseBinance([[1700000000000,'NaN','12','9','11','50']]));
  assert.throws(() => parseBinance([[1700000000000,'10','12','9','11','-1']]));
  assert.throws(() => parseYahoo({chart:{result:[{timestamp:[1700000000],indicators:{quote:[{open:[1],high:[2],low:[0],close:[Infinity]}]}}]}}));
  const rows = parseYahoo({chart:{result:[{timestamp:[1700000000,1700000010],indicators:{quote:[{open:[1,null],high:[2,null],low:[0,null],close:[1,null],volume:[10,0]}]}}]}});
  assert.equal(rows.length, 1); assert.equal(rows[0]?.close, 1);
});
test('fixed provider destinations, fallback and malformed responses', async () => {
  const destinations: string[] = [];
  const candles = await fetchCandles('BTC', 'CRYPTO', '1D', async (input, options) => {
    const url = String(input); destinations.push(url);
    assert.equal(options?.redirect, 'error'); assert.ok(options?.signal);
    return destinations.length === 1 ? new Response('', {status:451}) : new Response(JSON.stringify([[1700000000000,'10','12','9','11','50']]));
  });
  assert.equal(candles.length, 1);
  assert.equal(new URL(destinations[0]!).hostname, 'api.binance.com');
  assert.equal(new URL(destinations[1]!).hostname, 'api.binance.us');
  await assert.rejects(fetchCandles('https://attacker.invalid/path', 'EQUITY', '1D', async (input, options) => {
    assert.equal(new URL(String(input)).hostname, 'query1.finance.yahoo.com');
    assert.equal(options?.redirect, 'error');
    return new Response('{');
  }), /Could not read market data/);
  await assert.rejects(fetchCandles('BTC', 'CRYPTO', '1D', async () => new Response('x'.repeat(2000001))), /too large/);
});
