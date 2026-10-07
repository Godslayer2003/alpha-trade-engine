import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsTimeZone,
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
  @MaxLength(2000)
  @IsOptional()
  investmentGoal?: string;

  @IsInt()
  @Min(0)
  @Max(50)
  @IsOptional()
  timeHorizonYears?: number;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  experienceLevel?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  firstName?: string;

  @IsString()
  @MaxLength(100)
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
  @MaxLength(254)
  @IsOptional()
  notificationEmail?: string;

  @IsBoolean()
  @IsOptional()
  dailyReportEnabled?: boolean;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'dailyReportTime must be in HH:mm 24-hour format' })
  @IsOptional()
  dailyReportTime?: string;

  @IsTimeZone()
  @MaxLength(100)
  @IsOptional()
  dailyReportTimezone?: string;

  @IsArray()
  @ArrayMaxSize(2)
  @IsIn([NotificationChannel.TELEGRAM, NotificationChannel.EMAIL], { each: true })
  @IsOptional()
  dailyReportChannels?: NotificationChannel[];
}
