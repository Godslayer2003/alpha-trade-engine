import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { InvestmentStyle } from '@alpha-trade/shared-types';

export class CreateStrategyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsEnum(InvestmentStyle)
  style!: InvestmentStyle;

  @IsArray()
  @ArrayMaxSize(50)
  @MinLength(1, { each: true })
  @MaxLength(64, { each: true })
  @IsString({ each: true })
  @IsOptional()
  preferredTickers?: string[];

  @IsNumber()
  @Min(0.001)
  @Max(1)
  @IsOptional()
  maxRiskPerTrade?: number;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string;
}
