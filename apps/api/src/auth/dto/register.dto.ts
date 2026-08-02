import { Equals, IsEmail, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;

  @Equals(true, { message: 'You must accept the disclaimer & terms to create an account.' })
  acceptedTerms!: boolean;
}
