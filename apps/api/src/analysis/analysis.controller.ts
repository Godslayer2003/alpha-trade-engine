import { Controller, Post, Body } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { GetSignalDto } from './dto/get-signal.dto';

@Controller('api/v1/analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('signal')
  async getSignal(@Body() dto: GetSignalDto) {
    return this.analysisService.getTradeSignal(dto);
  }
}
