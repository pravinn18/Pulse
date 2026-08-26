import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { FeedModule } from './feed/feed.module';
import { StoriesModule } from './stories/stories.module';
import { NotificationsModule } from './notifications/notifications.module';
import { JobsModule } from './jobs/jobs.module';
import { HealthModule } from './health/health.module';
import { ChatModule } from './chat/chat.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: Number(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          connectTimeout: 20000,
          disconnectTimeout: 5000,
          keepAlive: 5000,
          reconnectOnError(err) {
            const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNABORTED'];
            if (targetErrors.some((target) => err.message.includes(target))) {
              return true;
            }
            return false;
          },
          retryStrategy(times) {
            return Math.min(times * 100, 3000);
          },
        },
      }),
    }),

    PrismaModule,
    RedisModule,
    CloudinaryModule,
    AuthModule,
    UsersModule,
    PostsModule,
    FeedModule,
    StoriesModule,
    NotificationsModule,
    JobsModule,
    HealthModule,
    ChatModule,
  ],
})
export class AppModule {}
