import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AttendanceLog,
  AttendanceLogDocument,
} from '../attendance/attendance.schema';
import { Leave, LeaveDocument } from '../leaves/leaves.schema';
import { WeekDay, Week, WeeklyHeatChart, DashboardResponse } from './dashboard.types';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(AttendanceLog.name)
    private attendanceModel: Model<AttendanceLogDocument>,
    @InjectModel(Leave.name) private leaveModel: Model<LeaveDocument>,
  ) {}

  async getDashboard(userId: string, month?: number): Promise<DashboardResponse> {
    const today = new Date().toISOString().split('T')[0];

    // Current status
    const todayAttendance = await this.attendanceModel.findOne({
      userId,
      date: today,
    });
    let currentStatus = 'Not clocked in';
    if (todayAttendance?.clockIn && !todayAttendance?.clockOut)
      currentStatus = 'Clocked In';
    else if (todayAttendance?.clockIn && todayAttendance?.clockOut)
      currentStatus = 'Clocked Out';

    // Latest leave request
    const latestLeave = await this.leaveModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(1);
    const leaveStatus = latestLeave.length
      ? latestLeave[0].status
      : 'No requests';

    // Daily shift (active work hours)
    const activeWorkMinutes = (todayAttendance?.workMinutes || 0) - (todayAttendance?.breakMinutes || 0);
    const dailyShift = activeWorkMinutes > 0
      ? this.minutesToHoursMinutes(activeWorkMinutes)
      : '0h 0m';

    // Week-based heat chart for specified month or current month
    const year = new Date().getFullYear();
    const targetMonth = month || new Date().getMonth() + 1;
    
    // Get attendance data for the month with some buffer days
    const firstDay = new Date(year, targetMonth - 1, 1);
    const lastDay = new Date(year, targetMonth, 0);
    
    // Get a wider range to include days from adjacent months that might show in the week grid
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - 7); // Go back a week
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + 7); // Go forward a week
    
    const monthAttendance = await this.attendanceModel.find({
      userId,
      date: {
        $gte: startDate.toISOString().split('T')[0],
        $lte: endDate.toISOString().split('T')[0],
      },
    });

    // Build weekly heat chart data
    const weeklyChart = this.buildWeeklyHeatChart(year, targetMonth, monthAttendance);

    return {
      currentStatus,
      leaveStatus,
      dailyShift,
      clockIn: todayAttendance?.clockIn || null,
      heatChart: weeklyChart,
      currentMonth: targetMonth,
      currentYear: year,
    };
  }

  private buildWeeklyHeatChart(year: number, month: number, attendanceData: any[]): WeeklyHeatChart {
    // Create a map of attendance by date with ACTIVE work hours (work - break time)
    const attendanceMap = new Map<string, number>();
    attendanceData.forEach((a) => {
      const activeMinutes = (a.workMinutes || 0) - (a.breakMinutes || 0);
      const activeHours = activeMinutes > 0 ? Math.round((activeMinutes / 60) * 10) / 10 : 0;
      attendanceMap.set(a.date, activeHours);
    });

    // Get first day of month
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);
    
    // Find the first Sunday on or before the first day of the month
    let weekStart = new Date(firstDayOfMonth);
    while (weekStart.getDay() !== 0) { // 0 is Sunday
      weekStart.setDate(weekStart.getDate() - 1);
    }

    const weeks: Week[] = [];
    let currentWeekStart = new Date(weekStart);

    // Generate EXACTLY 4 weeks for consistent layout
    for (let weekNumber = 1; weekNumber <= 4; weekNumber++) {
      const weekDays: WeekDay[] = [];

      // Generate exactly 7 days for each week (Sun-Sat)
      for (let dayNum = 0; dayNum < 7; dayNum++) {
        const currentDay = new Date(currentWeekStart);
        currentDay.setDate(currentWeekStart.getDate() + dayNum);
        
        // Check if this day belongs to our target month
        const isCurrentMonth = currentDay.getMonth() === month - 1;

        const dateStr = currentDay.toISOString().split('T')[0];
        const activeWorkHours = attendanceMap.get(dateStr) || 0;
        
        weekDays.push({
          date: dateStr,
          workHours: activeWorkHours, // This is now ACTIVE work hours
          isCurrentMonth: isCurrentMonth,
          dayOfMonth: currentDay.getDate(),
          dayOfWeek: dayNum, // 0=Sun, 1=Mon, ..., 6=Sat
        });
      }

      // Always add the week (exactly 4 weeks)
      weeks.push({
        weekNumber: weekNumber,
        days: weekDays,
      });

      // Move to next week
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return {
      month: month,
      year: year,
      weeks: weeks,
    };
  }

  private minutesToHoursMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }
}
