import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { ChatMessageDto } from './dto/chat.dto';

const SYSTEM_PROMPT = `You are the in-app guide for Alpha-Trade Engine, a web app that:
- Shows real market data (stocks/ETFs/indices via Yahoo Finance, crypto via Binance, commodities via Yahoo futures) as candlestick charts.
- Computes trading signals using a transparent, rules-based technical-analysis engine (moving averages, RSI, MACD, ATR) — NOT a trained machine-learning model, and NOT financial advice.
- Lets users practice with a paper-trading portfolio: fake starting cash, real market prices, no real money at risk.
- Recommends brokers and sector/company ideas from a static curated matrix (not personalized advice).

Your job is ONLY to explain what's on screen — the current signal, what an indicator means, how the paper-trading portfolio works, general concepts like risk/reward ratio. You are a read-only guide:
- You cannot execute trades, change settings, or take any action in the app — if asked to do something, explain that they need to use the UI controls themselves.
- Never present anything as personalized financial advice or a guarantee. If discussing a specific signal, remind the user it's rules-based technical analysis, not a prediction.
- Be concise — this is a chat widget, not an essay.`;

// Free-tier Gemini model — kept as low-cost/no-cost as possible for a
// lightweight explainer widget (see conversation with the user about not
// wanting to pay for the Anthropic API for this feature).
const MODEL = 'gemini-3.6-flash';

// Flattened into a single prompt rather than using Gemini's stateful
// interaction-chaining (previous_interaction_id) — keeps the frontend's
// existing "resend full history" contract simple and provider-agnostic.
// Capped to bound token usage on the free tier.
const HISTORY_LIMIT = 6;

@Injectable()
export class AssistantService {
  private client: GoogleGenAI | null = null;

  async chat(messages: ChatMessageDto[], context?: Record<string, unknown>): Promise<string> {
    const client = this.getClient();

    const contextNote = context
      ? `\n\nCurrent app state (for your reference, not necessarily to repeat verbatim):\n${JSON.stringify(context, null, 2)}`
      : '';

    const transcript = messages
      .slice(-HISTORY_LIMIT)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const interaction = await client.interactions.create({
      model: MODEL,
      system_instruction: SYSTEM_PROMPT + contextNote,
      input: transcript,
    });

    return interaction.output_text ?? '';
  }

  private getClient(): GoogleGenAI {
    if (this.client) return this.client;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'The AI guide is not configured on this server (missing GEMINI_API_KEY).',
      );
    }

    this.client = new GoogleGenAI({ apiKey });
    return this.client;
  }
}
