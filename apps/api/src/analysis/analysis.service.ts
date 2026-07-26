import { HttpException, Injectable } from '@nestjs/common';
import { DealType, TradeSignal } from '@alpha-trade/shared-types';
import { GetSignalDto } from './dto/get-signal.dto';

// Mirrors the AI engine's SignalResponse (packages/ai-engine/app/main.py) —
// Python's own snake_case convention, translated to the shared camelCase
// TradeSignal contract below before it reaches any TS consumer.
interface AiEngineSignalResponse {
  pattern_detected: string;
  deal_type: string;
  entry_price: number;
  stop_loss: number | null;
  target_price: number | null;
  confidence: number;
  risk_reward_ratio: number | null;
  data_source: string;
  disclaimer: string;
  generated_at: string;
}

const REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class AnalysisService {
  private readonly aiEngineUrl = process.env.AI_ENGINE_URL ?? 'http://localhost:8000';

  async getTradeSignal(dto: GetSignalDto): Promise<TradeSignal> {
    const response = await this.callAiEngine(dto);
    return {
      patternDetected: response.pattern_detected,
      dealType: response.deal_type as DealType,
      entryPrice: response.entry_price,
      stopLoss: response.stop_loss,
      targetPrice: response.target_price,
      confidence: response.confidence,
      riskRewardRatio: response.risk_reward_ratio,
      dataSource: response.data_source,
      disclaimer: response.disclaimer,
      generatedAt: response.generated_at,
    };
  }

  private async callAiEngine(dto: GetSignalDto): Promise<AiEngineSignalResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${this.aiEngineUrl}/v1/analysis/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: dto.symbol,
          asset_class: dto.assetClass,
          timeframe: dto.timeframe,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      throw new HttpException(
        `Could not reach the AI analysis engine at ${this.aiEngineUrl}: ${(err as Error).message}`,
        502,
      );
    } finally {
      clearTimeout(timeout);
    }

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const detail = (body && (body as { detail?: string }).detail) || `status ${res.status}`;
      throw new HttpException(detail, res.status);
    }

    return body as AiEngineSignalResponse;
  }
}
