import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { AnalysisModule } from './analysis/analysis.module';
import { AssistantModule } from './assistant/assistant.module';
import { AuthModule } from './auth/auth.module';
import { BrokerModule } from './broker/broker.module';
import { MarketModule } from './market/market.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { PrismaModule } from './prisma/prisma.module';
import { SectorsModule } from './sectors/sectors.module';
import { StrategyModule } from './strategy/strategy.module';
import { ProfileModule } from './profile/profile.module';
import { RecommendationModule } from './recommendations/recommendation.module';
import { ReportsModule } from './reports/reports.module';
import { TelegramModule } from './telegram/telegram.module';

@Module({
  imports: [
    PrismaModule,
    AnalysisModule,
    BrokerModule,
    SectorsModule,
    MarketModule,
    AuthModule,
    PortfolioModule,
    AssistantModule,
    StrategyModule,
    ProfileModule,
    RecommendationModule,
    ReportsModule,
    TelegramModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, transform: true }),
    },
  ],
})
export class AppModule {}
