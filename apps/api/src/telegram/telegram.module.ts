import { Module } from '@nestjs/common';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { AssistantModule } from '../assistant/assistant.module';
import { PaymentsModule } from '../payments/payments.module';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PortfolioModule, AnalysisModule, AssistantModule, PaymentsModule, AuthModule],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
