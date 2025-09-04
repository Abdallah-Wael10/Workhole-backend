import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  UseGuards,
  Query,
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
    return this.attendanceService.clockIn(
      req.user.id, 
      dto.latitude, 
      dto.longitude, 
      dto.timezone
    );
  }

  @Post('clock-out')
  async clockOut(@Body() dto: ClockOutDto, @Request() req) {
    return this.attendanceService.clockOut(
      req.user.id, 
      dto.latitude, 
      dto.longitude, 
      dto.timezone
    );
  }

  @Get('me')
  async getDashboard(@Request() req, @Query('filter') filter: 'week' | 'month' = 'week', @Query('timezone') timezone: string = 'UTC') {
    return this.attendanceService.getDashboard(req.user.id, filter, timezone);
  }

  @Get('stats')
  async getStats(@Request() req, @Body() body, @Query('page') page = 1, @Query('limit') limit = 8) {
    return this.attendanceService.getStats(req.user.id, Number(page), Number(limit));
  }

  // Admin: View all users attendance
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('all')
  async getAllUsersAttendance(@Query('range') range: string = 'today') {
    return this.attendanceService.getAllUsersAttendance(range);
  }

  // Admin: Set office location
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post('set-office-location')
  async setOfficeLocation(@Body() body: { latitude: number; longitude: number; name: string; address?: string; radius?: number }) {
    return this.attendanceService.setOfficeLocation(body.latitude, body.longitude, body.name, body.address, body.radius);
  }
}