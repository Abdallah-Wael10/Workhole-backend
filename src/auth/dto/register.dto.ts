import { Transform } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(['admin', 'employee'])
  role: 'admin' | 'employee';

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  shiftHours: number;

  @IsString()
  @IsOptional()
  shiftStartLocal?: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @IsOptional()
  salary?: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @IsOptional()
  availableLeaves?: number;

  @IsString()
  @IsOptional()
  profileImage?: string;

  @IsString()
  @IsOptional()
  locale?: string;
}
