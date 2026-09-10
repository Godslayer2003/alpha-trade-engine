import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AssetClass } from '@alpha-trade/shared-types';

export class GetQuoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  symbol!: string;

  @IsEnum(AssetClass)
  assetClass!: AssetClass;
}
