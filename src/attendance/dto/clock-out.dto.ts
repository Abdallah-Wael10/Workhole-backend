import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ClockOutDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  @IsOptional()
  localTime?: string;
}
