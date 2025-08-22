import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import * as ejs from 'ejs';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { User, UserDocument } from '../users/users.schema';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
  }

  async sendLoginMail(to: string, username: string) {
    try {
      const templatePath = join(
        process.cwd(),
        'src',
        'mail',
        'templates',
        'login.ejs',
      );

      const html = await ejs.renderFile(templatePath, { username });

      await this.transporter.sendMail({
        from: `"WorkHole" <${this.configService.get<string>('EMAIL_USER')}>`,
        to,
        subject: '🔐 WorkHole Login Notification - Account Access Detected',
        html,
      });

      console.log(`Login notification sent to ${to}`);
    } catch (error) {
      console.error('Error sending login email:', error);
    }
  }

  async sendResetPasswordMail(to: string, code: string) {
    try {
      const templatePath = join(
        process.cwd(),
        'src',
        'mail',
        'templates',
        'reset-password.ejs',
      );

      const html = await ejs.renderFile(templatePath, { code });

      await this.transporter.sendMail({
        from: `"WorkHole Security" <${this.configService.get<string>('EMAIL_USER')}>`,
        to,
        subject: '🔑 WorkHole Password Reset Code - Action Required',
        html,
      });

      console.log(`Password reset email sent to ${to}`);
    } catch (error) {
      console.error('Error sending reset password email:', error);
    }
  }



  async sendTimerStartEmail(data: {
    userId: any;
    tag: string;
    duration: number;
    startTime: Date;
  }) {
    try {
      const templatePath = join(
        process.cwd(),
        'src',
        'mail',
        'templates',
        'timer-start.ejs',
      );

      const html = await ejs.renderFile(templatePath, {
        employee: data.userId,
        tag: data.tag,
        duration: data.duration,
        startTime: data.startTime,
      });

      await this.transporter.sendMail({
        from: `"WorkHole" <${this.configService.get<string>('EMAIL_USER')}>`,
        to: data.userId.email,
        subject: `🎯 Timer Started - ${data.tag} (${data.duration} min)`,
        html,
      });

      console.log(`Timer start email sent to ${data.userId.email}`);
    } catch (error) {
      console.error('Error sending timer start email:', error);
    }
  }

  async sendTimerCompleteEmail(data: {
    userId: any;
    tag: string;
    duration: number;
    actualDuration: number;
    startTime: Date;
    endTime: Date;
    note?: string;
  }) {
    try {
      const templatePath = join(
        process.cwd(),
        'src',
        'mail',
        'templates',
        'timer-complete.ejs',
      );

      const html = await ejs.renderFile(templatePath, {
        employee: data.userId,
        tag: data.tag,
        duration: data.duration,
        actualDuration: data.actualDuration,
        startTime: data.startTime,
        endTime: data.endTime,
        note: data.note,
      });

      await this.transporter.sendMail({
        from: `"WorkHole" <${this.configService.get<string>('EMAIL_USER')}>`,
        to: data.userId.email,
        subject: `✅ Timer Completed - ${data.tag} (${data.actualDuration} min)`,
        html,
      });

      console.log(`Timer completion email sent to ${data.userId.email}`);
    } catch (error) {
      console.error('Error sending timer completion email:', error);
    }
  }

  // Break Email Methods
  async sendBreakStartEmail(data: {
    userId: any;
    breakType: string;
    duration: number;
    startTime: Date;
  }) {
    try {
      const templatePath = join(
        process.cwd(),
        'src',
        'mail',
        'templates',
        'break-start.ejs',
      );

      const html = await ejs.renderFile(templatePath, {
        employee: data.userId,
        breakType: data.breakType,
        duration: data.duration,
        startTime: data.startTime,
      });

      await this.transporter.sendMail({
        from: `"WorkHole" <${this.configService.get<string>('EMAIL_USER')}>`,
        to: data.userId.email,
        subject: `☕ Break Started - ${data.breakType} (${data.duration} min)`,
        html,
      });

      console.log(`Break start email sent to ${data.userId.email}`);
    } catch (error) {
      console.error('Error sending break start email:', error);
    }
  }

  async sendBreakWarningEmail(data: {
    userId: any;
    breakType: string;
    duration: number;
    startTime: Date;
  }) {
    try {
      const templatePath = join(
        process.cwd(),
        'src',
        'mail',
        'templates',
        'break-warning.ejs',
      );

      const html = await ejs.renderFile(templatePath, {
        employee: data.userId,
        breakType: data.breakType,
        duration: data.duration,
        startTime: data.startTime,
      });

      await this.transporter.sendMail({
        from: `"WorkHole" <${this.configService.get<string>('EMAIL_USER')}>`,
        to: data.userId.email,
        subject: `⏰ Break Warning - 1 minute left!`,
        html,
      });

      console.log(`Break warning email sent to ${data.userId.email}`);
    } catch (error) {
      console.error('Error sending break warning email:', error);
    }
  }

  async sendBreakExceedEmail(data: {
    userId: any;
    breakType: string;
    duration: number;
    currentDuration: number;
    startTime: Date;
  }) {
    try {
      const templatePath = join(
        process.cwd(),
        'src',
        'mail',
        'templates',
        'break-exceed.ejs',
      );

      const html = await ejs.renderFile(templatePath, {
        employee: data.userId,
        breakType: data.breakType,
        duration: data.duration,
        currentDuration: data.currentDuration,
        startTime: data.startTime,
      });

      await this.transporter.sendMail({
        from: `"WorkHole" <${this.configService.get<string>('EMAIL_USER')}>`,
        to: data.userId.email,
        subject: `🚨 Break Time Exceeded - Please return to work!`,
        html,
      });

      console.log(`Break exceed email sent to ${data.userId.email}`);
    } catch (error) {
      console.error('Error sending break exceed email:', error);
    }
  }

  async sendBreakEndEmail(data: {
    userId: any;
    breakType: string;
    duration: number;
    actualDuration: number;
    startTime: Date;
    endTime: Date;
  }) {
    try {
      const templatePath = join(
        process.cwd(),
        'src',
        'mail',
        'templates',
        'break-end.ejs',
      );

      const html = await ejs.renderFile(templatePath, {
        employee: data.userId,
        breakType: data.breakType,
        duration: data.duration,
        actualDuration: data.actualDuration,
        startTime: data.startTime,
        endTime: data.endTime,
      });

      await this.transporter.sendMail({
        from: `"WorkHole" <${this.configService.get<string>('EMAIL_USER')}>`,
        to: data.userId.email,
        subject: `✅ Break Completed - Welcome back!`,
        html,
      });

      console.log(`Break end email sent to ${data.userId.email}`);
    } catch (error) {
      console.error('Error sending break end email:', error);
    }
  }
}
