import { Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AnalysisModule } from './analysis/analysis.module';
import { AssistantModule } from './assistant/assistant.module';
import { AuthModule } from './auth/auth.module';
import { BrokerModule } from './broker/broker.module';
import { MarketModule } from './market/market.module';
import { MarketHoursModule } from './market-hours/market-hours.module';
import { MoversModule } from './movers/movers.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { PrismaModule } from './prisma/prisma.module';
import { SectorsModule } from './sectors/sectors.module';
import { StrategyModule } from './strategy/strategy.module';
import { ProfileModule } from './profile/profile.module';
import { RecommendationModule } from './recommendations/recommendation.module';
import { ReportsModule } from './reports/reports.module';
import { TelegramModule } from './telegram/telegram.module';
import { EmailModule } from './email/email.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WorkflowsModule } from './workflows/workflows.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // Generous global default — this only exists to stop brute-force/cost
    // abuse (login, register, the LLM-backed chat endpoint), not to
    // throttle normal dashboard usage.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AnalysisModule,
    BrokerModule,
    SectorsModule,
    MarketModule,
    MarketHoursModule,
    MoversModule,
    AuthModule,
    PortfolioModule,
    AssistantModule,
    StrategyModule,
    ProfileModule,
    RecommendationModule,
    ReportsModule,
    TelegramModule,
    EmailModule,
    NotificationsModule,
    WorkflowsModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, transform: true }),
    },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
