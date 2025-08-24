import { Controller, Get, Post, Body, Param, Request, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './notifications.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

export class CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}

@Controller('/api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyNotifications(@Request() req) {
    return this.notificationsService.getUserNotifications(req.user.id);
  }

  @Post()
  async createNotification(@Body() notification: CreateNotificationDto) {
    return this.notificationsService.createNotification(notification);
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }
}