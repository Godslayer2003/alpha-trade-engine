import { Controller, Get, Query } from '@nestjs/common';
import { MarketService } from './market.service';
import { GetCandlesDto } from './dto/get-candles.dto';

@Controller('api/v1/market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('candles')
  async getCandles(@Query() dto: GetCandlesDto) {
    return this.marketService.getCandles(dto);
  }
}
