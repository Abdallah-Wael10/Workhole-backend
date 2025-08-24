import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MailService } from '../mail/mail.service';
import { User, UserDocument } from '../users/users.schema';
import {
  BreakType,
  BreakTypeDocument,
  UserBreak,
  UserBreakDocument,
} from './break.schema';
import { CreateBreakDto } from './dto/create-break.dto';
import { UpdateBreakDto } from './dto/update-break.dto';
import { NotificationsService } from '../notifications/notifications.service'; // Add import

@Injectable()
export class BreakService {
  constructor(
    @InjectModel(BreakType.name)
    private breakTypeModel: Model<BreakTypeDocument>,
    @InjectModel(UserBreak.name)
    private userBreakModel: Model<UserBreakDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private mailService: MailService,
    private notificationsService: NotificationsService, // Inject NotificationsService
  ) {}

  // Admin: Create break type
  async createBreakType(dto: CreateBreakDto) {
    return this.breakTypeModel.create(dto);
  }

  // Admin: Update break type
  async updateBreakType(id: string, dto: UpdateBreakDto) {
    return this.breakTypeModel.findByIdAndUpdate(id, dto, { new: true });
  }

  // Admin: List all break types
  async getBreakTypes() {
    return this.breakTypeModel.find({ isActive: true });
  }

  // User: Start break (مع إرسال إيميل)
  async startBreak(userId: string, breakType: string) {
    const type = await this.breakTypeModel.findOne({
      name: breakType,
      isActive: true,
    });
    if (!type) throw new Error('Break type not found');

    const user = await this.userModel.findById(userId);
    if (!user) throw new Error('User not found');

    const userBreak = await this.userBreakModel.create({
      userId,
      breakType: type.name,
      startTime: new Date(),
    });

    // 1️⃣ إرسال إيميل بداية البريك
    try {
      await this.mailService.sendBreakStartEmail({
        userId: user,
        breakType: type.name,
        duration: type.duration,
        startTime: userBreak.startTime,
      });
      await this.notificationsService.notifyBreakStarted(userId, type.name, type.duration);
    } catch (error) {
      console.error('Failed to send break start email:', error);
    }

    // 2️⃣ جدولة إيميل التحذير (باقي دقيقة واحدة)
    if (type.duration > 1) {
      setTimeout(
        async () => {
          await this.sendBreakWarning(userId, userBreak._id);
        },
        (type.duration - 1) * 60 * 1000,
      ); // duration - 1 minute
    }

    // 3️⃣ جدولة إيميل تجاوز الوقت
    setTimeout(
      async () => {
        await this.sendBreakExceedWarning(userId, userBreak._id);
      },
      type.duration * 60 * 1000,
    ); // exact duration time

    return userBreak;
  }

  // User: Stop break (مع إرسال إيميل)
  async stopBreak(userId: string) {
    const ongoing = await this.userBreakModel
      .findOne({ userId, endTime: null })
      .sort({ startTime: -1 });
    if (!ongoing) throw new Error('No ongoing break');

    const type = await this.breakTypeModel.findOne({ name: ongoing.breakType });
    if (!type) throw new Error('Break type not found');

    const user = await this.userModel.findById(userId);
    if (!user) throw new Error('User not found');

    const endTime = new Date();
    const duration = Math.round(
      (endTime.getTime() - ongoing.startTime.getTime()) / 60000,
    );
    const exceeded = duration > type.duration;

    ongoing.endTime = endTime;
    ongoing.duration = duration;
    ongoing.exceeded = exceeded;
    await ongoing.save();

    // 4️⃣ إرسال إيميل إنهاء البريك
    try {
      await this.mailService.sendBreakEndEmail({
        userId: user,
        breakType: type.name,
        duration: type.duration,
        actualDuration: duration,
        startTime: ongoing.startTime,
        endTime: endTime,
      });
      await this.notificationsService.notifyBreakEnded(userId, duration);
    } catch (error) {
      console.error('Failed to send break end email:', error);
    }

    return ongoing;
  }

  // 2️⃣ إرسال تحذير باقي دقيقة واحدة
  private async sendBreakWarning(userId: string, breakId: any) {
    try {
      const userBreak = await this.userBreakModel.findById(breakId);
      if (!userBreak || userBreak.endTime) return; // البريك انتهى بالفعل

      const user = await this.userModel.findById(userId);
      const type = await this.breakTypeModel.findOne({
        name: userBreak.breakType,
      });

      if (user && type) {
        await this.mailService.sendBreakWarningEmail({
          userId: user,
          breakType: type.name,
          duration: type.duration,
          startTime: userBreak.startTime,
        });
        await this.notificationsService.notifyBreakWarning(userId, type.name);
      }
    } catch (error) {
      console.error('Failed to send break warning email:', error);
    }
  }

  // 3️⃣ إرسال تحذير تجاوز الوقت المحدد (فور انتهاء الوقت المحدد)
  private async sendBreakExceedWarning(userId: string, breakId: any) {
    try {
      const userBreak = await this.userBreakModel.findById(breakId);
      if (!userBreak || userBreak.endTime) return; // البريك انتهى بالفعل

      const user = await this.userModel.findById(userId);
      const type = await this.breakTypeModel.findOne({
        name: userBreak.breakType,
      });

      if (user && type) {
        const currentDuration = Math.round(
          (new Date().getTime() - userBreak.startTime.getTime()) / 60000,
        );
        await this.mailService.sendBreakExceedEmail({
          userId: user,
          breakType: type.name,
          duration: type.duration,
          currentDuration: currentDuration,
          startTime: userBreak.startTime,
        });
        await this.notificationsService.notifyBreakExceeded(userId, type.name);
      }
    } catch (error) {
      console.error('Failed to send break exceed email:', error);
    }
  }

  // User: Get today's break time
  async getTodaysBreakTime(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const breaks = await this.userBreakModel.find({
      userId,
      startTime: { $gte: today },
      endTime: { $ne: null },
    });
    const total = breaks.reduce((sum, b) => sum + b.duration, 0);
    return { totalMinutes: total, breaks };
  }

  // User: Get break stats (for chart, etc)
  async getBreakStats(userId: string) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    console.log('Debug - userId:', userId);
    console.log('Debug - sevenDaysAgo:', sevenDaysAgo);

    // Debug: Check what breaks exist for this user
    const debugBreaks = await this.userBreakModel.find({
      userId: userId,
      startTime: { $gte: sevenDaysAgo },
      endTime: { $ne: null },
    });
    console.log('Debug - Found breaks:', debugBreaks.length);

    // Get all break types
    const allTypes = await this.breakTypeModel.find({ isActive: true }).lean();
    console.log(
      'Debug - All break types:',
      allTypes.map((t) => t.name),
    );

    // Aggregation for usage
    const agg = await this.userBreakModel.aggregate([
      {
        $match: {
          userId: userId,
          startTime: { $gte: sevenDaysAgo },
          endTime: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$breakType',
          count: { $sum: 1 },
          total: { $sum: '$duration' },
        },
      },
      { $sort: { count: -1 } },
    ]);
    console.log('Debug - Aggregation result:', agg);

    // Merge all break types with usage
    const breakTypeUsage = allTypes.map((type) => {
      const found = agg.find((a) => a._id === type.name);
      return {
        type: type.name,
        count: found ? found.count : 0,
        total: found ? found.total : 0,
      };
    });

    // Most used break type
    const mostUsedObj = breakTypeUsage.reduce(
      (max: { type: string; count: number; total: number } | null, curr) =>
        curr.count > (max?.count ?? 0) ? curr : max,
      null,
    );
    const mostUsed =
      mostUsedObj && mostUsedObj.count > 0 ? mostUsedObj.type : null;

    // Avg break per day
    const avgPerDay = debugBreaks.length
      ? debugBreaks.reduce((sum, b) => sum + b.duration, 0) / 7
      : 0;

    // Breaks over limit
    const overLimit = debugBreaks.filter((b) => b.exceeded).length;

    return {
      mostUsed,
      avgPerDay: Math.round(avgPerDay),
      breaksOverLimit: overLimit,
      breakTypeUsage,
    };
  }

  // Admin/User: List all breaks (with filters)
  async listBreaks(query: any) {
    return this.userBreakModel.find(query).sort({ startTime: -1 });
  }

  async listBreaksPaginated(query: any, page = 1, limit = 4) {
    const skip = (page - 1) * limit;
    const [breaks, total] = await Promise.all([
      this.userBreakModel.find(query).sort({ startTime: -1 }).skip(skip).limit(limit),
      this.userBreakModel.countDocuments(query),
    ]);
    return {
      breaks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public formatMinutes(minutes: number): string {
    if (minutes === 0) return '0 min';

    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    if (hours === 0) return `${mins} min`; // "3 min", "22 min"
    if (mins === 0) return `${hours} hr`; // "3 hr", "8 hr"
    return `${hours} hr ${mins} min`; // "1 hr 30 min", "2 hr 15 min"
  }
}
