import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AssetClass, Timeframe } from '@alpha-trade/shared-types';

export class GetSignalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  symbol!: string;

  @IsEnum(AssetClass)
  assetClass!: AssetClass;

  @IsEnum(Timeframe)
  timeframe!: string;
}
