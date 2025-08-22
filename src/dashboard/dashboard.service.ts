import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AttendanceLog,
  AttendanceLogDocument,
} from '../attendance/attendance.schema';
import { Leave, LeaveDocument } from '../leaves/leaves.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(AttendanceLog.name)
    private attendanceModel: Model<AttendanceLogDocument>,
    @InjectModel(Leave.name) private leaveModel: Model<LeaveDocument>,
  ) {}

  async getDashboard(userId: string) {
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

    // Daily shift
    const dailyShift = todayAttendance?.workMinutes
      ? this.minutesToHoursMinutes(todayAttendance.workMinutes)
      : '0h 0m';

    // Work hours heat chart (12 months, every day)
    const year = new Date().getFullYear();
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year}-12-31`);
    const allAttendance = await this.attendanceModel.find({
      userId,
      date: {
        $gte: start.toISOString().split('T')[0],
        $lte: end.toISOString().split('T')[0],
      },
    });

    // Build heat chart data
    const chart: { [month: string]: number[] } = {};
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      chart[m + 1] = Array(daysInMonth).fill(0);
    }
    allAttendance.forEach((a) => {
      const [y, m, d] = a.date.split('-').map(Number);
      if (y === year)
        chart[m][d - 1] = Math.round(((a.workMinutes || 0) / 60) * 10) / 10;
    });

    // Flatten chart for frontend (array of months, each month is array of days)
    const heatChart = Object.entries(chart).map(([month, days]) => ({
      month: Number(month),
      days,
    }));

    return {
      currentStatus,
      leaveStatus,
      dailyShift,
      heatChart, // [{ month: 1, days: [...] }, ...]
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
