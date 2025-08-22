import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class CreateTimerDto {
  @IsString()
  @IsNotEmpty()
  tag: string; // Task name like "Reading emails", "Coding API", etc.

  @IsNumber()
  @Min(1)
  @Max(240) // Max 4 hours
  duration: number; // Duration in minutes

  @IsString()
  @IsOptional()
  note?: string; // Optional initial note
}
