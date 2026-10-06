import { Equals, IsOptional, IsString, MaxLength } from 'class-validator';
export class AccountConfirmationDto {
  @IsString()
  @MaxLength(128)
  password!: string;
  @IsOptional()
  @IsString()
  @MaxLength(32)
  otp?: string;
}
export class DeleteAccountDto extends AccountConfirmationDto {
  @Equals('DELETE')
  confirmation!: string;
}
