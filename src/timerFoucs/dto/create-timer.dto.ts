import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

export class CreateTimerDto {
  @IsString()
  @IsNotEmpty()
  tag: string;

  @IsNumber()
  @Min(1)
  @Max(240)
  duration: number;
}
