import { IsEnum, IsIn, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';
import { AssetClass } from '@alpha-trade/shared-types';

export class TradeDto {
  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsEnum(AssetClass)
  assetClass!: AssetClass;

  @IsIn(['BUY', 'SELL'])
  side!: 'BUY' | 'SELL';

  @IsNumber()
  @IsPositive()
  quantity!: number;
}
