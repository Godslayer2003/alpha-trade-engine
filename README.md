# Alpha-Trade Engine

A paper-trading terminal with an AI guide layered on top: live market data, pattern/signal
analysis, a practice portfolio, and an OpenRouter-powered chat assistant that can also run
automated "workflows" (like sending a daily portfolio briefing) on request.

**This app is simulated and advisory only.** There is no live order execution and no broker OAuth
— the broker recommendation matrix suggests brokers matching your investing style, it never places
trades or moves money. Nothing here is financial advice.

## Getting started

```bash
npm install

# Brings up Postgres, Redis, and the Python ai-engine (see docker-compose.yml)
docker compose up -d

cp .env.example .env   # fill in the values you have — see "Environment variables" below
npm run prisma:generate
npx prisma migrate deploy --schema packages/database/prisma/schema.prisma

npm run dev   # runs apps/web (Next.js), apps/api (NestJS), and ai-engine concurrently
```

- Web: http://localhost:3000
- API: http://localhost:3001
- AI engine (Python/FastAPI): http://localhost:8000

## Environment variables

All variables live in `.env` at the repo root (see `.env.example`), shared by `apps/api` and
`packages/ai-engine`.

| Variable | Required for | Notes |
| --- | --- | --- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Database | Used by `docker-compose.yml` and `DATABASE_URL` |
| `DATABASE_URL` | Database | Prisma connection string |
| `REDIS_URL` | — | Provisioned via `docker-compose.yml`; not currently consumed by any code |
| `AI_ENGINE_URL` | `apps/api` → `packages/ai-engine` calls | Defaults to `http://localhost:8000` |
| `JWT_SECRET` | Auth | Any random string in dev |
| `ADMIN_EMAILS` | Assistant config editing / feedback log | Comma-separated emails; blocked for everyone if unset |
| `AI_ENGINE_SHARED_SECRET` | Locks down the ai-engine's public URL | Any random string, must match on both `apps/api` and `packages/ai-engine`; optional (unenforced) if unset |
| `WEB_ORIGIN` | CORS | The web app's origin; any origin allowed if unset |
| `OPENROUTER_API_KEY` | AI Guide chat, RAG, workflow intent classification | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `GEMINI_API_KEY` | AI Insight Reports / Market News Explainer / Company Reports | [Google AI Studio](https://aistudio.google.com/apikey) — **not** used by the AI Guide chat |
| `TELEGRAM_BOT_TOKEN` | Telegram bot (bot stays disabled if unset) | See "Components" below |
| `RESEND_API_KEY` | Daily report emails (feature disabled if unset) | [resend.com](https://resend.com) dashboard |
| `NEXT_PUBLIC_API_URL` | Web → API | Defaults to `http://localhost:3001` |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | "Connect Telegram" deep link | Your bot's `@username` |

## Architecture

```mermaid
flowchart LR
    subgraph DS ["Data Sources"]
        YF("Yahoo Finance")
        BN("Binance")
    end

    subgraph AGT ["Agent - Brain"]
        AG("AI Guide<br/>OpenRouter + RAG")
        RG("AI Report Generator<br/>Gemini")
    end

    subgraph WFS ["Workflows"]
        WF("Workflow Registry<br/>e.g. Daily Portfolio Briefing")
    end

    subgraph TLS ["Tools - Services"]
        TG("Telegram")
        EM("Email / Resend")
        BR("Broker matrix<br/>advisory only")
    end

    YF --> AG
    BN --> AG
    YF --> RG
    BN --> RG

    Portfolio[("Portfolio / Prisma")] --> WF
    AG -- "classifies intent,<br/>triggers" --> WF
    WF --> TG
    WF --> EM

    AG --> TG
    AG -. "chat reply" .-> User(("User"))
    RG --> User
    BR --> User

    classDef dataSrc fill:#dbeafe,stroke:#3b82f6,stroke-width:1.5px,color:#1e3a8a;
    classDef agent fill:#ede9fe,stroke:#8b5cf6,stroke-width:1.5px,color:#4c1d95;
    classDef workflow fill:#ccfbf1,stroke:#14b8a6,stroke-width:1.5px,color:#134e4a;
    classDef tool fill:#ffedd5,stroke:#f97316,stroke-width:1.5px,color:#7c2d12;
    classDef store fill:#f1f5f9,stroke:#64748b,stroke-width:1.5px,color:#1e293b;
    classDef userNode fill:#fce7f3,stroke:#db2777,stroke-width:1.5px,color:#831843;

    class YF,BN dataSrc;
    class AG,RG agent;
    class WF workflow;
    class TG,EM,BR tool;
    class Portfolio store;
    class User userNode;

    style DS fill:#eff6ff,stroke:#93c5fd,stroke-width:1px;
    style AGT fill:#f5f3ff,stroke:#c4b5fd,stroke-width:1px;
    style WFS fill:#f0fdfa,stroke:#5eead4,stroke-width:1px;
    style TLS fill:#fff7ed,stroke:#fdba74,stroke-width:1px;
```

The AI Guide is reachable from the web chat widget and from the Telegram bot's `/ask` command —
both funnel through the same `AssistantService.chat()` entry point. When a signed-in user's
message matches a known workflow (e.g. "run my daily briefing"), the AI Guide classifies that
intent, runs the workflow, and reports back which one ran and where it was sent — instead of just
answering conversationally.

## Components

See `/components` in the running app for a live status board of everything below.

### Data Connectors

- **Yahoo Finance** / **Binance** — no API key required, public endpoints.
- **Telegram account link** — see the Telegram bot token steps below, then use "Connect Telegram"
  in Settings.

### Agent (Brain)

- **AI Guide** (OpenRouter + RAG) — get an API key at [openrouter.ai/keys](https://openrouter.ai/keys),
  set `OPENROUTER_API_KEY`.
- **AI Report Generator** (Gemini) — get an API key at
  [Google AI Studio](https://aistudio.google.com/apikey), set `GEMINI_API_KEY`.

### Tools (Services)

- **Email (Resend)** — get an API key from your [resend.com](https://resend.com) dashboard, set
  `RESEND_API_KEY`.
- **Telegram bot**:
  1. Open Telegram and message [@BotFather](https://t.me/BotFather).
  2. Send `/newbot` and follow the prompts.
  3. Copy the token BotFather gives you into `TELEGRAM_BOT_TOKEN`.
  4. Restart `apps/api`, then link your own account from Settings and try the "Telegram Test
     Message" component at `/components/telegram-test`.
- **Broker recommendation matrix** — no API key; it's a static, advisory-only suggestion list, not
  a live broker connection.
