import hashlib
import re
from dataclasses import dataclass
from functools import lru_cache

import numpy as np
from sentence_transformers import SentenceTransformer

EMBEDDING_MODEL_NAME = 'all-MiniLM-L6-v2'
DEFAULT_CHUNK_SIZE_TOKENS = 128
TOP_K = 3

# Small in-memory index cache keyed by (knowledge_base text, chunk size), so
# a given prompt/KB combo only gets re-chunked and re-embedded once per
# process lifetime rather than on every chat message. Capped to bound memory
# use if someone experiments with several chunk sizes on the Chunks page.
_MAX_CACHED_INDEXES = 8
_index_cache: dict[str, 'Index'] = {}


@dataclass
class Chunk:
    index: int
    text: str
    tokens: int


@dataclass
class Retrieved:
    chunk: Chunk
    similarity: float


@dataclass
class Index:
    chunks: list[Chunk]
    embeddings: np.ndarray  # shape (n_chunks, dim), L2-normalized


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    # Loaded lazily on first use — the model download/load takes a few
    # seconds, which is why callers show a loading state on first request.
    return SentenceTransformer(EMBEDDING_MODEL_NAME)


def _approx_token_count(text: str) -> int:
    # No tokenizer tied to one specific model (models are swappable via
    # OpenRouter), so this is a fast approximation: ~1.3 tokens per word,
    # which is close enough for chunk-sizing purposes.
    words = len(text.split())
    return max(1, round(words * 1.3))


def chunk_text(knowledge_base: str, chunk_size_tokens: int = DEFAULT_CHUNK_SIZE_TOKENS) -> list[Chunk]:
    """Splits knowledge_base into ~chunk_size_tokens-token chunks, keeping
    whole sentences together and never splitting mid-sentence."""
    # Split into sentences first (on sentence-ending punctuation followed by
    # whitespace), then greedily pack sentences into chunks under the budget.
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', knowledge_base.strip()) if s.strip()]

    chunks: list[Chunk] = []
    current: list[str] = []
    current_tokens = 0

    for sentence in sentences:
        sentence_tokens = _approx_token_count(sentence)
        if current and current_tokens + sentence_tokens > chunk_size_tokens:
            text = ' '.join(current)
            chunks.append(Chunk(index=len(chunks), text=text, tokens=_approx_token_count(text)))
            current = []
            current_tokens = 0
        current.append(sentence)
        current_tokens += sentence_tokens

    if current:
        text = ' '.join(current)
        chunks.append(Chunk(index=len(chunks), text=text, tokens=_approx_token_count(text)))

    return chunks


def _cache_key(knowledge_base: str, chunk_size_tokens: int) -> str:
    raw = f'{chunk_size_tokens}:{knowledge_base}'
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def build_index(knowledge_base: str, chunk_size_tokens: int = DEFAULT_CHUNK_SIZE_TOKENS) -> Index:
    key = _cache_key(knowledge_base, chunk_size_tokens)
    cached = _index_cache.get(key)
    if cached is not None:
        return cached

    chunks = chunk_text(knowledge_base, chunk_size_tokens)
    model = _get_model()
    if chunks:
        embeddings = model.encode([c.text for c in chunks], normalize_embeddings=True)
    else:
        embeddings = np.zeros((0, model.get_sentence_embedding_dimension()))

    index = Index(chunks=chunks, embeddings=np.asarray(embeddings))

    if len(_index_cache) >= _MAX_CACHED_INDEXES:
        _index_cache.pop(next(iter(_index_cache)))
    _index_cache[key] = index

    return index


def retrieve(
    query: str,
    knowledge_base: str,
    chunk_size_tokens: int = DEFAULT_CHUNK_SIZE_TOKENS,
    top_k: int = TOP_K,
) -> list[Retrieved]:
    """Embeds query and returns the top_k most similar chunks (cosine
    similarity, since embeddings are L2-normalized)."""
    index = build_index(knowledge_base, chunk_size_tokens)
    if not index.chunks:
        return []

    model = _get_model()
    query_embedding = model.encode([query], normalize_embeddings=True)[0]

    similarities = index.embeddings @ query_embedding
    top_indices = np.argsort(-similarities)[:top_k]

    return [Retrieved(chunk=index.chunks[i], similarity=float(similarities[i])) for i in top_indices]
