import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { AssetClass } from '@alpha-trade/shared-types';

export class GetCandlesDto {
  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsEnum(AssetClass)
  assetClass!: AssetClass;

  @IsString()
  @IsNotEmpty()
  timeframe!: string;
}
