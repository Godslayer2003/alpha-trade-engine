import { HttpException, Injectable } from '@nestjs/common';
import { GetCandlesDto } from './dto/get-candles.dto';

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class MarketService {
  private readonly aiEngineUrl = process.env.AI_ENGINE_URL ?? 'http://localhost:8000';

  async getCandles(dto: GetCandlesDto): Promise<Candle[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const params = new URLSearchParams({
      symbol: dto.symbol,
      asset_class: dto.assetClass,
      timeframe: dto.timeframe,
    });

    let res: Response;
    try {
      res = await fetch(`${this.aiEngineUrl}/v1/market/candles?${params.toString()}`, {
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

    return body as Candle[];
  }
}
