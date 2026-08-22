import json
import os
import time
from dataclasses import dataclass
from pathlib import Path

import httpx
from dotenv import load_dotenv


def _load_root_env() -> None:
    # Local dev keeps a single .env at the monorepo root (shared with the
    # Node apps), several directories up from this file. In Railway's Docker
    # image only packages/ai-engine/app is copied in, so that root doesn't
    # exist at all — real env vars are injected directly there instead, so
    # walking up and finding nothing is expected and fine.
    for directory in Path(__file__).resolve().parents:
        candidate = directory / '.env'
        if candidate.exists():
            load_dotenv(candidate)
            return


_load_root_env()

OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

# OpenRouter, not a provider SDK directly, so swapping models/providers later
# is a one-line change here rather than a rewrite. OpenRouter rotates which
# models are free fairly often — verify against GET /api/v1/models before
# assuming a `:free` slug from docs/examples is still live.
DEFAULT_MODEL = 'google/gemma-4-31b-it:free'

REQUEST_TIMEOUT_SECONDS = 30.0

# Without an explicit cap, OpenRouter defaults to the model's max output
# (e.g. 65536 for Claude Sonnet 5), which a low account balance can't afford
# even for a short chat reply. A chat assistant reply never needs anywhere
# near that much.
MAX_OUTPUT_TOKENS = 1024


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
                json={'model': model, 'messages': messages, 'max_tokens': MAX_OUTPUT_TOKENS},
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


async def classify_intent(message: str, workflows: list[dict], model: str = DEFAULT_MODEL) -> str | None:
    """Returns a workflow id if `message` is clearly asking to run one of the
    given workflows, else None (including on any classification error — this
    is a nice-to-have layered on top of normal chat, so it fails open)."""
    if not workflows:
        return None

    catalog = '\n'.join(f"- {w['id']}: {w['name']} — {w['description']}" for w in workflows)
    prompt = (
        'You classify whether a user message is asking to run one of these workflows. '
        f'Available workflows:\n{catalog}\n\n'
        'Reply with ONLY a JSON object: {"workflow_id": "<id>"} if the message clearly asks to run '
        'one of these, or {"workflow_id": null} if it is a normal question/conversation. No other text.'
    )
    try:
        content, _usage = await _call_openrouter(
            [{'role': 'system', 'content': prompt}, {'role': 'user', 'content': message}], model,
        )
        parsed = json.loads(content.strip().strip('`'))
        workflow_id = parsed.get('workflow_id')
        valid_ids = {w['id'] for w in workflows}
        return workflow_id if workflow_id in valid_ids else None
    except (AgentError, json.JSONDecodeError, AttributeError, TypeError):
        return None
