import { Controller, Get } from '@nestjs/common';
import { MoversService } from './movers.service';

@Controller('api/v1/movers')
export class MoversController {
  constructor(private readonly moversService: MoversService) {}

  @Get()
  async getMovers() {
    return this.moversService.getOrScan();
  }
}
