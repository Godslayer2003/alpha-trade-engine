import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { GetReportDto } from './dto/get-report.dto';
import { AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator';
import { SecurityQuotaService } from '../auth/security-quota.service';
import { AiEligibilityService } from '../auth/ai-eligibility.service';

@Controller('api/v1/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService, private readonly quota: SecurityQuotaService,
    private readonly eligibility: AiEligibilityService) {}

  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @UseGuards(JwtAuthGuard)
  async getReport(@Query() dto: GetReportDto, @CurrentUser() user: AuthenticatedUser) {
    await this.eligibility.require(user.userId);
    await this.quota.consume('reports-user', user.userId, 50, 86_400_000);
    return this.reportsService.getOrGenerate(dto);
  }
}
