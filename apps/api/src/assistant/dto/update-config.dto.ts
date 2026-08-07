import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateConfigDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  knowledgeBase?: string;
}
