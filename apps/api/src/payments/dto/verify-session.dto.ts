import { IsString, Matches, MaxLength } from 'class-validator';

export class VerifySessionDto {
  @IsString()
  @MaxLength(200)
  @Matches(/^cs_(?:test|live)_[a-zA-Z0-9]+$/)
  session_id!: string;
}
