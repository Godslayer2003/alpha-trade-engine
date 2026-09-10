import { Injectable } from '@nestjs/common';
import { AiEngineClient } from '../ai-engine/ai-engine-client.service';
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

@Injectable()
export class MarketService {
  constructor(private readonly aiEngine: AiEngineClient) {}

  async getCandles(dto: GetCandlesDto): Promise<Candle[]> {
    return this.aiEngine.get<Candle[]>('/v1/market/candles', {
      symbol: dto.symbol,
      asset_class: dto.assetClass,
      timeframe: dto.timeframe,
    });
  }

  async getQuote(symbol: string, assetClass: string): Promise<Quote> {
    const body = await this.aiEngine.get<{
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
}
