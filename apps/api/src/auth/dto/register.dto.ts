import { Transform } from 'class-transformer';
import { Equals, IsEmail, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  email!: string;

  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @Equals(true, { message: 'You must accept the disclaimer & terms to create an account.' })
  acceptedTerms!: boolean;
}
