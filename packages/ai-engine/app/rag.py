import re
from dataclasses import dataclass

DEFAULT_CHUNK_SIZE_TOKENS = 128


@dataclass
class Chunk:
    index: int
    text: str
    tokens: int


def _approx_token_count(text: str) -> int:
    words = len(text.split())
    return max(1, round(words * 1.3))


def chunk_text(knowledge_base: str, chunk_size_tokens: int = DEFAULT_CHUNK_SIZE_TOKENS) -> list[Chunk]:
    """Split text into approximate token-sized chunks without splitting sentences."""
    if chunk_size_tokens < 8 or chunk_size_tokens > 4096:
        raise ValueError('chunk_size must be between 8 and 4096 tokens')

    sentences = [
        sentence.strip()
        for sentence in re.split(r'(?<=[.!?])\s+', knowledge_base.strip())
        if sentence.strip()
    ]
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


def build_index(knowledge_base: str, chunk_size_tokens: int = DEFAULT_CHUNK_SIZE_TOKENS) -> list[Chunk]:
    """Backward-compatible startup hook; retrieval embeddings are no longer needed."""
    return chunk_text(knowledge_base, chunk_size_tokens)
