import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';
export class RecoveryRequestDto {
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  email!: string;
}
export class AccountTokenDto {
  @IsString()
  @Length(64, 64)
  token!: string;
}
export class ResetPasswordDto extends AccountTokenDto {
  @IsString()
  @MinLength(12)
  @MaxLength(72)
  password!: string;
}
