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

export interface Quote {
  symbol: string;
  price: number;
  asOf: string;
  dataSource: string;
}

const REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class MarketService {
  private readonly aiEngineUrl = process.env.AI_ENGINE_URL ?? 'http://localhost:8000';

  async getCandles(dto: GetCandlesDto): Promise<Candle[]> {
    return this.fetchJson<Candle[]>('/v1/market/candles', {
      symbol: dto.symbol,
      asset_class: dto.assetClass,
      timeframe: dto.timeframe,
    });
  }

  async getQuote(symbol: string, assetClass: string): Promise<Quote> {
    const body = await this.fetchJson<{
      symbol: string;
      price: number;
      as_of: string;
      data_source: string;
    }>('/v1/market/quote', { symbol, asset_class: assetClass, timeframe: '1D' });

    return {
      symbol: body.symbol,
      price: body.price,
      asOf: body.as_of,
      dataSource: body.data_source,
    };
  }

  private async fetchJson<T>(path: string, params: Record<string, string>): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${this.aiEngineUrl}${path}?${new URLSearchParams(params)}`, {
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

    return body as T;
  }
}
