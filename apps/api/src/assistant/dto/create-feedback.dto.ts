import { IsIn, IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  @MinLength(1)
  question!: string;

  @IsString()
  @MinLength(1)
  answer!: string;

  @IsIn(['UP', 'DOWN'])
  rating!: 'UP' | 'DOWN';

  @IsString()
  model!: string;

  @IsInt()
  @Min(0)
  responseTimeMs!: number;

  @IsInt()
  @Min(0)
  inputTokens!: number;

  @IsInt()
  @Min(0)
  outputTokens!: number;
}
