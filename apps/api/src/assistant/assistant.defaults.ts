// Seed content for the AssistantConfig singleton row — used only the first
// time the app runs (before anyone has edited the prompt/knowledge base on
// the Settings > AI Guide page). After that the DB row is authoritative.

export const DEFAULT_SYSTEM_PROMPT = `You are the in-app guide for Alpha-Trade Engine, a paper-trading practice app.

Behavior:
- Be concise: default to 1-3 short sentences, plain conversational prose. Only go longer if the user explicitly asks for more detail.
- Be accurate: answer only from the knowledge base excerpts you're given. If they don't cover the question, say you don't have that information instead of guessing.
- You are a read-only guide — you cannot execute trades, change settings, or take any action in the app. If asked to do something, explain that the user needs to use the UI controls themselves.
- Never present anything as personalized financial advice or a guarantee.

Example outputs:
Q: How does the stop-loss work?
A: You can set a stop-loss price on each holding; if the market price drops to or below it, the position is automatically sold [Source 1].

Q: Can you buy this stock for me?
A: I can't place trades — use the Buy button on the dashboard yourself.

Q: What's the weather like today?
A: I can only help with questions about Alpha-Trade Engine.`;

export const DEFAULT_KNOWLEDGE_BASE = `Alpha-Trade Engine is a paper-trading practice app for stocks, ETFs, indexes, crypto, and commodities. It shows real market data as candlestick charts, sourced from Yahoo Finance for equities/commodities and Binance for crypto.

Trading signals come from a transparent, rules-based technical-analysis engine using moving averages, RSI, MACD, and ATR. This is NOT a trained machine-learning model and NOT financial advice — it's a fixed set of indicator rules applied to price data.

The practice portfolio starts with fake cash and uses real market prices, so users can practice trading with no real money at risk. Trades execute immediately at the latest available price.

Each holding can have an optional stop-loss price, set from the portfolio panel. A background job checks prices every 5 minutes; if a holding's price drops to or below its stop-loss, the position is automatically sold and the cash is credited back to the portfolio.

The Unusual Movers scanner flags stocks and ETFs from a curated watchlist that are moving well outside their own recent volatility norms — a large price swing combined with a high statistical z-score versus the last 20 trading days. It's meant to surface names reacting to news or other triggers, refreshed once per trading day.

Users can connect Telegram and/or email to receive a daily portfolio report at a time of their choosing, and can send themselves a test notification from Settings. Telegram is linked with a one-time code generated in the app.

The Broker Recommendations panel suggests brokers and general sector/company ideas from a static curated matrix based on a user's stated investment style and risk tolerance — this is not personalized financial advice.

All new accounts must read and accept the Disclaimer & Terms of Use at signup, which state that the app is for educational/simulated trading only, provides no warranty on data or AI-generated content, and that all trading decisions and their outcomes are the user's sole responsibility. A dismissible reminder banner repeats this on the dashboard.

Settings lets users edit their profile, notification preferences, appearance (light/dark mode), and reset their practice portfolio back to its starting cash balance — which permanently deletes all holdings and trade history.`;
