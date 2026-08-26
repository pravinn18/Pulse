import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationsService } from '../../notifications/notifications.service';

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job) {
    console.log(`Processing notification job: ${job.name}`);

    if (job.name === 'create-notification') {
      const notification = await this.notificationsService.createNotification(
        job.data,
      );

      if (notification) {
        console.log('Notification created:', notification.id);
      }

      return notification;
    }
  }
}
