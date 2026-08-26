import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreatePostDto } from './dto/create-post.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notificationsGateway: NotificationsGateway,
    @InjectQueue('posts')
    private readonly postsQueue: Queue,
    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue,
  ) {}

  async getFeedPosts(type: string, userId?: string | null) {
    let whereClause: any = {
      OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }],
    };

    if (type === 'following' && userId) {
      const followingRecords = await this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const followingIds = followingRecords.map((f) => f.followingId);
      whereClause = {
        ...whereClause,
        authorId: { in: followingIds },
      };
    }

    const allPosts = await this.prisma.post.findMany({
      where: whereClause,
      include: {
        author: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        poll: {
          include: {
            options: {
              include: { votes: { select: { userId: true } } },
            },
          },
        },
        likes: { select: { userId: true } },
        bookmarks: { select: { userId: true } },
        _count: { select: { likes: true, comments: true } },
      },
      take: 60,
      orderBy: { createdAt: 'desc' },
    });

    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const recentPosts = allPosts.filter(
      (p) => new Date(p.createdAt).getTime() >= twoHoursAgo,
    );
    const olderPosts = allPosts.filter(
      (p) => new Date(p.createdAt).getTime() < twoHoursAgo,
    );

    for (let i = olderPosts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [olderPosts[i], olderPosts[j]] = [olderPosts[j], olderPosts[i]];
    }

    return [...recentPosts, ...olderPosts];
  }

  async createPost(userId: string, createPostDto: CreatePostDto) {
    const { content, imageUrl, scheduledFor, poll, isReel } =
      createPostDto as any;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let parsedPoll: { options: string[]; durationHours: number } | null = null;
    if (poll) {
      try {
        parsedPoll = typeof poll === 'string' ? JSON.parse(poll) : poll;
      } catch {
        throw new BadRequestException('Invalid poll format');
      }
    }

    const post = await this.prisma.post.create({
      data: {
        content: content || '',
        imageUrl,
        isReel: Boolean(isReel),
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        authorId: userId,
        ...(parsedPoll && parsedPoll.options?.length >= 2
          ? {
              poll: {
                create: {
                  expiresAt: new Date(
                    Date.now() +
                      (parsedPoll.durationHours || 24) * 60 * 60 * 1000,
                  ),
                  options: {
                    create: parsedPoll.options.map((opt: string) => ({
                      text: opt,
                    })),
                  },
                },
              },
            }
          : {}),
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
        poll: {
          include: {
            options: {
              include: {
                votes: { select: { userId: true } },
              },
            },
          },
        },
        likes: { select: { userId: true } },
        bookmarks: { select: { userId: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!scheduledFor) {
      await this.redis.deleteByPattern(`feed:${userId}:*`);

      await this.postsQueue.add(
        'new-post',
        { postId: post.id, authorId: userId },
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
      );
    }

    return post;
  }

  async deletePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ConflictException('You cannot delete this post');
    }

    await this.prisma.$transaction([
      this.prisma.postLike.deleteMany({ where: { postId } }),
      this.prisma.postBookmark.deleteMany({ where: { postId } }),
      this.prisma.comment.deleteMany({ where: { postId } }),
      this.prisma.post.delete({ where: { id: postId } }),
    ]);

    await this.redis.deleteByPattern(`feed:${userId}:*`);
    return { message: 'Post deleted successfully', postId };
  }

  async toggleBookmark(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.prisma.postBookmark.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existing) {
      await this.prisma.postBookmark.delete({
        where: { id: existing.id },
      });
      return { bookmarked: false };
    }

    await this.prisma.postBookmark.create({
      data: { userId, postId },
    });
    return { bookmarked: true };
  }

  async getSavedPosts(userId: string) {
    const bookmarks = await this.prisma.postBookmark.findMany({
      where: { userId },
      include: {
        post: {
          include: {
            author: {
              select: { id: true, name: true, username: true, avatarUrl: true },
            },
            likes: { select: { userId: true } },
            bookmarks: { select: { userId: true } },
            _count: { select: { likes: true, comments: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return bookmarks.map((b) => b.post);
  }

  async getLikedPosts(userId: string) {
    const likes = await this.prisma.postLike.findMany({
      where: { userId },
      include: {
        post: {
          include: {
            author: {
              select: { id: true, name: true, username: true, avatarUrl: true },
            },
            likes: { select: { userId: true } },
            bookmarks: { select: { userId: true } },
            _count: { select: { likes: true, comments: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return likes.map((l) => l.post);
  }

  async votePoll(userId: string, optionId: string) {
    const option = await this.prisma.pollOption.findUnique({
      where: { id: optionId },
      include: { poll: { include: { options: true } } },
    });

    if (!option) throw new NotFoundException('Poll option not found');
    if (new Date() > new Date(option.poll.expiresAt)) {
      throw new BadRequestException('This poll has already ended');
    }

    const allOptionIds = option.poll.options.map((o) => o.id);
    const existingVote = await this.prisma.pollVote.findFirst({
      where: { userId, optionId: { in: allOptionIds } },
    });

    if (existingVote) throw new ConflictException('Already voted in this poll');

    await this.prisma.pollVote.create({
      data: { userId, optionId },
    });

    return this.getPost(option.poll.postId);
  }

  async getAllPosts() {
    return this.getFeedPosts('for-you');
  }

  async getUserPosts(userId: string) {
    return this.prisma.post.findMany({
      where: {
        authorId: userId,
        OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }],
      },
      include: {
        author: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        likes: { select: { userId: true } },
        bookmarks: { select: { userId: true } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPost(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        poll: {
          include: {
            options: {
              include: { votes: { select: { userId: true } } },
            },
          },
        },
        likes: { select: { userId: true } },
        bookmarks: { select: { userId: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async createComment(userId: string, postId: string, content: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const comment = await this.prisma.comment.create({
      data: { content, userId, postId },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    });

    this.notificationsGateway.sendNewComment(postId, comment);
    return comment;
  }

  async getComments(postId: string) {
    return this.prisma.comment.findMany({
      where: { postId },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async likePost(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const existingLike = await this.prisma.postLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existingLike) return { message: 'Post already liked' };

    const like = await this.prisma.postLike.create({
      data: { userId, postId },
    });

    return { message: 'Post liked successfully', like };
  }

  async unlikePost(userId: string, postId: string) {
    const existingLike = await this.prisma.postLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (!existingLike) throw new NotFoundException('Post is not liked');

    await this.prisma.postLike.delete({
      where: { userId_postId: { userId, postId } },
    });

    return { message: 'Post unliked successfully' };
  }
}
