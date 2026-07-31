import { Module } from '@nestjs/common';
import { ProfileModule } from '../profile/profile.module';
import { SectorsModule } from '../sectors/sectors.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';

@Module({
  imports: [ProfileModule, SectorsModule, AnalysisModule],
  controllers: [RecommendationController],
  providers: [RecommendationService],
})
export class RecommendationModule {}
