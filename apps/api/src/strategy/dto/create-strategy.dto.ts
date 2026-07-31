import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { InvestmentStyle } from '@alpha-trade/shared-types';

export class CreateStrategyDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(InvestmentStyle)
  style!: InvestmentStyle;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredTickers?: string[];

  @IsNumber()
  @Min(0.001)
  @Max(1)
  @IsOptional()
  maxRiskPerTrade?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
