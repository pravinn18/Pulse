import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationType } from '@prisma/client';

interface NotificationJobData {
  type: NotificationType;
  message: string;
  recipientId: string;
  actorId: string;
  postId?: string;
}

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { type, message, recipientId, actorId, postId } = job.data;

   
    if (recipientId === actorId) return;

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, name: true, username: true, avatarUrl: true },
    });

    if (!actor) return;

    
    const notification = await this.prisma.notification.create({
      data: {
        type,
        message,
        recipientId,
        actorId,
        postId,
      },
      include: {
        actor: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        post: {
          select: { id: true, content: true },
        },
      },
    });

   
    this.notificationsGateway.sendNotification(recipientId, notification);
  }
}
