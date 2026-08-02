import { Module } from '@nestjs/common';
import { MarketModule } from '../market/market.module';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { StopLossService } from './stop-loss.service';

@Module({
  imports: [MarketModule],
  controllers: [PortfolioController],
  providers: [PortfolioService, StopLossService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
