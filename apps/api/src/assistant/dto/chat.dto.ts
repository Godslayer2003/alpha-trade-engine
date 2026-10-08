import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ChatContextDto {
  @IsOptional() @IsString() @MaxLength(64) symbol?: string;
  @IsOptional() @IsIn(['EQUITY', 'CRYPTO', 'COMMODITY']) assetClass?: string;
  @IsOptional() @IsString() @MaxLength(10) timeframe?: string;
}

export class ChatMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MaxLength(4_000)
  content!: string;
}

export class ChatRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ChatContextDto)
  context?: ChatContextDto;

  @IsOptional()
  @IsIn(['gemini', 'openai'])
  model?: string;
}
