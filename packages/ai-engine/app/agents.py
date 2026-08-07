import os
import time
from dataclasses import dataclass
from pathlib import Path

import httpx
from dotenv import load_dotenv

# Local dev keeps a single .env at the monorepo root (shared with the Node
# apps); Railway sets real env vars in production, where this is a no-op
# since there's no .env file to find.
load_dotenv(Path(__file__).resolve().parents[3] / '.env')

OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

# OpenRouter, not a provider SDK directly, so swapping models/providers later
# is a one-line change here rather than a rewrite.
DEFAULT_MODEL = 'deepseek/deepseek-r1:free'

REQUEST_TIMEOUT_SECONDS = 30.0


class AgentError(Exception):
    """Raised when OpenRouter can't be reached or returns an unusable response."""


@dataclass
class ChatResult:
    reply: str
    input_tokens: int
    output_tokens: int
    response_time_ms: int


async def _call_openrouter(messages: list[dict[str, str]], model: str) -> tuple[str, dict]:
    api_key = os.environ.get('OPENROUTER_API_KEY')
    if not api_key:
        raise AgentError('OPENROUTER_API_KEY is not set (check your .env file).')

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
        try:
            response = await client.post(
                OPENROUTER_API_URL,
                headers={'Authorization': f'Bearer {api_key}'},
                json={'model': model, 'messages': messages},
            )
        except httpx.RequestError as err:
            raise AgentError(f'Could not reach OpenRouter: {err}') from err

    if response.status_code != 200:
        raise AgentError(f'OpenRouter returned {response.status_code}: {response.text}')

    body = response.json()
    try:
        content = body['choices'][0]['message']['content']
    except (KeyError, IndexError) as err:
        raise AgentError(f'Unexpected OpenRouter response shape: {body}') from err

    return content, body.get('usage', {})


async def ask(message: str, model: str = DEFAULT_MODEL) -> str:
    """Sends a single user message to an OpenRouter-hosted model and returns its reply text."""
    content, _usage = await _call_openrouter([{'role': 'user', 'content': message}], model)
    return content


async def ask_with_context(
    history: list[dict[str, str]],
    system_prompt: str,
    model: str = DEFAULT_MODEL,
) -> ChatResult:
    """Like ask(), but carries a system prompt + multi-turn history and reports
    token usage/timing — used by the RAG-grounded site assistant, which needs
    that metadata for citations and the thumbs up/down eval log."""
    messages = [{'role': 'system', 'content': system_prompt}, *history]

    started = time.monotonic()
    content, usage = await _call_openrouter(messages, model)
    elapsed_ms = int((time.monotonic() - started) * 1000)

    return ChatResult(
        reply=content,
        input_tokens=usage.get('prompt_tokens', 0),
        output_tokens=usage.get('completion_tokens', 0),
        response_time_ms=elapsed_ms,
    )
