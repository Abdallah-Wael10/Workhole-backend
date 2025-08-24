import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Leave, LeaveDocument } from './leaves.schema';
import { User, UserDocument } from '../users/users.schema';
import { CreateLeaveDto } from './dto/create-leaves-dto';
import { UpdateLeaveDto, AdminActionDto } from './dto/update-leaves-dto';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service'; // Add import

@Injectable()
export class LeavesService {
  constructor(
    @InjectModel(Leave.name) private leaveModel: Model<LeaveDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private mailService: MailService,
    private notificationsService: NotificationsService, // Inject NotificationsService
  ) {}

  async createLeave(
    userId: string,
    dto: CreateLeaveDto,
    attachmentUrl?: string,
  ) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const timeDiff = endDate.getTime() - startDate.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    if (days <= 0) {
      throw new Error('End date must be after start date');
    }

    const leave = await this.leaveModel.create({
      userId,
      leaveType: dto.leaveType,
      startDate,
      endDate,
      days,
      reason: dto.reason,
      attachmentUrl,
      status: 'pending',
    });

    const populatedLeave = await leave.populate('userId', 'firstName lastName email');

    // Send email to user
    await this.mailService.sendLeaveRequestEmail({
      employee: populatedLeave.userId,
      leaveType: dto.leaveType,
      startDate,
      endDate,
      days,
      reason: dto.reason,
      attachmentUrl,
    });

    // Notify user
    await this.notificationsService.notifyLeaveSubmitted(userId);

    // Notify admins
    const admins = await this.userModel.find({ role: 'admin' }, 'email firstName lastName _id');
    const user = await this.userModel.findById(userId).select('firstName lastName');
    const userName =
      user && user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : 'موظف غير معروف';

    for (const admin of admins) {
      await this.mailService.sendLeaveAdminNotification({
        employee: user,
        leaveType: dto.leaveType,
        startDate,
        endDate,
        days,
        reason: dto.reason,
        attachmentUrl,
        adminEmail: admin.email,
      });
      await this.notificationsService.notifyAdminMessage(
        admin._id.toString(),
        `تم إرسال طلب إجازة جديد من ${userName}`
      );
    }

    return populatedLeave;
  }

  async getUserLeaves(userId: string) {
    return this.leaveModel
      .find({ userId })
      .populate('userId', 'firstName lastName email')
      .populate('actionBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
  }

  async getUserLeavesPaginated(userId: string, page = 1, limit = 6) {
    const skip = (page - 1) * limit;
    const [leaves, total] = await Promise.all([
      this.leaveModel
        .find({ userId })
        .populate('userId', 'firstName lastName email')
        .populate('actionBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.leaveModel.countDocuments({ userId }),
    ]);
    return {
      leaves,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateLeave(leaveId: string, userId: string, dto: UpdateLeaveDto) {
    const leave = await this.leaveModel.findById(leaveId);
    if (!leave) throw new NotFoundException('Leave not found');
    if (leave.userId.toString() !== userId) throw new ForbiddenException('You can only update your own leaves');
    if (leave.status !== 'pending') throw new ForbiddenException('You can only update pending leaves');

    if (dto.startDate || dto.endDate) {
      const startDate = new Date(dto.startDate || leave.startDate);
      const endDate = new Date(dto.endDate || leave.endDate);
      const timeDiff = endDate.getTime() - startDate.getTime();
      const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
      dto['days'] = days;
    }

    const updatedLeave = await this.leaveModel
      .findByIdAndUpdate(leaveId, dto, { new: true })
      .populate('userId', 'firstName lastName email')
      .populate('actionBy', 'firstName lastName email');

    // Notify user
    await this.notificationsService.notifyLeaveUpdated(userId);

    return updatedLeave;
  }

  async deleteLeave(leaveId: string, userId: string) {
    const leave = await this.leaveModel.findById(leaveId);
    if (!leave) throw new NotFoundException('Leave not found');
    if (leave.userId.toString() !== userId) throw new ForbiddenException('You can only delete your own leaves');
    if (leave.status !== 'pending') throw new ForbiddenException('You can only delete pending leaves');

    await this.leaveModel.findByIdAndDelete(leaveId);

    // Notify user
    await this.notificationsService.notifyLeaveDeleted(userId);

    return { message: 'Leave deleted successfully' };
  }

  async getLeaveStats(userId: string) {
    const user = await this.userModel.findById(userId);
    const allLeaves = await this.leaveModel.find({ userId });

    // Count by leave type
    const annualLeaves = allLeaves.filter(
      (l) => l.leaveType === 'Annual Leave',
    ).length;
    const sickLeaves = allLeaves.filter(
      (l) => l.leaveType === 'Sick Leave',
    ).length;
    const emergencyLeaves = allLeaves.filter(
      (l) => l.leaveType === 'Emergency Leave',
    ).length;
    const unpaidLeaves = allLeaves.filter(
      (l) => l.leaveType === 'Unpaid Leave',
    ).length;

    // Count by status
    const pendingLeaves = allLeaves.filter(
      (l) => l.status === 'pending',
    ).length;
    const approvedLeaves = allLeaves.filter(
      (l) => l.status === 'approved',
    ).length;
    const rejectedLeaves = allLeaves.filter(
      (l) => l.status === 'rejected',
    ).length;

    // Calculate used annual leave days
    const approvedAnnualLeaves = allLeaves.filter(
      (l) => l.leaveType === 'Annual Leave' && l.status === 'approved',
    );
    const usedAnnualDays = approvedAnnualLeaves.reduce(
      (sum, l) => sum + l.days,
      0,
    );
    const availableLeaves = Math.max(
      0,
      (user?.availableLeaves || 21) - usedAnnualDays,
    );

    return {
      leaveTypeCounts: {
        annualLeaves,
        sickLeaves,
        emergencyLeaves,
        unpaidLeaves,
      },
      statusCounts: {
        pendingLeaves,
        approvedLeaves,
        rejectedLeaves,
      },
      availableLeaves,
      totalAnnualLeaves: user?.availableLeaves || 21,
      usedAnnualDays,
    };
  }

  async getAllLeaves() {
    return this.leaveModel
      .find()
      .populate('userId', 'firstName lastName email')
      .populate('actionBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
  }

  async adminAction(leaveId: string, adminId: string, dto: AdminActionDto) {
    const leave = await this.leaveModel.findById(leaveId);
    if (!leave) throw new NotFoundException('Leave not found');
    if (leave.status !== 'pending') throw new ForbiddenException('Leave has already been processed');

    const updatedLeave = await this.leaveModel
      .findByIdAndUpdate(
        leaveId,
        {
          status: dto.status,
          actionBy: adminId,
          actionNote: dto.actionNote,
          actionDate: new Date(),
        },
        { new: true },
      )
      .populate('userId', 'firstName lastName email')
      .populate('actionBy', 'firstName lastName email');

    if (!updatedLeave) throw new NotFoundException('Leave not found after update');

    // Send email to user based on action
    if (dto.status === 'approved') {
      await this.mailService.sendLeaveApprovedEmail({
        employee: updatedLeave.userId,
        leaveType: updatedLeave.leaveType,
        startDate: updatedLeave.startDate,
        endDate: updatedLeave.endDate,
        days: updatedLeave.days,
        reason: updatedLeave.reason,
        attachmentUrl: updatedLeave.attachmentUrl,
      });
      await this.notificationsService.notifyLeaveApproved(updatedLeave.userId._id.toString());
    } else if (dto.status === 'rejected') {
      await this.mailService.sendLeaveRejectedEmail({
        employee: updatedLeave.userId,
        leaveType: updatedLeave.leaveType,
        startDate: updatedLeave.startDate,
        endDate: updatedLeave.endDate,
        days: updatedLeave.days,
        reason: updatedLeave.reason,
        attachmentUrl: updatedLeave.attachmentUrl,
        actionNote: updatedLeave.actionNote,
      });
      await this.notificationsService.notifyLeaveRejected(updatedLeave.userId._id.toString(), updatedLeave.actionNote);
    }

    // Optionally, notify admin their action is complete
    await this.notificationsService.notifyAdminMessage(adminId, `تم اتخاذ إجراء على طلب الإجازة (${dto.status})`);

    return updatedLeave;
  }

  async uploadAttachment(file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const attachmentUrl = `/images/leaveAttachments/${file.filename}`;
    return { attachmentUrl };
  }
}
