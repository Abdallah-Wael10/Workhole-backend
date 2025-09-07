import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Timer, TimerDocument } from './timer.schema';
import { User, UserDocument } from '../users/users.schema';
import { CreateTimerDto } from './dto/create-timer.dto';
import { UpdateTimerDto } from './dto/update-timer.dto';

@Injectable()
export class TimerService {
  constructor(
    @InjectModel(Timer.name) private timerModel: Model<TimerDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async startTimer(userId: string, dto: CreateTimerDto) {
    // Check for existing running/paused timer
    const existingTimer = await this.timerModel.findOne({
      userId,
      status: { $in: ['running', 'paused'] },
    });
    if (existingTimer)
      throw new BadRequestException('You already have an active timer. Please complete or cancel it first.');

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const timer = await this.timerModel.create({
      userId,
      tag: dto.tag,
      duration: dto.duration,
      startTime: new Date(),
      status: 'running',
      totalPaused: 0,
    });

    return { 
      success: true, 
      timer: {
        id: timer._id,
        tag: timer.tag,
        duration: timer.duration,
        startTime: timer.startTime,
        status: timer.status,
      }
    };
  }

  async getCurrentTimer(userId: string) {
    const timer = await this.timerModel.findOne({
      userId,
      status: { $in: ['running', 'paused'] },
    });
    
    if (!timer) return { isRunning: false, timer: null };

    // Calculate elapsed time in seconds for real-time display
    let elapsedSeconds = 0;
    if (timer.status === 'running') {
      elapsedSeconds = Math.floor(
        (Date.now() - timer.startTime.getTime() - (timer.totalPaused || 0) * 1000) / 1000
      );
    } else if (timer.status === 'paused' && timer.pausedAt) {
      elapsedSeconds = Math.floor(
        (timer.pausedAt.getTime() - timer.startTime.getTime() - (timer.totalPaused || 0) * 1000) / 1000
      );
    }

    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const remainingMinutes = Math.max(0, timer.duration - elapsedMinutes);

    // Auto-complete if duration exceeded (optional - for countdown mode)
    if (timer.duration > 0 && elapsedMinutes >= timer.duration && timer.status === 'running') {
      await this.completeTimer(userId, String(timer._id), { note: 'Auto-completed - duration reached' });
      return { isRunning: false, timer: null, completed: true };
    }

    return {
      isRunning: true,
      timer: {
        id: timer._id,
        tag: timer.tag,
        duration: timer.duration,
        elapsedSeconds,
        elapsedMinutes,
        remainingMinutes,
        startTime: timer.startTime,
        status: timer.status,
        progress: timer.duration > 0 ? Math.min(100, Math.round((elapsedMinutes / timer.duration) * 100)) : 0,
        totalPaused: timer.totalPaused || 0,
        pausedAt: timer.pausedAt,
      },
    };
  }

  async pauseTimer(userId: string, timerId: string) {
    const timer = await this.timerModel.findOne({
      _id: timerId,
      userId,
      status: 'running',
    });
    
    if (!timer) throw new NotFoundException('No running timer found');
    
    await this.timerModel.findByIdAndUpdate(timerId, {
      status: 'paused',
      pausedAt: new Date(),
    });
    
    return { success: true, message: 'Timer paused successfully' };
  }

  async resumeTimer(userId: string, timerId: string) {
    const timer = await this.timerModel.findOne({
      _id: timerId,
      userId,
      status: 'paused',
    });
    
    if (!timer) throw new NotFoundException('No paused timer found');
    if (!timer.pausedAt) throw new BadRequestException('Timer is not paused');
    
    // Calculate how long the timer was paused (in seconds)
    const pausedDurationSeconds = Math.floor((Date.now() - timer.pausedAt.getTime()) / 1000);
    
    await this.timerModel.findByIdAndUpdate(timerId, {
      status: 'running',
      totalPaused: (timer.totalPaused || 0) + pausedDurationSeconds,
      pausedAt: null,
    });
    
    return { success: true, message: 'Timer resumed successfully' };
  }

  async completeTimer(userId: string, timerId: string, dto: UpdateTimerDto) {
    const timer = await this.timerModel.findOne({ 
      _id: timerId, 
      userId,
      status: { $in: ['running', 'paused'] }
    });
    
    if (!timer) throw new NotFoundException('No active timer found');
    
    const now = new Date();
    let actualDurationSeconds;
    
    if (timer.status === 'running') {
      actualDurationSeconds = Math.floor(
        (now.getTime() - timer.startTime.getTime() - (timer.totalPaused || 0) * 1000) / 1000
      );
    } else { // paused
      actualDurationSeconds = timer.pausedAt
        ? Math.floor(
            (timer.pausedAt.getTime() - timer.startTime.getTime() - (timer.totalPaused || 0) * 1000) / 1000
          )
        : 0;
    }
    
    await this.timerModel.findByIdAndUpdate(timerId, {
      endTime: now,
      actualDuration: Math.floor(actualDurationSeconds / 60), // Store in minutes
      actualDurationSeconds,
      status: 'completed',
      note: dto.note || '',
    });
    
    return { 
      success: true, 
      message: 'Timer completed successfully',
      actualDuration: actualDurationSeconds,
    };
  }

  async cancelTimer(userId: string, timerId: string, dto: UpdateTimerDto) {
    const timer = await this.timerModel.findOne({ 
      _id: timerId, 
      userId,
      status: { $in: ['running', 'paused'] }
    });
    
    if (!timer) throw new NotFoundException('No active timer found');
    
    const now = new Date();
    let actualDurationSeconds = 0;
    
    if (timer.status === 'running') {
      actualDurationSeconds = Math.floor(
        (now.getTime() - timer.startTime.getTime() - (timer.totalPaused || 0) * 1000) / 1000
      );
    } else { // paused
      actualDurationSeconds = timer.pausedAt
        ? Math.floor(
            (timer.pausedAt.getTime() - timer.startTime.getTime() - (timer.totalPaused || 0) * 1000) / 1000
          )
        : 0;
    }
    
    await this.timerModel.findByIdAndUpdate(timerId, {
      endTime: now,
      actualDuration: Math.floor(actualDurationSeconds / 60), // Store in minutes
      actualDurationSeconds,
      status: 'cancelled',
      note: dto.note || '',
    });
    
    return { 
      success: true, 
      message: 'Timer cancelled successfully',
      actualDuration: actualDurationSeconds,
    };
  }

  async getTimerLogs(userId: string) {
    return await this.timerModel.find({ userId }).sort({ startTime: -1 });
  }

  async getWeeklyFocusTime(userId: string) {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);

    // Get completed focus timers for this week
    const focusTimers = await this.timerModel.find({
      userId,
      status: 'completed',
      endTime: { $gte: weekStart },
    });

    // Calculate total focus time in minutes
    const totalFocusMinutes = focusTimers.reduce((sum, timer) => {
      return sum + (timer.actualDuration || 0);
    }, 0);

    // Convert to hours and minutes
    const hours = Math.floor(totalFocusMinutes / 60);
    const minutes = totalFocusMinutes % 60;

    return {
      totalMinutes: totalFocusMinutes,
      formattedTime: `${hours}h ${minutes}m`,
      sessionsCount: focusTimers.length
    };
  }
}