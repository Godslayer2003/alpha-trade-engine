from datetime import datetime, timezone
from urllib.parse import quote

import httpx

from .common import Candle, MarketDataError, Timeframe

# Yahoo's public (unauthenticated, undocumented) chart endpoint. Covers
# equities/ETFs/indices (AAPL, QQQ, ^GSPC) and commodity futures (CL=F, GC=F).
BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'

# (interval, range) — chosen to give enough history for a 200-period SMA/ATR
# lookback while staying inside Yahoo's supported interval/range pairings.
_TIMEFRAME_PARAMS: dict[Timeframe, tuple[str, str]] = {
    '1H': ('60m', '1mo'),
    '1D': ('1d', '6mo'),
    '1W': ('1wk', '2y'),
}

_HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; AlphaTradeEngine/0.1)'}


async def fetch_ohlcv(symbol: str, timeframe: Timeframe) -> list[Candle]:
    interval, range_ = _TIMEFRAME_PARAMS[timeframe]
    url = f'{BASE_URL}/{quote(symbol, safe="")}'

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                url, params={'interval': interval, 'range': range_}, headers=_HEADERS
            )
    except httpx.HTTPError as err:
        raise MarketDataError(f'Could not reach Yahoo Finance: {err}', status_code=502) from err

    if resp.status_code == 404:
        raise MarketDataError(f'Unknown symbol "{symbol}".', status_code=404)
    if resp.status_code != 200:
        raise MarketDataError(
            f'Yahoo Finance responded with status {resp.status_code}.', status_code=502
        )

    payload = resp.json()
    chart = payload.get('chart', {})
    error = chart.get('error')
    if error:
        raise MarketDataError(f'Yahoo Finance error: {error}', status_code=404)

    results = chart.get('result') or []
    if not results:
        raise MarketDataError(f'No data returned for symbol "{symbol}".', status_code=404)

    result = results[0]
    timestamps = result.get('timestamp') or []
    quotes = (result.get('indicators', {}).get('quote') or [{}])[0]

    candles: list[Candle] = []
    for i, ts in enumerate(timestamps):
        o, h, l, c = (
            quotes.get('open', [None] * len(timestamps))[i],
            quotes.get('high', [None] * len(timestamps))[i],
            quotes.get('low', [None] * len(timestamps))[i],
            quotes.get('close', [None] * len(timestamps))[i],
        )
        if None in (o, h, l, c):
            continue  # Yahoo pads non-trading periods with nulls — skip them.
        v = (quotes.get('volume', [0] * len(timestamps))[i]) or 0
        candles.append(
            Candle(
                time=datetime.fromtimestamp(ts, tz=timezone.utc).isoformat(),
                open=float(o),
                high=float(h),
                low=float(l),
                close=float(c),
                volume=float(v),
            )
        )

    if not candles:
        raise MarketDataError(f'No usable candles for symbol "{symbol}".', status_code=404)

    return candles
