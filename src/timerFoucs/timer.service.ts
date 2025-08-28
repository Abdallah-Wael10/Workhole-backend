import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException, // بدل TooManyRequestsException
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
    // Prevent too many requests (one running timer per user)
    const runningTimer = await this.timerModel.findOne({
      userId,
      status: 'running',
    });
    if (runningTimer)
      throw new BadRequestException('You already have a running timer.');

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

    return { success: true, timer };
  }

  async getCurrentTimer(userId: string) {
    const timer = await this.timerModel.findOne({
      userId,
      status: { $in: ['running', 'paused'] },
    });
    if (!timer) return { isRunning: false, timer: null };

    let elapsedMinutes = 0;
    if (timer.status === 'running') {
      elapsedMinutes = Math.round(
        (Date.now() - timer.startTime.getTime() - (timer.totalPaused || 0) * 60000) /
          60000,
      );
    } else if (timer.status === 'paused' && timer.pausedAt) {
      elapsedMinutes = Math.round(
        (timer.pausedAt.getTime() - timer.startTime.getTime() - (timer.totalPaused || 0) * 60000) /
          60000,
      );
    }

    const remainingMinutes = Math.max(0, timer.duration - elapsedMinutes);

    // Auto-complete if finished
    if (remainingMinutes <= 0 && timer.status === 'running') {
      await this.completeTimer(userId, String(timer._id), { note: 'Auto-completed' });
      return { isRunning: false, timer: null, completed: true };
    }

    return {
      isRunning: true,
      timer: {
        id: timer._id,
        tag: timer.tag,
        duration: timer.duration,
        elapsedMinutes,
        remainingMinutes,
        startTime: timer.startTime,
        status: timer.status,
        progress: Math.round((elapsedMinutes / timer.duration) * 100),
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
    return { success: true };
  }

  async resumeTimer(userId: string, timerId: string) {
    const timer = await this.timerModel.findOne({
      _id: timerId,
      userId,
      status: 'paused',
    });
    if (!timer) throw new NotFoundException('No paused timer found');
    if (!timer.pausedAt) throw new BadRequestException('Timer is not paused');
    const pausedDuration = Math.round((Date.now() - timer.pausedAt.getTime()) / 60000);
    await this.timerModel.findByIdAndUpdate(timerId, {
      status: 'running',
      totalPaused: (timer.totalPaused || 0) + pausedDuration,
      pausedAt: null,
    });
    return { success: true };
  }

  async completeTimer(userId: string, timerId: string, dto: UpdateTimerDto) {
    const timer = await this.timerModel.findOne({ _id: timerId, userId });
    if (!timer) throw new NotFoundException('Timer not found');
    const now = new Date();
    let actualDuration = Math.round(
      (now.getTime() - timer.startTime.getTime() - (timer.totalPaused || 0) * 60000) /
        60000,
    );
    actualDuration = Math.min(actualDuration, timer.duration);
    await this.timerModel.findByIdAndUpdate(timerId, {
      endTime: now,
      actualDuration,
      status: 'completed',
      note: dto.note || '',
    });
    return { success: true };
  }

  async cancelTimer(userId: string, timerId: string, dto: UpdateTimerDto) {
    const timer = await this.timerModel.findOne({ _id: timerId, userId });
    if (!timer) throw new NotFoundException('Timer not found');
    await this.timerModel.findByIdAndUpdate(timerId, {
      endTime: new Date(),
      status: 'cancelled',
      note: dto.note || '',
    });
    return { success: true };
  }
}
