from .data_sources.common import Candle


def sma(values: list[float], period: int) -> list[float | None]:
    out: list[float | None] = [None] * len(values)
    for i in range(period - 1, len(values)):
        out[i] = sum(values[i - period + 1 : i + 1]) / period
    return out


def ema(values: list[float], period: int) -> list[float | None]:
    out: list[float | None] = [None] * len(values)
    if len(values) < period:
        return out

    k = 2 / (period + 1)
    seed = sum(values[:period]) / period
    out[period - 1] = seed
    prev = seed
    for i in range(period, len(values)):
        prev = values[i] * k + prev * (1 - k)
        out[i] = prev
    return out


def rsi(closes: list[float], period: int = 14) -> list[float | None]:
    out: list[float | None] = [None] * len(closes)
    if len(closes) <= period:
        return out

    gains = [0.0] * len(closes)
    losses = [0.0] * len(closes)
    for i in range(1, len(closes)):
        delta = closes[i] - closes[i - 1]
        gains[i] = max(delta, 0.0)
        losses[i] = max(-delta, 0.0)

    avg_gain = sum(gains[1 : period + 1]) / period
    avg_loss = sum(losses[1 : period + 1]) / period
    out[period] = _rsi_from_averages(avg_gain, avg_loss)

    for i in range(period + 1, len(closes)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        out[i] = _rsi_from_averages(avg_gain, avg_loss)

    return out


def _rsi_from_averages(avg_gain: float, avg_loss: float) -> float:
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def macd(
    closes: list[float], fast: int = 12, slow: int = 26, signal: int = 9
) -> tuple[list[float | None], list[float | None], list[float | None]]:
    ema_fast = ema(closes, fast)
    ema_slow = ema(closes, slow)

    macd_line: list[float | None] = [
        (f - s) if f is not None and s is not None else None
        for f, s in zip(ema_fast, ema_slow)
    ]

    known = [v for v in macd_line if v is not None]
    signal_line: list[float | None] = [None] * len(closes)
    if len(known) >= signal:
        first_known_idx = next(i for i, v in enumerate(macd_line) if v is not None)
        seed_window = known[:signal]
        k = 2 / (signal + 1)
        prev = sum(seed_window) / signal
        signal_line[first_known_idx + signal - 1] = prev
        for i in range(first_known_idx + signal, len(macd_line)):
            v = macd_line[i]
            if v is None:
                continue
            prev = v * k + prev * (1 - k)
            signal_line[i] = prev

    histogram: list[float | None] = [
        (m - s) if m is not None and s is not None else None
        for m, s in zip(macd_line, signal_line)
    ]

    return macd_line, signal_line, histogram


def atr(candles: list[Candle], period: int = 14) -> list[float | None]:
    out: list[float | None] = [None] * len(candles)
    if len(candles) <= period:
        return out

    true_ranges = [0.0] * len(candles)
    for i in range(1, len(candles)):
        c = candles[i]
        prev_close = candles[i - 1].close
        true_ranges[i] = max(
            c.high - c.low,
            abs(c.high - prev_close),
            abs(c.low - prev_close),
        )

    avg = sum(true_ranges[1 : period + 1]) / period
    out[period] = avg
    for i in range(period + 1, len(candles)):
        avg = (avg * (period - 1) + true_ranges[i]) / period
        out[i] = avg

    return out


def swing_low(candles: list[Candle], lookback: int = 10) -> float:
    window = candles[-lookback:] if len(candles) >= lookback else candles
    return min(c.low for c in window)


def swing_high(candles: list[Candle], lookback: int = 10) -> float:
    window = candles[-lookback:] if len(candles) >= lookback else candles
    return max(c.high for c in window)
