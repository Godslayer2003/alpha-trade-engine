import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class RunWorkflowDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9.^=/-]+$/, { message: 'symbol contains unsupported characters.' })
  symbol?: string;
}
