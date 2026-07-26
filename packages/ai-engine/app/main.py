from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

from . import signal_engine
from .data_sources import binance, yahoo
from .data_sources.common import Candle, MarketDataError, SUPPORTED_TIMEFRAMES, Timeframe

app = FastAPI(title="Alpha-Trade AI Analysis Core", version="0.2.0")

AssetClass = Literal['EQUITY', 'CRYPTO', 'COMMODITY']

# EQUITY and COMMODITY both resolve through Yahoo Finance (stocks/ETFs/indices
# and commodity futures share the same public chart endpoint); CRYPTO goes to
# Binance. Kept as distinct asset classes for UI labeling / future divergence.
_FETCHERS = {
    'EQUITY': yahoo.fetch_ohlcv,
    'COMMODITY': yahoo.fetch_ohlcv,
    'CRYPTO': binance.fetch_ohlcv,
}


class CandleResponse(BaseModel):
    time: str
    open: float
    high: float
    low: float
    close: float
    volume: float


class QuoteResponse(BaseModel):
    symbol: str
    price: float
    as_of: str
    data_source: str


class SignalRequest(BaseModel):
    symbol: str
    asset_class: AssetClass
    timeframe: str


class SignalResponse(BaseModel):
    pattern_detected: str
    deal_type: str
    entry_price: float
    stop_loss: float | None
    target_price: float | None
    confidence: float
    risk_reward_ratio: float | None
    data_source: str
    disclaimer: str
    generated_at: str


def _validate_timeframe(timeframe: str) -> Timeframe:
    if timeframe not in SUPPORTED_TIMEFRAMES:
        raise HTTPException(
            status_code=400,
            detail=f'Unsupported timeframe "{timeframe}". Use one of: {", ".join(SUPPORTED_TIMEFRAMES)}.',
        )
    return timeframe  # type: ignore[return-value]


async def _fetch_candles(symbol: str, asset_class: AssetClass, timeframe: Timeframe) -> list[Candle]:
    fetcher = _FETCHERS[asset_class]
    try:
        return await fetcher(symbol, timeframe)
    except MarketDataError as err:
        raise HTTPException(status_code=err.status_code, detail=str(err)) from err


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/v1/market/candles", response_model=list[CandleResponse])
async def get_candles(
    symbol: str = Query(..., min_length=1),
    asset_class: AssetClass = Query(...),
    timeframe: str = Query(...),
):
    tf = _validate_timeframe(timeframe)
    candles = await _fetch_candles(symbol, asset_class, tf)
    return candles


@app.get("/v1/market/quote", response_model=QuoteResponse)
async def get_quote(
    symbol: str = Query(..., min_length=1),
    asset_class: AssetClass = Query(...),
    timeframe: str = Query('1D'),
):
    # Paper-trading fill price: the latest available close from the same
    # (delayed, free) sources powering the charts — not a live tick quote.
    tf = _validate_timeframe(timeframe)
    data_source = 'binance' if asset_class == 'CRYPTO' else 'yahoo-finance'
    candles = await _fetch_candles(symbol, asset_class, tf)
    last = candles[-1]
    return QuoteResponse(symbol=symbol, price=last.close, as_of=last.time, data_source=data_source)


@app.post("/v1/analysis/signal", response_model=SignalResponse)
async def get_signal(payload: SignalRequest):
    tf = _validate_timeframe(payload.timeframe)
    data_source = 'binance' if payload.asset_class == 'CRYPTO' else 'yahoo-finance'
    candles = await _fetch_candles(payload.symbol, payload.asset_class, tf)

    try:
        return signal_engine.generate_signal(candles, data_source)
    except MarketDataError as err:
        raise HTTPException(status_code=err.status_code, detail=str(err)) from err
