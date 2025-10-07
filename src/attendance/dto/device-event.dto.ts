import { IsString, IsIn, IsOptional, IsNumber, IsObject, IsBoolean } from 'class-validator';

export class DeviceEventDto {
  @IsOptional()
  @IsString()
  employeeId?: string; // Preferred

  @IsOptional()
  @IsString()
  email?: string; // Alternative identifier

  @IsOptional()
  @IsString()
  faceName?: string; // Fallback label from Python

  @IsString()
  @IsIn(['CLOCK_IN', 'CLOCK_OUT'])
  eventType!: 'CLOCK_IN' | 'CLOCK_OUT';

  @IsString()
  timestamp!: string; // ISO string

  @IsString()
  cameraId!: string;

  @IsOptional()
  @IsNumber()
  confidence?: number;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @IsOptional()
  @IsString()
  image?: string; // base64 JPEG
}


