import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getNotifications(@Req() request: Request) {
    return this.notificationsService.getNotifications(request.user.id);
  }

  @Get('unread-count')
  getUnreadCount(@Req() request: Request) {
    return this.notificationsService.getUnreadCount(request.user.id);
  }

  @Patch('read-all')
  markAllAsRead(@Req() request: Request) {
    return this.notificationsService.markAllAsRead(request.user.id);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') notificationId: string, @Req() request: Request) {
    return this.notificationsService.markAsRead(
      notificationId,
      request.user.id,
    );
  }
}
