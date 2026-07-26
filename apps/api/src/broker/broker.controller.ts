import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { InvestmentStyle } from '@alpha-trade/shared-types';
import { BrokerService } from './broker.service';

@Controller('api/v1/broker')
export class BrokerController {
  constructor(private readonly brokerService: BrokerService) {}

  @Get('recommend')
  recommend(@Query('style') style: string) {
    if (!Object.values(InvestmentStyle).includes(style as InvestmentStyle)) {
      throw new BadRequestException(
        `Invalid style. Expected one of: ${Object.values(InvestmentStyle).join(', ')}`,
      );
    }
    return this.brokerService.recommendBrokers(style as InvestmentStyle);
  }
}
