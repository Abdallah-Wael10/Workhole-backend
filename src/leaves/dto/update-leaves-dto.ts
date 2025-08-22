import { PartialType } from '@nestjs/mapped-types';
import { CreateLeaveDto } from './create-leaves-dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateLeaveDto extends PartialType(CreateLeaveDto) {}

export class AdminActionDto {
  @IsEnum(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @IsString()
  @IsOptional()
  actionNote?: string;
}
