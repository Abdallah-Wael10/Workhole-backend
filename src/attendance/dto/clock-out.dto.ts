import { IsNumber } from 'class-validator';

export class ClockOutDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}
