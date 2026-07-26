import unittest
from datetime import datetime, timezone

from app import indicators
from app.data_sources.common import Candle


def _candle(close: float, high: float | None = None, low: float | None = None) -> Candle:
    return Candle(
        time=datetime.now(timezone.utc).isoformat(),
        open=close,
        high=high if high is not None else close + 1,
        low=low if low is not None else close - 1,
        close=close,
        volume=1000.0,
    )


class TestSma(unittest.TestCase):
    def test_sma_basic(self):
        values = [1, 2, 3, 4, 5]
        result = indicators.sma(values, 3)
        self.assertEqual(result, [None, None, 2, 3, 4])

    def test_sma_insufficient_data(self):
        self.assertEqual(indicators.sma([1, 2], 3), [None, None])


class TestEma(unittest.TestCase):
    def test_ema_seed_is_sma(self):
        values = [1, 2, 3, 4, 5]
        result = indicators.ema(values, 3)
        self.assertIsNone(result[0])
        self.assertIsNone(result[1])
        self.assertAlmostEqual(result[2], 2.0)  # seeded as SMA of first 3
        self.assertIsNotNone(result[4])


class TestRsi(unittest.TestCase):
    def test_rsi_all_gains_is_100(self):
        values = [float(i) for i in range(1, 20)]  # strictly increasing
        result = indicators.rsi(values, period=14)
        self.assertAlmostEqual(result[-1], 100.0)

    def test_rsi_all_losses_is_0(self):
        values = [float(i) for i in range(20, 1, -1)]  # strictly decreasing
        result = indicators.rsi(values, period=14)
        self.assertAlmostEqual(result[-1], 0.0)


class TestMacd(unittest.TestCase):
    def test_macd_shapes_match_input_length(self):
        values = [float(i) for i in range(1, 60)]
        macd_line, signal_line, hist = indicators.macd(values)
        self.assertEqual(len(macd_line), len(values))
        self.assertEqual(len(signal_line), len(values))
        self.assertEqual(len(hist), len(values))
        self.assertIsNotNone(macd_line[-1])
        self.assertIsNotNone(signal_line[-1])


class TestAtr(unittest.TestCase):
    def test_atr_constant_range_candles(self):
        candles = [_candle(close=100.0, high=101.0, low=99.0) for _ in range(20)]
        result = indicators.atr(candles, period=14)
        self.assertAlmostEqual(result[-1], 2.0)


class TestSwingLevels(unittest.TestCase):
    def test_swing_low_and_high(self):
        candles = [_candle(close=100.0 + i, high=100.0 + i + 1, low=100.0 + i - 1) for i in range(20)]
        self.assertEqual(indicators.swing_low(candles, lookback=5), min(c.low for c in candles[-5:]))
        self.assertEqual(indicators.swing_high(candles, lookback=5), max(c.high for c in candles[-5:]))


if __name__ == '__main__':
    unittest.main()
