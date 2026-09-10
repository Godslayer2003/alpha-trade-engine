import { Module } from '@nestjs/common';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { AssistantModule } from '../assistant/assistant.module';
import { PaymentsModule } from '../payments/payments.module';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';

@Module({
  imports: [PortfolioModule, AnalysisModule, AssistantModule, PaymentsModule],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
