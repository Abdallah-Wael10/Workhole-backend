import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('/api/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('clock-in')
  async clockIn(@Body() dto: ClockInDto, @Request() req) {
    return this.attendanceService.clockIn(req.user.id, dto.location);
  }

  @Post('clock-out')
  async clockOut(@Body() dto: ClockOutDto, @Request() req) {
    return this.attendanceService.clockOut(req.user.id);
  }

  @Get('me')
  async getDashboard(@Request() req) {
    return this.attendanceService.getDashboard(req.user.id);
  }

  @Get('stats')
  async getStats(@Request() req) {
    return this.attendanceService.getStats(req.user.id);
  }

  // Admin: View all users attendance
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('all')
  async getAllUsersAttendance() {
    return this.attendanceService.getAllUsersAttendance();
  }
}
