import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class ClockInDto {
  @IsEnum(['office', 'home'])
  @IsOptional()
  location?: 'office' | 'home' = 'office';

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  @IsOptional()
  localTime?: string;
}
