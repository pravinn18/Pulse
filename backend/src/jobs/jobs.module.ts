import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { PostProcessor } from './processors/post.processor';
import { NotificationProcessor } from './processors/notification.processor';

import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    NotificationsModule,

    BullModule.registerQueue({
      name: 'posts',
    }),

    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],

  providers: [PostProcessor, NotificationProcessor],
})
export class JobsModule {}
