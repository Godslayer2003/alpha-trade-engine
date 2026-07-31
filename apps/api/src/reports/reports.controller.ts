import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { GetReportDto } from './dto/get-report.dto';

@Controller('api/v1/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  getReport(@Query() dto: GetReportDto) {
    return this.reportsService.getOrGenerate(dto);
  }
}
