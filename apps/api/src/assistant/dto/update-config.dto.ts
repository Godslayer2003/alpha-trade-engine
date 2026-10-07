import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateConfigDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(25000)
  knowledgeBase?: string;
}
