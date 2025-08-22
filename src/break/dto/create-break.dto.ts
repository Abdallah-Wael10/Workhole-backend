import { IsString, IsNotEmpty, IsNumber, IsBoolean } from 'class-validator';

export class CreateBreakDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  duration: number;

  @IsBoolean()
  isActive: boolean;
}
