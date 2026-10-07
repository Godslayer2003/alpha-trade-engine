import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(72)
  newPassword!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  otp?: string;
}
