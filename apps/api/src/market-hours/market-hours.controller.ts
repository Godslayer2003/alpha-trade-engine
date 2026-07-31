import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { MarketCountry } from '@alpha-trade/shared-types';
import { MarketHoursService } from './market-hours.service';

@Controller('api/v1/market-hours')
export class MarketHoursController {
  constructor(private readonly marketHoursService: MarketHoursService) {}

  @Get()
  list(@Query('countries') countries?: string) {
    if (!countries) return this.marketHoursService.list();

    const requested = countries.split(',').map((c) => c.trim().toUpperCase());
    for (const c of requested) {
      if (!Object.values(MarketCountry).includes(c as MarketCountry)) {
        throw new BadRequestException(
          `Invalid country "${c}". Expected one of: ${Object.values(MarketCountry).join(', ')}`,
        );
      }
    }
    return this.marketHoursService.list(requested as MarketCountry[]);
  }
}
