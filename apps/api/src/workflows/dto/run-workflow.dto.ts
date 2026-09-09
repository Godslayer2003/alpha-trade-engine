import { IsOptional, IsString, Matches } from 'class-validator';

export class RunWorkflowDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9.^=/-]+$/, { message: 'symbol contains unsupported characters.' })
  symbol?: string;
}
