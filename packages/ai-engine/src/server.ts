import { createHash, timingSafeEqual } from 'node:crypto';
import { createServer, IncomingMessage } from 'node:http';
import { chunkText, generateSignal, MarketError } from './analysis.js';
import { AssetClass, fetchCandles, Fetcher, object, Timeframe, timeframes } from './market.js';

function parameters(value: Record<string, unknown>, quote = false): {symbol: string; asset: AssetClass; timeframe: Timeframe} {
  const {symbol, asset_class} = value;
  const timeframe = value.timeframe ?? (quote ? '1D' : undefined);
  if (typeof symbol !== 'string' || !symbol.trim() || symbol.length > 64 || /[\x00-\x20]/.test(symbol)) throw new MarketError('Invalid symbol.', 422);
  if (asset_class !== 'EQUITY' && asset_class !== 'CRYPTO' && asset_class !== 'COMMODITY') throw new MarketError('Invalid asset_class.', 422);
  if (typeof timeframe !== 'string') throw new MarketError('timeframe is required.', 422);
  if (!timeframes.includes(timeframe as Timeframe)) throw new MarketError(`Unsupported timeframe "${timeframe}". Use one of: ${timeframes.join(', ')}.`, 400);
  return {symbol, asset: asset_class, timeframe: timeframe as Timeframe};
}
async function body(request: IncomingMessage): Promise<Record<string, unknown>> {
  if (!request.headers['content-type']?.startsWith('application/json')) throw new MarketError('Use application/json.', 415);
  if (Number(request.headers['content-length'] ?? 0) > 131072) throw new MarketError('Request body too large.', 413);
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of request) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    size += data.length;
    if (size > 131072) throw new MarketError('Request body too large.', 413);
    chunks.push(data);
  }
  try { return object(JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown); }
  catch { throw new MarketError('Invalid JSON object.', 422); }
}
export function makeServer(secret?: string, request: Fetcher = fetch) {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  const expected = secret ? digest(secret) : undefined;
  return createServer({maxHeaderSize: 16384, requestTimeout: 15000, headersTimeout: 10000}, (req, res) => {
    const send = (status: number, value: unknown) => {
      res.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
      res.end(JSON.stringify(value));
    };
    void (async () => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname === '/health' && req.method === 'GET') { send(200, {status:'ok'}); return; }
      const supplied = req.headers['x-internal-secret'];
      if (expected && (typeof supplied !== 'string' || !timingSafeEqual(digest(supplied), expected))) { send(401, {detail:'Missing or invalid internal secret.'}); return; }
      let result: unknown;
      if (req.method === 'POST' && url.pathname === '/v1/assistant/chunks') {
        const data = await body(req);
        if (typeof data.knowledge_base !== 'string' || Buffer.byteLength(data.knowledge_base) > 100000) throw new MarketError('Invalid knowledge_base (maximum 100000 bytes).', 422);
        const size = data.chunk_size ?? 128;
        if (typeof size !== 'number') throw new MarketError('Invalid chunk_size.', 422);
        result = chunkText(data.knowledge_base, size);
      } else if ((req.method === 'GET' && ['/v1/market/candles','/v1/market/quote'].includes(url.pathname)) || req.method === 'POST' && url.pathname === '/v1/analysis/signal') {
        const data = req.method === 'POST' ? await body(req) : Object.fromEntries(url.searchParams);
        const {symbol, asset, timeframe} = parameters(data, url.pathname.endsWith('/quote'));
        const candles = await fetchCandles(symbol, asset, timeframe, request);
        const source = asset === 'CRYPTO' ? 'binance' : 'yahoo-finance';
        if (url.pathname.endsWith('/signal')) result = generateSignal(candles, source);
        else if (url.pathname.endsWith('/quote')) { const last = candles.at(-1)!; result = {symbol,price:last.close,as_of:last.time,data_source:source}; }
        else result = candles;
      } else { send(404, {detail:'Not Found'}); return; }
      send(200, result);
    })().catch((error: unknown) => send(error instanceof MarketError ? error.status : 500, {detail:error instanceof MarketError ? error.message : 'Internal server error.'}));
  });
}
if (require.main === module) {
  const secret = process.env.AI_ENGINE_SHARED_SECRET;
  if ((process.env.RENDER || process.env.NODE_ENV === 'production') && !secret) throw new Error('AI_ENGINE_SHARED_SECRET is required in production.');
  const port = Number(process.env.PORT ?? 8000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
  makeServer(secret).listen(port, '0.0.0.0', () => console.log(`Analysis service listening on ${port}`));
}
