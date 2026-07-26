import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { InvestmentStyle, Sector } from '@alpha-trade/shared-types';
import { SectorsService } from './sectors.service';

@Controller('api/v1/sectors')
export class SectorsController {
  constructor(private readonly sectorsService: SectorsService) {}

  @Get()
  list() {
    return this.sectorsService.listSectors();
  }

  @Get('recommend')
  recommend(@Query('sector') sector: string, @Query('style') style?: string) {
    if (!Object.values(Sector).includes(sector as Sector)) {
      throw new BadRequestException(
        `Invalid sector. Expected one of: ${Object.values(Sector).join(', ')}`,
      );
    }
    if (style && !Object.values(InvestmentStyle).includes(style as InvestmentStyle)) {
      throw new BadRequestException(
        `Invalid style. Expected one of: ${Object.values(InvestmentStyle).join(', ')}`,
      );
    }
    return this.sectorsService.recommend(sector as Sector, style as InvestmentStyle | undefined);
  }
}
