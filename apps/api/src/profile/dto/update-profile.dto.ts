import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { RiskTolerance } from '@alpha-trade/shared-types';

export class UpdateProfileDto {
  @IsEnum(RiskTolerance)
  @IsOptional()
  riskTolerance?: RiskTolerance;

  @IsNumber()
  @Min(0)
  @IsOptional()
  capitalBase?: number;

  @IsString()
  @IsOptional()
  investmentGoal?: string;

  @IsInt()
  @Min(0)
  @Max(50)
  @IsOptional()
  timeHorizonYears?: number;

  @IsString()
  @IsOptional()
  experienceLevel?: string;
}
