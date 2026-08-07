import logging
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

from . import agents, rag, signal_engine
from .data_sources import binance, yahoo
from .data_sources.common import Candle, MarketDataError, SUPPORTED_TIMEFRAMES, Timeframe

app = FastAPI(title="Alpha-Trade AI Analysis Core", version="0.2.0")

logger = logging.getLogger('uvicorn.error')


@app.on_event("startup")
async def warm_up_embedding_model() -> None:
    # sentence-transformers downloads + loads the model (~90MB) the first
    # time it's used, which can take well over the frontend's request
    # timeout on a cold container. Paying that cost once at startup — before
    # Railway routes any real traffic here — keeps the first real chat
    # message from timing out.
    try:
        rag.build_index('warm up', chunk_size_tokens=8)
        logger.info('Assistant embedding model warmed up.')
    except Exception as err:  # pragma: no cover - best-effort warm-up
        logger.warning(f'Embedding model warm-up failed (will lazy-load on first request): {err}')

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


# --- RAG-grounded site assistant (AI Guide) ---
# apps/api owns persistence of the prompt/knowledge-base/feedback (Postgres);
# this service is stateless per request except for the in-memory chunk/
# embedding cache in rag.py, keyed off the knowledge-base text it's handed.

class AssistantChatMessage(BaseModel):
    role: Literal['user', 'assistant']
    content: str


class AssistantChatRequest(BaseModel):
    message: str
    history: list[AssistantChatMessage] = []
    model: str = agents.DEFAULT_MODEL
    system_prompt: str
    knowledge_base: str


class Citation(BaseModel):
    index: int
    chunk_text: str
    similarity: float


class AssistantChatResponse(BaseModel):
    reply: str
    citations: list[Citation]
    model: str
    input_tokens: int
    output_tokens: int
    response_time_ms: int


class AssistantChunksRequest(BaseModel):
    knowledge_base: str
    chunk_size: int = rag.DEFAULT_CHUNK_SIZE_TOKENS


class ChunkResponse(BaseModel):
    index: int
    text: str
    tokens: int


@app.post("/v1/assistant/chat", response_model=AssistantChatResponse)
async def assistant_chat(payload: AssistantChatRequest):
    retrieved = rag.retrieve(payload.message, payload.knowledge_base)

    if retrieved:
        sources_block = '\n\n'.join(
            f'[Source {i + 1}] (similarity {r.similarity:.2f}): {r.chunk.text}'
            for i, r in enumerate(retrieved)
        )
        grounded_prompt = (
            f'{payload.system_prompt}\n\n'
            'You have retrieved the following knowledge base excerpts relevant to the '
            "user's question. Answer using ONLY these excerpts — if they don't contain "
            "the answer, say you don't have that information instead of guessing. Cite "
            'the sources you used inline, e.g. "[Source 1]".\n\n'
            f'{sources_block}'
        )
    else:
        grounded_prompt = payload.system_prompt

    history = [{'role': m.role, 'content': m.content} for m in payload.history]
    history.append({'role': 'user', 'content': payload.message})

    try:
        result = await agents.ask_with_context(history, grounded_prompt, payload.model)
    except agents.AgentError as err:
        raise HTTPException(status_code=502, detail=str(err)) from err

    citations = [
        Citation(index=i + 1, chunk_text=r.chunk.text, similarity=r.similarity)
        for i, r in enumerate(retrieved)
    ]

    return AssistantChatResponse(
        reply=result.reply,
        citations=citations,
        model=payload.model,
        input_tokens=result.input_tokens,
        output_tokens=result.output_tokens,
        response_time_ms=result.response_time_ms,
    )


@app.post("/v1/assistant/chunks", response_model=list[ChunkResponse])
async def assistant_chunks(payload: AssistantChunksRequest):
    chunks = rag.chunk_text(payload.knowledge_base, payload.chunk_size)
    return [ChunkResponse(index=c.index, text=c.text, tokens=c.tokens) for c in chunks]
