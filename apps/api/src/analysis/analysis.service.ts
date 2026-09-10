import { Injectable } from '@nestjs/common';
import { DealType, TradeSignal } from '@alpha-trade/shared-types';
import { AiEngineClient } from '../ai-engine/ai-engine-client.service';
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

@Injectable()
export class AnalysisService {
  constructor(private readonly aiEngine: AiEngineClient) {}

  async getTradeSignal(dto: GetSignalDto): Promise<TradeSignal> {
    const response = await this.aiEngine.post<AiEngineSignalResponse>('/v1/analysis/signal', {
      symbol: dto.symbol,
      asset_class: dto.assetClass,
      timeframe: dto.timeframe,
    });
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
}
