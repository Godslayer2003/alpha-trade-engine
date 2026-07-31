import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { AssetClass } from '@alpha-trade/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { MarketService } from '../market/market.service';
import { GetReportDto } from './dto/get-report.dto';

const MODEL = 'gemini-3.6-flash';

// Rounds a requested month count up to the nearest timeframe the ai-engine's
// candle fetchers actually support (see packages/ai-engine/app/data_sources/common.py).
function monthsToTimeframe(months: number): string {
  if (months <= 1) return '1M';
  if (months <= 3) return '3M';
  if (months <= 6) return '6M';
  if (months <= 9) return '9M';
  if (months <= 12) return '1Y';
  if (months <= 60) return '5Y';
  return '10Y';
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private client: GoogleGenAI | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketService: MarketService,
  ) {}

  async getOrGenerate(dto: GetReportDto) {
    const periodLabel = `${dto.months}M`;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const cached = await this.prisma.aiReport.findFirst({
      where: {
        symbol: dto.symbol,
        assetClass: dto.assetClass,
        periodLabel,
        generatedAt: { gte: startOfToday },
      },
      orderBy: { generatedAt: 'desc' },
    });
    if (cached) return cached;

    return this.generate(dto, periodLabel);
  }

  private async generate(dto: GetReportDto, periodLabel: string) {
    const timeframe = monthsToTimeframe(dto.months);
    const candles = await this.marketService.getCandles({
      symbol: dto.symbol,
      assetClass: dto.assetClass,
      timeframe,
    });

    if (candles.length === 0) {
      throw new ServiceUnavailableException(`No market data available for ${dto.symbol}.`);
    }

    const first = candles[0];
    const last = candles[candles.length - 1];
    const pctChange = ((last.close - first.close) / first.close) * 100;
    const high = Math.max(...candles.map((c) => c.high));
    const low = Math.min(...candles.map((c) => c.low));
    const direction = pctChange >= 0 ? 'risen' : 'fallen';

    const prompt =
      `${dto.symbol} has ${direction} ${Math.abs(pctChange).toFixed(1)}% over the last ${dto.months} ` +
      `month(s), moving from $${first.close.toFixed(2)} to $${last.close.toFixed(2)} ` +
      `(range: $${low.toFixed(2)}–$${high.toFixed(2)}). Write a short (3-5 sentence) explanation of the ` +
      `real-world news, events, or macro factors most likely behind this move. Be specific ` +
      `(name countries, companies, policies, or events where relevant) rather than vague. If you ` +
      `genuinely don't have grounded information for this specific move, say so plainly instead of guessing.`;

    const client = this.getClient();

    try {
      const interaction = await client.interactions.create({
        model: MODEL,
        system_instruction:
          'You are a markets analyst explaining real price moves using current, factual information. Never fabricate news.',
        input: prompt,
        tools: [{ type: 'google_search' }],
        generation_config: { max_output_tokens: 900, thinking_level: 'low' },
      });
      return this.saveReport(dto, periodLabel, interaction.output_text ?? '', true);
    } catch (err) {
      // The google_search grounding tool isn't available on every API tier
      // (confirmed to 429 on the current free-tier key) — fall back to a
      // technical/price-action-only narrative rather than failing outright,
      // clearly labeled as ungrounded so the UI never implies real news backing.
      this.logger.warn(`Grounded report generation failed, falling back: ${(err as Error).message}`);
      const fallbackPrompt =
        `${dto.symbol} has ${direction} ${Math.abs(pctChange).toFixed(1)}% over the last ${dto.months} ` +
        `month(s), moving from $${first.close.toFixed(2)} to $${last.close.toFixed(2)} ` +
        `(range: $${low.toFixed(2)}–$${high.toFixed(2)}). Write a short (3-5 sentence) technical read on this ` +
        `move — trend strength, volatility, and what the range suggests — using only these numbers. Do not ` +
        `speculate about news or events since you have no access to them; end with one sentence noting you're ` +
        `working from price action only, not news.`;
      try {
        const interaction = await client.interactions.create({
          model: MODEL,
          system_instruction:
            'You are a markets analyst. You do NOT have access to live news or search — explain price moves ' +
            'purely in terms of the technical price action given to you.',
          input: fallbackPrompt,
          generation_config: { max_output_tokens: 700, thinking_level: 'low' },
        });
        return this.saveReport(dto, periodLabel, interaction.output_text ?? '', false);
      } catch (fallbackErr) {
        this.logger.error(`Fallback report generation also failed: ${(fallbackErr as Error).message}`);
        throw new ServiceUnavailableException(
          'The AI report service is temporarily unavailable (rate limited) — try again in a minute.',
        );
      }
    }
  }

  private saveReport(dto: GetReportDto, periodLabel: string, content: string, grounded: boolean) {
    return this.prisma.aiReport.create({
      data: {
        symbol: dto.symbol,
        assetClass: dto.assetClass as AssetClass,
        periodLabel,
        content,
        grounded,
      },
    });
  }

  private getClient(): GoogleGenAI {
    if (this.client) return this.client;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('AI reports are not configured on this server (missing GEMINI_API_KEY).');
    }
    this.client = new GoogleGenAI({ apiKey });
    return this.client;
  }
}
