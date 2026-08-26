import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Processor('posts')
export class PostProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super();
  }

  async process(job: Job) {
    console.log(`Processing job: ${job.name}`);

    console.log('Job data:', job.data);

    if (job.name === 'new-post') {
      await this.handleNewPost(job);
    }
  }

  private async handleNewPost(job: Job) {
    const { postId, authorId } = job.data;

    console.log(`Processing new post: ${postId}`);

   
    const followers = await this.prisma.follow.findMany({
      where: {
        followingId: authorId,
      },

      select: {
        followerId: true,
      },
    });

    console.log(`Found ${followers.length} followers`);

   
    for (const follower of followers) {
      const deleted = await this.redis.deleteByPattern(
        `feed:${follower.followerId}:*`,
      );

      console.log(
        `Invalidated feed for ${follower.followerId}: ${deleted} cache keys`,
      );
    }

    console.log(`New post processed: ${postId}`);
  }
}
