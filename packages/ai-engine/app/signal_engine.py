from datetime import datetime, timezone
from typing import TypedDict

from . import indicators
from .data_sources.common import Candle, MarketDataError

DISCLAIMER = (
    'Rules-based technical analysis (moving averages, RSI, MACD, ATR) — not '
    'financial advice. Markets involve risk; verify independently before trading.'
)

MIN_CANDLES = 50
SWING_LOOKBACK = 10


class Signal(TypedDict):
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


def generate_signal(candles: list[Candle], data_source: str) -> Signal:
    if len(candles) < MIN_CANDLES:
        raise MarketDataError(
            f'Only {len(candles)} candles available; need at least {MIN_CANDLES} '
            'for a reliable signal.',
            status_code=422,
        )

    closes = [c.close for c in candles]

    sma20 = indicators.sma(closes, 20)[-1]
    sma50 = indicators.sma(closes, 50)[-1]
    rsi14 = indicators.rsi(closes, 14)[-1]
    _, _, macd_hist = indicators.macd(closes)
    hist_last = macd_hist[-1]
    atr14 = indicators.atr(candles, 14)[-1] or 0.0

    score = 0
    reasons: list[str] = []

    if sma20 is not None and sma50 is not None:
        if sma20 > sma50:
            score += 1
            reasons.append('uptrend (SMA20 above SMA50)')
        elif sma20 < sma50:
            score -= 1
            reasons.append('downtrend (SMA20 below SMA50)')

    if rsi14 is not None:
        if rsi14 > 55:
            score += 1
            reasons.append(f'RSI {rsi14:.1f} shows bullish momentum')
        elif rsi14 < 45:
            score -= 1
            reasons.append(f'RSI {rsi14:.1f} shows bearish momentum')

    if hist_last is not None:
        if hist_last > 0:
            score += 1
            reasons.append('MACD histogram positive (bullish crossover)')
        elif hist_last < 0:
            score -= 1
            reasons.append('MACD histogram negative (bearish crossover)')

    entry = closes[-1]
    confidence = round(0.3 + (abs(score) / 3) * 0.5, 2)

    if score >= 2:
        deal_type = 'LONG'
        raw_stop = indicators.swing_low(candles, SWING_LOOKBACK) - 0.5 * atr14
        risk = entry - raw_stop
        if risk <= 0:
            risk = max(atr14, entry * 0.01)
            raw_stop = entry - risk
        stop_loss = raw_stop
        target_price = entry + 2 * risk
        risk_reward_ratio = round((target_price - entry) / risk, 2)
    elif score <= -2:
        deal_type = 'SHORT'
        raw_stop = indicators.swing_high(candles, SWING_LOOKBACK) + 0.5 * atr14
        risk = raw_stop - entry
        if risk <= 0:
            risk = max(atr14, entry * 0.01)
            raw_stop = entry + risk
        stop_loss = raw_stop
        target_price = entry - 2 * risk
        risk_reward_ratio = round((entry - target_price) / risk, 2)
    else:
        deal_type = 'NEUTRAL'
        stop_loss = None
        target_price = None
        risk_reward_ratio = None

    pattern_detected = '; '.join(reasons) if reasons else 'No clear directional bias'

    return Signal(
        pattern_detected=pattern_detected,
        deal_type=deal_type,
        entry_price=round(entry, 4),
        stop_loss=round(stop_loss, 4) if stop_loss is not None else None,
        target_price=round(target_price, 4) if target_price is not None else None,
        confidence=confidence,
        risk_reward_ratio=risk_reward_ratio,
        data_source=data_source,
        disclaimer=DISCLAIMER,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )
