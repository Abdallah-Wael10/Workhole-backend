import { IsEnum, IsOptional } from 'class-validator';

export class ClockInDto {
  @IsEnum(['office', 'home'])
  @IsOptional()
  location?: 'office' | 'home' = 'office';
}
