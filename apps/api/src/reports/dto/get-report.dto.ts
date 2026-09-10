import { IsEnum, IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AssetClass } from '@alpha-trade/shared-types';

export class GetReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  symbol!: string;

  @IsEnum(AssetClass)
  assetClass!: AssetClass;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  months!: number;
}
