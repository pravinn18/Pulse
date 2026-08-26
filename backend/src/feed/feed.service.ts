import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getFollowingFeed(userId: string, cursor?: string, limit: number = 10) {
    const cacheKey = `feed:${userId}:${cursor ?? 'start'}:${limit}`;

    
    const cachedFeed = await this.redis.get(cacheKey);
    if (cachedFeed) {
      return JSON.parse(cachedFeed);
    }

  
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map((follow) => follow.followingId);
    followingIds.push(userId);

  
    const posts = await this.prisma.post.findMany({
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      where: {
        authorId: { in: followingIds },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const hasNextPage = posts.length > limit;
    const feedPosts = hasNextPage ? posts.slice(0, limit) : posts;
    const nextCursor = hasNextPage ? feedPosts[feedPosts.length - 1].id : null;

    const result = {
      posts: feedPosts,
      nextCursor,
      hasNextPage,
    };

    
    await this.redis.set(cacheKey, JSON.stringify(result), 60);

    return result;
  }
}
