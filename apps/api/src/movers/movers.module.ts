import { Module } from '@nestjs/common';
import { MarketModule } from '../market/market.module';
import { MoversController } from './movers.controller';
import { MoversService } from './movers.service';

@Module({
  imports: [MarketModule],
  controllers: [MoversController],
  providers: [MoversService],
})
export class MoversModule {}
