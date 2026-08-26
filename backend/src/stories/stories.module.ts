import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    CloudinaryModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [StoriesController],
  providers: [StoriesService],
  exports: [StoriesService],
})
export class StoriesModule {}
