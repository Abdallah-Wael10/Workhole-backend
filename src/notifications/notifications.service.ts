import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from './notifications.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  async createNotification(notification: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
  }) {
    return this.notificationModel.create({
      ...notification,
      status: 'unread',
      lang: 'en', // Always English
    });
  }

  async getUserNotifications(userId: string) {
    return this.notificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .lean();
  }

  async markAsRead(id: string) {
    return this.notificationModel.findByIdAndUpdate(id, { status: 'read' }, { new: true });
  }

  // Helper methods for each event type (English only)

  async notifyLeaveSubmitted(userId: string) {
    return this.createNotification({
      userId,
      type: 'leave',
      title: 'New Leave Request',
      message: 'Your leave request has been submitted and is pending review.',
    });
  }

  async notifyLeaveApproved(userId: string) {
    return this.createNotification({
      userId,
      type: 'leave',
      title: 'Leave Approved',
      message: 'Your leave request has been approved.',
    });
  }

  async notifyLeaveRejected(userId: string, reason?: string) {
    return this.createNotification({
      userId,
      type: 'leave',
      title: 'Leave Rejected',
      message: reason
        ? `Your leave request was rejected. Reason: ${reason}`
        : 'Your leave request was rejected.',
    });
  }

  async notifyLeaveUpdated(userId: string) {
    return this.createNotification({
      userId,
      type: 'leave',
      title: 'Leave Updated',
      message: 'Your leave request has been updated.',
    });
  }

  async notifyLeaveDeleted(userId: string) {
    return this.createNotification({
      userId,
      type: 'leave',
      title: 'Leave Deleted',
      message: 'Your leave request has been deleted.',
    });
  }

  // Breaks
  async notifyBreakStarted(userId: string, breakType: string, duration: number) {
    return this.createNotification({
      userId,
      type: 'break',
      title: 'Break Started',
      message: `Break started: ${breakType} for ${duration} minutes.`,
    });
  }

  async notifyBreakWarning(userId: string, breakType: string) {
    return this.createNotification({
      userId,
      type: 'break',
      title: 'Break Ending Soon',
      message: `1 minute left for break (${breakType}).`,
    });
  }

  async notifyBreakExceeded(userId: string, breakType: string) {
    return this.createNotification({
      userId,
      type: 'break',
      title: 'Break Exceeded',
      message: `You have exceeded the break duration (${breakType}).`,
    });
  }

  async notifyBreakEnded(userId: string, actualDuration: number) {
    return this.createNotification({
      userId,
      type: 'break',
      title: 'Break Ended',
      message: `Break ended. Duration: ${actualDuration} minutes.`,
    });
  }

  // Attendance
  async notifyClockIn(userId: string, location: string, isLate?: boolean) {
    return this.createNotification({
      userId,
      type: 'attendance',
      title: 'Clock In',
      message: isLate
        ? `You clocked in late today at ${location}.`
        : `Clock in successful at ${location}.`,
    });
  }

  async notifyClockOut(userId: string, workMinutes: number, isOvertime?: boolean) {
    return this.createNotification({
      userId,
      type: 'attendance',
      title: 'Clock Out',
      message: isOvertime
        ? `You did overtime (${workMinutes} minutes).`
        : `You worked ${workMinutes} minutes today.`,
    });
  }

  // Timer Focus
  async notifyTimerStarted(userId: string, tag: string, duration: number) {
    return this.createNotification({
      userId,
      type: 'timer',
      title: 'Focus Session Started',
      message: `Focus session started: ${tag} for ${duration} minutes.`,
    });
  }

  async notifyTimerCompleted(userId: string, tag: string, actualDuration: number) {
    return this.createNotification({
      userId,
      type: 'timer',
      title: 'Focus Session Completed',
      message: `Focus session completed! You focused for ${actualDuration} minutes (${tag}).`,
    });
  }

  async notifyTimerCancelled(userId: string, tag: string) {
    return this.createNotification({
      userId,
      type: 'timer',
      title: 'Focus Session Cancelled',
      message: `Focus session cancelled (${tag}).`,
    });
  }

  // Account/Others
  async notifyPasswordChanged(userId: string) {
    return this.createNotification({
      userId,
      type: 'account',
      title: 'Password Changed',
      message: 'Your password has been changed successfully.',
    });
  }

  async notifyAdminMessage(userId: string, message: string) {
    return this.createNotification({
      userId,
      type: 'admin',
      title: 'Admin Message',
      message,
    });
  }
}