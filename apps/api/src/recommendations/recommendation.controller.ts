import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { RecommendationService } from './recommendation.service';

@Controller('api/v1/recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.recommendationService.list(user.userId);
  }

  @Post('generate')
  generate(@CurrentUser() user: AuthenticatedUser) {
    return this.recommendationService.generate(user.userId);
  }
}
