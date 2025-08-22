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

  @IsNumber()
  @Min(0)
  shiftHours: number;

  @IsString()
  @IsOptional()
  shiftStartLocal?: string;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  salary?: number;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(['active', 'suspended'])
  @IsOptional()
  status?: 'active' | 'suspended';

  // New fields
  @IsNumber()
  @Min(0)
  @IsOptional()
  availableLeaves?: number;

  @IsString()
  @IsOptional()
  profileImage?: string;
}
