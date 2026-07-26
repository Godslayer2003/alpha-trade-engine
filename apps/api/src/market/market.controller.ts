import { Controller, Get, Query } from '@nestjs/common';
import { MarketService } from './market.service';
import { GetCandlesDto } from './dto/get-candles.dto';
import { GetQuoteDto } from './dto/get-quote.dto';

@Controller('api/v1/market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('candles')
  async getCandles(@Query() dto: GetCandlesDto) {
    return this.marketService.getCandles(dto);
  }

  @Get('quote')
  async getQuote(@Query() dto: GetQuoteDto) {
    return this.marketService.getQuote(dto.symbol, dto.assetClass);
  }
}
