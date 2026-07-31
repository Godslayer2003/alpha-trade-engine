import { Module } from '@nestjs/common';
import { MarketModule } from '../market/market.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [MarketModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
