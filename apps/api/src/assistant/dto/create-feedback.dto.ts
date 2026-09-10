import { IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4_000)
  question!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8_000)
  answer!: string;

  @IsIn(['UP', 'DOWN'])
  rating!: 'UP' | 'DOWN';

  @IsString()
  @MaxLength(100)
  model!: string;

  @IsInt()
  @Min(0)
  @Max(300_000)
  responseTimeMs!: number;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  inputTokens!: number;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  outputTokens!: number;
}
