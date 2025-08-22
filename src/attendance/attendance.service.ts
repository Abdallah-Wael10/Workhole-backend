import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AttendanceLog, AttendanceLogDocument } from './attendance.schema';
import { User, UserDocument } from '../users/users.schema';
import { UserBreak, UserBreakDocument } from '../break/break.schema';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(AttendanceLog.name)
    private attendanceModel: Model<AttendanceLogDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserBreak.name)
    private userBreakModel: Model<UserBreakDocument>,
  ) {}

  async clockIn(userId: string, location: 'office' | 'home' = 'office') {
    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const now = new Date();
    const clockInTime = now.toTimeString().slice(0, 5); // "HH:mm"
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });

    // Check if already clocked in today
    const existing = await this.attendanceModel.findOne({
      userId,
      date: today,
    });
    if (existing && existing.clockIn) {
      throw new Error('Already clocked in today');
    }

    // Get user shift info
    const user = await this.userModel.findById(userId);
    const shiftStart = user?.shiftStartLocal || '09:00';
    const isLate = clockInTime > shiftStart;

    const attendance = await this.attendanceModel.findOneAndUpdate(
      { userId, date: today },
      {
        userId,
        date: today,
        dayName,
        clockIn: clockInTime,
        location,
        status: isLate ? 'late' : 'present',
      },
      { upsert: true, new: true },
    );

    return attendance;
  }

  async clockOut(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const clockOutTime = new Date().toTimeString().slice(0, 5); // "HH:mm"

    const attendance = await this.attendanceModel.findOne({
      userId,
      date: today,
    });
    if (!attendance || !attendance.clockIn) {
      throw new Error('Must clock in first');
    }
    if (attendance.clockOut) {
      throw new Error('Already clocked out today');
    }

    // Calculate work minutes
    const clockInMinutes = this.timeToMinutes(attendance.clockIn);
    const clockOutMinutes = this.timeToMinutes(clockOutTime);
    const workMinutes = clockOutMinutes - clockInMinutes;

    // Get user shift hours
    const user = await this.userModel.findById(userId);
    const shiftHours = user?.shiftHours || 8;
    const expectedMinutes = shiftHours * 60;
    const isOvertime = workMinutes > expectedMinutes;

    attendance.clockOut = clockOutTime;
    attendance.workMinutes = workMinutes;
    attendance.isOvertime = isOvertime;
    await attendance.save();

    return attendance;
  }

  async getDashboard(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const user = await this.userModel.findById(userId);
    const shiftHours = user?.shiftHours || 8;
    const shiftMinutes = shiftHours * 60;

    // Today's attendance
    const todayAttendance = await this.attendanceModel.findOne({
      userId,
      date: today,
    });

    // This week's work (last 7 days)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const weekAttendance = await this.attendanceModel.find({
      userId,
      date: { $gte: weekStartStr },
      clockOut: { $ne: null },
    });

    const thisWeekMinutes = weekAttendance.reduce(
      (sum, a) => sum + a.workMinutes,
      0,
    );

    // Today's breaks
    const todayBreaks = await this.userBreakModel.find({
      userId,
      startTime: {
        $gte: new Date(today + 'T00:00:00'),
        $lt: new Date(today + 'T23:59:59'),
      },
      endTime: { $ne: null },
    });
    const todayBreakMinutes = todayBreaks.reduce(
      (sum, b) => sum + b.duration,
      0,
    );

    // This month's overtime
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    const monthAttendance = await this.attendanceModel.find({
      userId,
      date: { $gte: monthStartStr },
      isOvertime: true,
    });
    const totalOvertimeMinutes = monthAttendance.reduce(
      (sum, a) => sum + Math.max(0, a.workMinutes - shiftMinutes),
      0,
    );

    // Current status
    const isClockedIn = todayAttendance?.clockIn && !todayAttendance?.clockOut;

    // Today's work minutes
    const todayWorkMinutes = todayAttendance?.workMinutes || 0;

    // Active work time (today's work - breaks)
    const activeWorkMinutes = Math.max(0, todayWorkMinutes - todayBreakMinutes);

    // Today's progress percentage
    const todayProgress = Math.min(
      100,
      (todayWorkMinutes / shiftMinutes) * 100,
    );

    // Efficiency percentage (active work time / shift time)
    const efficiency = Math.min(100, (activeWorkMinutes / shiftMinutes) * 100);

    // Completed shift percentage
    const completedShift = Math.min(
      100,
      (todayWorkMinutes / shiftMinutes) * 100,
    );

    // Remaining minutes
    const remainingMinutes = Math.max(0, shiftMinutes - todayWorkMinutes);

    // Most productive day (this week)
    const mostProductiveDay = weekAttendance.reduce(
      (max: AttendanceLogDocument | null, curr: AttendanceLogDocument) =>
        curr.workMinutes > (max?.workMinutes || 0) ? curr : max,
      null,
    );

    // Work hours chart (last 7 days)
    const chartData: { date: string; day: string; hours: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayAttendance = weekAttendance.find((a) => a.date === dateStr);
      chartData.push({
        date: dateStr,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        hours: dayAttendance
          ? Math.round((dayAttendance.workMinutes / 60) * 10) / 10
          : 0,
      });
    }

    return {
      dailyShift: `${this.minutesToHoursMinutes(todayWorkMinutes)}`, // "1h 30m
      thisWeek: this.minutesToHoursMinutes(thisWeekMinutes), // "15h 30m"
      breaksTaken: this.minutesToHoursMinutes(todayBreakMinutes), // "22m" (time not count)
      breaksCount: todayBreaks.length, // Number of breaks taken
      totalOvertime: this.minutesToHoursMinutes(totalOvertimeMinutes), // "2h 30m"
      currentStatus: isClockedIn ? 'Clocked In' : 'Clocked Out',
      activeWorkTime: this.minutesToHoursMinutes(activeWorkMinutes), // "1h 8m" (work - breaks)
      todayProgress: `${this.minutesToHoursMinutes(todayWorkMinutes)} / ${shiftHours}h`, // "1h 30m / 8h"
      efficiency: Math.round(efficiency), // 85% (active work / shift)
      completedShift: Math.round(completedShift), // 25% (completed percentage)
      remainingTime: this.minutesToHoursMinutes(remainingMinutes), // "6h 30m"
      mostProductiveDay: mostProductiveDay
        ? {
            day: mostProductiveDay.dayName,
            time: this.minutesToHoursMinutes(mostProductiveDay.workMinutes),
          }
        : null,
      workHoursChart: chartData,
    };
  }

  async getStats(userId: string) {
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    const monthAttendance = await this.attendanceModel.find({
      userId,
      date: { $gte: monthStartStr },
    });

    const totalDaysPresent = monthAttendance.filter(
      (a) => a.status === 'present' || a.status === 'late',
    ).length;
    const totalDaysAbsent = monthAttendance.filter(
      (a) => a.status === 'absent',
    ).length;
    const lateArrivals = monthAttendance.filter(
      (a) => a.status === 'late',
    ).length;

    // Average clock-in time
    const clockIns = monthAttendance
      .filter((a) => a.clockIn)
      .map((a) => this.timeToMinutes(a.clockIn!));
    const avgClockInMinutes = clockIns.length
      ? clockIns.reduce((sum, t) => sum + t, 0) / clockIns.length
      : 0;
    const avgClockIn = this.minutesToTime(avgClockInMinutes);

    // Attendance logs
    const attendanceLogs = monthAttendance.map((a) => ({
      date: a.date,
      day: a.dayName,
      checkInTime: a.clockIn || 'N/A',
      checkOutTime: a.clockOut || 'N/A',
      workHours: a.workMinutes
        ? this.minutesToHoursMinutes(a.workMinutes)
        : '0h',
      status: a.status,
      location: a.location,
    }));

    return {
      totalDaysPresent,
      totalDaysAbsent,
      lateArrivals,
      avgClockIn,
      attendanceLogs,
    };
  }

  async getAllUsersAttendance() {
    const today = new Date().toISOString().split('T')[0];
    const allAttendance = await this.attendanceModel
      .find({ date: today })
      .populate('userId', 'firstName lastName email');

    return allAttendance.map((a) => ({
      user: a.userId,
      date: a.date,
      day: a.dayName,
      clockIn: a.clockIn || 'N/A',
      clockOut: a.clockOut || 'N/A',
      workHours: a.workMinutes
        ? this.minutesToHoursMinutes(a.workMinutes)
        : '0h',
      status: a.status,
      location: a.location,
    }));
  }

  // Helper functions
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    // Convert to 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  }

  private minutesToHoursMinutes(minutes: number): string {
    if (minutes === 0) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }
}
