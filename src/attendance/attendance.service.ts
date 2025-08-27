import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AttendanceLog, AttendanceLogDocument } from './attendance.schema';
import { User, UserDocument } from '../users/users.schema';
import { UserBreak, UserBreakDocument } from '../break/break.schema';
import { OfficeLocation, OfficeLocationDocument } from './office-location.schema';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service'; // Add import

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(AttendanceLog.name)
    private attendanceModel: Model<AttendanceLogDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserBreak.name)
    private userBreakModel: Model<UserBreakDocument>,
    @InjectModel(OfficeLocation.name)
    private officeLocationModel: Model<OfficeLocationDocument>,
    private mailService: MailService,
    private notificationsService: NotificationsService, // Inject NotificationsService
  ) {}

  async setOfficeLocation(latitude: number, longitude: number) {
    await this.officeLocationModel.deleteMany({});
    return this.officeLocationModel.create({ latitude, longitude });
  }

  private getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async clockIn(userId: string, latitude: number, longitude: number) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const clockInTime = now.toTimeString().slice(0, 5);
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

    // Get office location
    const office = await this.officeLocationModel.findOne();
    let location: 'office' | 'home' = 'home';
    let warning: string | undefined = undefined;
    if (office) {
      const distance = this.getDistanceMeters(latitude, longitude, office.latitude, office.longitude);
      if (distance <= 50) {
        location = 'office';
      } else {
        warning = 'You are not at the office location. Marked as work from home.';
      }
    } else {
      warning = 'Office location not set. Marked as work from home.';
    }

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

    // Send clock-in email
    this.mailService.sendClockInEmail({
      userId: user,
      checkInTime: now,
      date: today,
      location,
      status: isLate ? 'late' : 'present',
      warning,
    });

    // Notify user
    await this.notificationsService.notifyClockIn(userId, location, isLate);

    return { attendance, warning };
  }

  async clockOut(userId: string, latitude: number, longitude: number) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const clockOutTime = now.toTimeString().slice(0, 5);

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

    // Get office location
    const office = await this.officeLocationModel.findOne();
    let location: 'office' | 'home' = 'home';
    let warning: string | undefined = undefined;
    if (office) {
      const distance = this.getDistanceMeters(latitude, longitude, office.latitude, office.longitude);
      if (distance <= 50) {
        location = 'office';
      } else {
        warning = 'You are not at the office location. Marked as work from home.';
      }
    } else {
      warning = 'Office location not set. Marked as work from home.';
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
    attendance.location = location;
    await attendance.save();

    // Send clock-out email
    this.mailService.sendClockOutEmail({
      userId: user,
      checkInTime: attendance.clockIn,
      checkOutTime: now,
      date: today,
      workMinutes,
      location,
      isOvertime,
      warning,
    });

    // Notify user
    await this.notificationsService.notifyClockOut(userId, workMinutes, isOvertime);

    return { attendance, warning };
  }

  async getDashboard(userId: string, filter: 'week' | 'month' = 'week') {
    const today = new Date().toISOString().split('T')[0];
    const user = await this.userModel.findById(userId);
    const shiftHours = user?.shiftHours || 8;
    const shiftMinutes = shiftHours * 60;

    // Today's attendance
    const todayAttendance = await this.attendanceModel.findOne({
      userId,
      date: today,
    });

    // Filter logic
    let startDate: Date;
    let daysCount: number;
    if (filter === 'month') {
      startDate = new Date();
      startDate.setDate(1);
      daysCount = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      daysCount = 7;
    }
    const startStr = startDate.toISOString().split('T')[0];

    // Attendance logs for chart (week or month)
    const logs = await this.attendanceModel.find({
      userId,
      date: { $gte: startStr },
      clockOut: { $ne: null },
    });

    // weekAttendance = كل سجلات الحضور في الفترة المطلوبة
    const weekAttendance = logs;

    // thisWeekMinutes = مجموع دقائق العمل في الفترة المطلوبة
    const thisWeekMinutes = weekAttendance.reduce(
      (sum, a) => sum + (a.workMinutes || 0),
      0
    );

    // Chart data (لا تعيد تعريف chartData مرتين)
    const chartData: { date: string; day: string; hours: number }[] = [];
    for (let i = daysCount - 1; i >= 0; i--) {
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

    // Most productive day (الفترة المطلوبة)
    const mostProductiveDay = weekAttendance.reduce(
      (max: AttendanceLogDocument | null, curr: AttendanceLogDocument) =>
        curr.workMinutes > (max?.workMinutes || 0) ? curr : max,
      null,
    );

    return {
      dailyShift: `${this.minutesToHoursMinutes(todayWorkMinutes)}`,
      thisWeek: this.minutesToHoursMinutes(thisWeekMinutes),
      breaksTaken: this.minutesToHoursMinutes(todayBreakMinutes),
      breaksCount: todayBreaks.length,
      totalOvertime: this.minutesToHoursMinutes(totalOvertimeMinutes),
      currentStatus: isClockedIn ? 'Clocked In' : 'Clocked Out',
      activeWorkTime: this.minutesToHoursMinutes(activeWorkMinutes),
      todayProgress: `${this.minutesToHoursMinutes(todayWorkMinutes)} / ${shiftHours}h`,
      efficiency: Math.round(efficiency),
      completedShift: Math.round(completedShift),
      remainingTime: this.minutesToHoursMinutes(remainingMinutes),
      mostProductiveDay: mostProductiveDay
        ? {
            day: mostProductiveDay.dayName,
            time: this.minutesToHoursMinutes(mostProductiveDay.workMinutes),
          }
        : null,
      workHoursChart: chartData,
    };
  }
 
  async getStats(userId: string, page = 1, limit = 8) {
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    const skip = (page - 1) * limit;

    // Get paginated logs
    const monthAttendance = await this.attendanceModel
      .find({ userId, date: { $gte: monthStartStr } })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalCount = await this.attendanceModel.countDocuments({
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
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
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
