import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { PortfolioService } from './portfolio.service';
import { TradeDto } from './dto/trade.dto';
import { SetStopLossDto } from './dto/set-stop-loss.dto';

@Controller('api/v1/portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  getPortfolio(@CurrentUser() user: AuthenticatedUser) {
    return this.portfolioService.getPortfolio(user.userId);
  }

  @Get('trades')
  getTrades(@CurrentUser() user: AuthenticatedUser) {
    return this.portfolioService.getTrades(user.userId);
  }

  @Get('performance')
  getPerformance(@CurrentUser() user: AuthenticatedUser) {
    return this.portfolioService.getPerformance(user.userId);
  }

  @Post('reset')
  resetPortfolio(@CurrentUser() user: AuthenticatedUser) {
    return this.portfolioService.resetPortfolio(user.userId);
  }

  @Post('trade')
  executeTrade(@CurrentUser() user: AuthenticatedUser, @Body() dto: TradeDto) {
    return this.portfolioService.executeTrade(user.userId, dto);
  }

  @Patch('holdings/:holdingId/stop-loss')
  setStopLoss(
    @CurrentUser() user: AuthenticatedUser,
    @Param('holdingId') holdingId: string,
    @Body() dto: SetStopLossDto,
  ) {
    return this.portfolioService.setStopLoss(user.userId, holdingId, dto.stopLossPrice ?? null);
  }
}
