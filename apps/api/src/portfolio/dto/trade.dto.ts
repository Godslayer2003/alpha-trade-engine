import { IsEnum, IsIn, IsNotEmpty, IsNumber, IsPositive, IsString, Max, MaxLength } from 'class-validator';
import { AssetClass } from '@alpha-trade/shared-types';

export class TradeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  symbol!: string;

  @IsEnum(AssetClass)
  assetClass!: AssetClass;

  @IsIn(['BUY', 'SELL'])
  side!: 'BUY' | 'SELL';

  @IsNumber()
  @IsPositive()
  @Max(1_000_000)
  quantity!: number;
}
