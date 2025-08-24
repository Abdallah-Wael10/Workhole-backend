import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Timer, TimerDocument } from './timer.schema';
import { User, UserDocument } from '../users/users.schema';
import { CreateTimerDto } from './dto/create-timer.dto';
import { CompleteTimerDto, UpdateTimerDto } from './dto/update-timer.dto';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service'; // Add import

@Injectable()
export class TimerService {
  constructor(
    @InjectModel(Timer.name) private timerModel: Model<TimerDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private mailService: MailService,
    private notificationsService: NotificationsService, // Inject NotificationsService
  ) {}

  async startTimer(userId: string, dto: CreateTimerDto) {
    // Check if user has any running timer
    const runningTimer = await this.timerModel.findOne({
      userId,
      status: 'running',
    });

    if (runningTimer) {
      throw new ForbiddenException(
        'You already have a running timer. Please complete or cancel it first.',
      );
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const timer = await this.timerModel.create({
      userId,
      tag: dto.tag,
      duration: dto.duration,
      startTime: new Date(),
      status: 'running',
      note: dto.note,
    });

    // Send start email
    try {
      await this.mailService.sendTimerStartEmail({
        userId: user,
        tag: dto.tag,
        duration: dto.duration,
        startTime: timer.startTime,
      });
      await this.timerModel.findByIdAndUpdate(timer._id, { emailSent: true });
      await this.notificationsService.notifyTimerStarted(
        userId,
        dto.tag,
        dto.duration,
      );
    } catch (error) {
      console.error('Failed to send timer start email:', error);
    }

    return {
      id: timer._id,
      tag: timer.tag,
      duration: timer.duration,
      startTime: timer.startTime,
      status: timer.status,
      message: `Timer started for ${dto.duration} minutes. Email notification sent!`,
    };
  }

  async completeTimer(timerId: string, userId: string, dto: CompleteTimerDto) {
    const timer = await this.timerModel.findById(timerId);

    if (!timer) {
      throw new NotFoundException('Timer not found');
    }

    if (timer.userId.toString() !== userId) {
      throw new ForbiddenException('You can only complete your own timers');
    }

    if (timer.status !== 'running') {
      throw new ForbiddenException('Timer is not running');
    }

    const endTime = new Date();
    const actualDuration = Math.round(
      (endTime.getTime() - timer.startTime.getTime()) / (1000 * 60),
    ); // Minutes

    const updatedTimer = await this.timerModel
      .findByIdAndUpdate(
        timerId,
        {
          endTime,
          actualDuration,
          status: 'completed',
          note: dto.note || timer.note,
        },
        { new: true },
      )
      .populate('userId', 'firstName lastName email');

    if (!updatedTimer) {
      throw new NotFoundException('Failed to update timer');
    }

    // Send completion email
    try {
      await this.mailService.sendTimerCompleteEmail({
        userId: updatedTimer.userId,
        tag: updatedTimer.tag,
        duration: updatedTimer.duration,
        actualDuration: updatedTimer.actualDuration || 0, // Fix null error
        startTime: updatedTimer.startTime,
        endTime: updatedTimer.endTime || endTime, // Fix null error
        note: updatedTimer.note,
      });

      // Mark completion email as sent
      await this.timerModel.findByIdAndUpdate(timerId, {
        completionEmailSent: true,
      });
      await this.notificationsService.notifyTimerCompleted(
        userId,
        updatedTimer.tag,
        updatedTimer.actualDuration || 0,
      );
    } catch (error) {
      console.error('Failed to send timer completion email:', error);
    }

    return {
      id: updatedTimer._id,
      tag: updatedTimer.tag,
      plannedDuration: updatedTimer.duration,
      actualDuration: updatedTimer.actualDuration || 0,
      startTime: updatedTimer.startTime,
      endTime: updatedTimer.endTime,
      status: updatedTimer.status,
      note: updatedTimer.note,
      message: `Timer completed! You focused for ${actualDuration} minutes. Email notification sent!`,
    };
  }

  async cancelTimer(timerId: string, userId: string, dto: UpdateTimerDto) {
    const timer = await this.timerModel.findById(timerId);

    if (!timer) {
      throw new NotFoundException('Timer not found');
    }

    if (timer.userId.toString() !== userId) {
      throw new ForbiddenException('You can only cancel your own timers');
    }

    if (timer.status !== 'running') {
      throw new ForbiddenException('Timer is not running');
    }

    const endTime = new Date();
    const actualDuration = Math.round(
      (endTime.getTime() - timer.startTime.getTime()) / (1000 * 60),
    );

    const updatedTimer = await this.timerModel.findByIdAndUpdate(
      timerId,
      {
        endTime,
        actualDuration,
        status: 'cancelled',
        note: dto.note || timer.note,
      },
      { new: true },
    );

    if (!updatedTimer) {
      throw new NotFoundException('Failed to cancel timer');
    }

    await this.notificationsService.notifyTimerCancelled(userId, timer.tag);

    return {
      id: updatedTimer._id,
      tag: updatedTimer.tag,
      duration: updatedTimer.duration,
      actualDuration: updatedTimer.actualDuration || 0,
      status: updatedTimer.status,
      message: 'Timer cancelled successfully',
    };
  }

  async getMyTimers(userId: string) {
    const timers = await this.timerModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50); // Last 50 timers

    return timers.map((timer: any) => ({
      // Use any to avoid createdAt error
      id: timer._id,
      tag: timer.tag,
      plannedDuration: timer.duration,
      actualDuration: timer.actualDuration || 0,
      startTime: timer.startTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
      startDate: timer.startTime.toLocaleDateString(),
      endTime: timer.endTime
        ? timer.endTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
        : null,
      status: timer.status,
      note: timer.note,
      efficiency:
        timer.actualDuration && timer.duration
          ? Math.round(
              (Math.min(timer.actualDuration, timer.duration) /
                timer.duration) *
                100,
            )
          : 0,
      createdAt: timer.createdAt, // This should work with any type
    }));
  }

  async getCurrentTimer(userId: string) {
    const timer = await this.timerModel.findOne({
      userId,
      status: 'running',
    });

    if (!timer) {
      return null;
    }

    const now = new Date();
    const elapsedMinutes = Math.round(
      (now.getTime() - timer.startTime.getTime()) / (1000 * 60),
    );
    const remainingMinutes = Math.max(0, timer.duration - elapsedMinutes);

    return {
      id: timer._id,
      tag: timer.tag,
      duration: timer.duration,
      elapsedMinutes,
      remainingMinutes,
      startTime: timer.startTime,
      status: timer.status,
      isOvertime: elapsedMinutes > timer.duration,
    };
  }

  async getTimerStats(userId: string) {
    const timers = await this.timerModel.find({ userId });

    const totalTimers = timers.length;
    const completedTimers = timers.filter(
      (t) => t.status === 'completed',
    ).length;
    const cancelledTimers = timers.filter(
      (t) => t.status === 'cancelled',
    ).length;
    const totalFocusTime = timers
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + (t.actualDuration || 0), 0);

    const averageSessionLength =
      completedTimers > 0 ? Math.round(totalFocusTime / completedTimers) : 0;

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimers = timers.filter((t) => t.startTime >= today);
    const todayFocusTime = todayTimers
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + (t.actualDuration || 0), 0);

    return {
      totalTimers,
      completedTimers,
      cancelledTimers,
      totalFocusTime, // in minutes
      totalFocusTimeFormatted: this.formatMinutes(totalFocusTime),
      averageSessionLength,
      todayFocusTime,
      todayFocusTimeFormatted: this.formatMinutes(todayFocusTime),
      completionRate:
        totalTimers > 0 ? Math.round((completedTimers / totalTimers) * 100) : 0,
    };
  }

  private formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }
}
