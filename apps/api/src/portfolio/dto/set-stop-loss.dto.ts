import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class SetStopLossDto {
  // null clears the stop-loss; omit entirely also clears it.
  @IsOptional()
  @IsNumber()
  @IsPositive()
  stopLossPrice?: number | null;
}
