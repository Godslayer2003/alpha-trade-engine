import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Gender, NotificationChannel, RiskTolerance } from '@alpha-trade/shared-types';

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

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  age?: number;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  // A base64 data URL, capped client-side — validated for size at the
  // controller rather than via a decorator (class-validator string length
  // checks would run before this even parses).
  @IsString()
  @IsOptional()
  profilePictureUrl?: string;

  @IsEmail()
  @IsOptional()
  notificationEmail?: string;

  @IsBoolean()
  @IsOptional()
  dailyReportEnabled?: boolean;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'dailyReportTime must be in HH:mm 24-hour format' })
  @IsOptional()
  dailyReportTime?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  dailyReportTimezone?: string;

  @IsArray()
  @IsIn([NotificationChannel.TELEGRAM, NotificationChannel.EMAIL], { each: true })
  @IsOptional()
  dailyReportChannels?: NotificationChannel[];
}
