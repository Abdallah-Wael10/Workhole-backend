import { IsString, IsOptional, IsArray, ArrayUnique } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  // === NEW FIELD ===
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsOptional()
  holidays?: string[];
}
