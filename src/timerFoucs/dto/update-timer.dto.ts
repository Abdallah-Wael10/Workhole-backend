import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CompleteTimerDto {
  @IsString()
  @IsOptional()
  note?: string; // Note when completing timer
}

export class UpdateTimerDto {
  @IsEnum(['cancelled'])
  @IsOptional()
  status?: 'cancelled';

  @IsString()
  @IsOptional()
  note?: string;
}
 