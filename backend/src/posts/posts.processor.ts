import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

interface NewPostJobData {
  postId: string;
  authorId: string;
}

@Processor('posts')
export class PostsProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {
    super();
  }

  async process(job: Job<NewPostJobData>): Promise<void> {
    const { postId, authorId } = job.data;

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        likes: { select: { userId: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!post) return;

    await this.redis.deleteByPattern(`feed:${authorId}:*`);

    const followers = await this.prisma.follow.findMany({
      where: { followingId: authorId },
      select: { followerId: true },
    });

    for (const { followerId } of followers) {
      await this.redis.deleteByPattern(`feed:${followerId}:*`);

      
      this.notificationsGateway.server
        ?.to(`user:${followerId}`)
        .emit('new-feed-post', post);
    }
  }
}
