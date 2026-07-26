import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { AnalysisModule } from './analysis/analysis.module';
import { BrokerModule } from './broker/broker.module';
import { MarketModule } from './market/market.module';
import { SectorsModule } from './sectors/sectors.module';

@Module({
  imports: [AnalysisModule, BrokerModule, SectorsModule, MarketModule],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, transform: true }),
    },
  ],
})
export class AppModule {}
