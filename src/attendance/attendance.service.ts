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
    const today = new Date();
    let chartData: { label: string; hours: number }[] = [];
    let logs: AttendanceLogDocument[] = []; // تعريف logs هنا

    if (filter === 'month') {
      // احسب بداية الشهر الحالي
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const daysInMonth = monthEnd.getDate();

      // جلب كل الحضور في الشهر الحالي
      logs = await this.attendanceModel.find({
        userId,
        date: { $gte: monthStart.toISOString().split('T')[0], $lte: monthEnd.toISOString().split('T')[0] },
        clockOut: { $ne: null },
      });

      // احسب مجموع ساعات كل أسبوع
      for (let w = 0; w < 4; w++) {
        const weekStartDay = w * 7 + 1;
        const weekEndDay = Math.min((w + 1) * 7, daysInMonth);
        let weekHours = 0;
        for (let d = weekStartDay; d <= weekEndDay; d++) {
          const date = new Date(today.getFullYear(), today.getMonth(), d).toISOString().split('T')[0];
          const dayAttendance = logs.find((a) => a.date === date);
          weekHours += dayAttendance ? (dayAttendance.workMinutes || 0) / 60 : 0;
        }
        chartData.push({
          label: `Week ${w + 1}`,
          hours: Math.round(weekHours * 10) / 10,
        });
      }
    } else {
      // week: آخر 7 أيام
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 6);
      logs = await this.attendanceModel.find({
        userId,
        date: { $gte: startDate.toISOString().split('T')[0], $lte: today.toISOString().split('T')[0] },
        clockOut: { $ne: null },
      });

      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayAttendance = logs.find((a) => a.date === dateStr);
        chartData.push({
          label: date.toLocaleDateString('en-US', { weekday: 'short' }),
          hours: dayAttendance ? Math.round((dayAttendance.workMinutes / 60) * 10) / 10 : 0,
        });
      }
    }

    // جلب بيانات اليوم الحالي
    const todayStr = today.toISOString().split('T')[0];
    const todayAttendance = await this.attendanceModel.findOne({
      userId,
      date: todayStr,
    });

    // shiftHours و shiftMinutes من بيانات المستخدم
    const user = await this.userModel.findById(userId);
    const shiftHours = user?.shiftHours || 8;
    const shiftMinutes = shiftHours * 60;

    // احسب وقت clock in بصيغة ISO لو المستخدم Clocked In
    let clockInTime: string | null = null;
    if (todayAttendance?.clockIn && !todayAttendance?.clockOut) {
      clockInTime = new Date(`${todayStr}T${todayAttendance.clockIn}:00`).toISOString();
    }

    // Today's breaks
    const todayBreaks = await this.userBreakModel.find({
      userId,
      startTime: {
        $gte: new Date(todayStr + 'T00:00:00'),
        $lt: new Date(todayStr + 'T23:59:59'),
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
    const mostProductiveDay = logs.reduce(
      (max: AttendanceLogDocument | null, curr: AttendanceLogDocument) =>
        curr.workMinutes > (max?.workMinutes || 0) ? curr : max,
      null,
    );

    return {
      dailyShift: `${this.minutesToHoursMinutes(todayWorkMinutes)}`,
      thisWeek: this.minutesToHoursMinutes(0),
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
      clockInTime,
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
