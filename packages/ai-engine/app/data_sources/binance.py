from datetime import datetime, timezone

import httpx

from .common import Candle, MarketDataError, Timeframe

BASE_URL = 'https://api.binance.com/api/v3/klines'

_TIMEFRAME_PARAMS: dict[Timeframe, tuple[str, int]] = {
    '1H': ('1h', 200),
    '1D': ('1d', 180),
    '1W': ('1w', 104),
}

# Crypto pairs are quoted (BTCUSDT, not just BTC) — normalize a bare base
# asset to a USDT pair so users can type "BTC" instead of "BTCUSDT".
_KNOWN_QUOTE_ASSETS = ('USDT', 'BUSD', 'USDC', 'USD', 'BTC', 'ETH', 'BNB')


def _normalize_symbol(symbol: str) -> str:
    upper = symbol.upper().replace('-', '').replace('/', '')
    # A bare quote asset (e.g. just "BTC") trivially "ends with" itself but
    # isn't a valid pair on its own — only skip normalization when there's an
    # actual base-asset prefix in front of the quote suffix.
    if any(upper.endswith(q) and len(upper) > len(q) for q in _KNOWN_QUOTE_ASSETS):
        return upper
    return f'{upper}USDT'


async def fetch_ohlcv(symbol: str, timeframe: Timeframe) -> list[Candle]:
    interval, limit = _TIMEFRAME_PARAMS[timeframe]
    normalized = _normalize_symbol(symbol)

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                BASE_URL, params={'symbol': normalized, 'interval': interval, 'limit': limit}
            )
    except httpx.HTTPError as err:
        raise MarketDataError(f'Could not reach Binance: {err}', status_code=502) from err

    if resp.status_code == 400:
        raise MarketDataError(f'Unknown crypto symbol "{symbol}" ({normalized}).', status_code=404)
    if resp.status_code != 200:
        raise MarketDataError(f'Binance responded with status {resp.status_code}.', status_code=502)

    rows = resp.json()
    if not isinstance(rows, list) or not rows:
        raise MarketDataError(f'No data returned for symbol "{symbol}".', status_code=404)

    return [
        Candle(
            time=datetime.fromtimestamp(row[0] / 1000, tz=timezone.utc).isoformat(),
            open=float(row[1]),
            high=float(row[2]),
            low=float(row[3]),
            close=float(row[4]),
            volume=float(row[5]),
        )
        for row in rows
    ]
