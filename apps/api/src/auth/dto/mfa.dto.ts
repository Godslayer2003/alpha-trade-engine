import { IsString, Matches, MaxLength } from 'class-validator';
export class MfaSetupDto {
  @IsString()
  @MaxLength(128)
  password!: string;
}
export class MfaConfirmDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
