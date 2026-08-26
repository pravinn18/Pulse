import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async createNotification(data: {
    type: 'FOLLOW' | 'LIKE' | 'COMMENT' | 'MENTION';
    message: string;
    recipientId: string;
    actorId: string;
    postId?: string;
  }) {
    if (data.recipientId === data.actorId) {
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: {
        type: data.type,
        message: data.message,
        recipientId: data.recipientId,
        actorId: data.actorId,
        postId: data.postId,
      },
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            content: true,
          },
        },
      },
    });

    this.gateway.sendNotification(data.recipientId, notification);
    return notification;
  }

  async getNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: {
        recipientId: userId,
      },
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            content: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });
    return { count };
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        recipientId: userId,
      },
      data: {
        isRead: true,
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        recipientId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }
}
