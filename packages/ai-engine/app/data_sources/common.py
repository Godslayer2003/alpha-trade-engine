from dataclasses import dataclass
from typing import Literal

Timeframe = Literal['1H', '1D', '1W']

SUPPORTED_TIMEFRAMES: tuple[Timeframe, ...] = ('1H', '1D', '1W')


@dataclass(frozen=True)
class Candle:
    time: str  # ISO 8601
    open: float
    high: float
    low: float
    close: float
    volume: float


class MarketDataError(Exception):
    """Raised when a symbol can't be resolved or upstream data can't be fetched.

    Carries an HTTP-ish status_code so the API layer can translate it directly
    (404 for an unknown symbol, 502 for an unreachable/broken upstream) instead
    of masking every failure as a generic 500.
    """

    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code
