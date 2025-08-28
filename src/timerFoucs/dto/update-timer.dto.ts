import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CompleteTimerDto {
  @IsString()
  @IsOptional()
  note?: string; // Note when completing timer
}

export class UpdateTimerDto {
  @IsEnum(['completed', 'cancelled', 'paused', 'running'])
  status?: 'completed' | 'cancelled' | 'paused' | 'running';

  @IsString()
  @IsOptional()
  note?: string;
}
