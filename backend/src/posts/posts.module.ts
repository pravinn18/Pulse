import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PostsProcessor } from './posts.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    NotificationsModule,
    CloudinaryModule,
    BullModule.registerQueue({ name: 'posts' }, { name: 'notifications' }),
  ],
  controllers: [PostsController],
  providers: [PostsService, PostsProcessor],
  exports: [PostsService],
})
export class PostsModule {}
