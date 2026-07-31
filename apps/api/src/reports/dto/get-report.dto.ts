import { IsEnum, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AssetClass } from '@alpha-trade/shared-types';

export class GetReportDto {
  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsEnum(AssetClass)
  assetClass!: AssetClass;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  months!: number;
}
