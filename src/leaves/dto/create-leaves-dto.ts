import { IsString, IsNotEmpty, IsEnum, IsDateString } from 'class-validator';

export class CreateLeaveDto {
  @IsEnum(['Annual Leave', 'Sick Leave', 'Emergency Leave', 'Unpaid Leave'])
  leaveType: 'Annual Leave' | 'Sick Leave' | 'Emergency Leave' | 'Unpaid Leave';

  @IsDateString()
  startDate: string; // "YYYY-MM-DD"

  @IsDateString()
  endDate: string; // "YYYY-MM-DD"

  @IsString()
  @IsNotEmpty()
  reason: string;
}
