import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class StoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue,
  ) {}

  async createStory(userId: string, mediaUrl: string, caption?: string) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const story = await this.prisma.story.create({
      data: {
        userId,
        mediaUrl,
        caption,
        expiresAt,
      },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    });

    this.notificationsGateway.server.emit('new-story-posted', {
      user: story.user,
      story: {
        id: story.id,
        mediaUrl: story.mediaUrl,
        caption: story.caption,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        viewCount: 0,
        likeCount: 0,
        isViewed: false,
        isLiked: false,
        viewers: [],
        likers: [],
      },
    });

    return story;
  }

  async deleteStory(storyId: string, userId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true, userId: true },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.userId !== userId) {
      throw new ForbiddenException('You cannot delete this story');
    }

    await this.prisma.$transaction([
      this.prisma.storyViewer.deleteMany({ where: { storyId } }),
      this.prisma.storyLike.deleteMany({ where: { storyId } }),
      this.prisma.story.delete({ where: { id: storyId } }),
    ]);

    this.notificationsGateway.server.emit('story-deleted-live', {
      storyId,
      userId,
    });

    return { message: 'Story deleted successfully', storyId };
  }

  async getFeedStories(userId: string) {
    const now = new Date();

    const followedAccounts = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const targetUserIds = [
      userId,
      ...followedAccounts.map((f) => f.followingId),
    ];

    const activeStories = await this.prisma.story.findMany({
      where: {
        userId: { in: targetUserIds },
        expiresAt: { gt: now },
      },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        viewers: {
          include: {
            user: {
              select: { id: true, name: true, username: true, avatarUrl: true },
            },
          },
          orderBy: { viewedAt: 'desc' },
        },
        likes: {
          include: {
            user: {
              select: { id: true, name: true, username: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = new Map<string, any>();

    for (const story of activeStories) {
      const u = story.user;
      if (!grouped.has(u.id)) {
        grouped.set(u.id, {
          user: u,
          stories: [],
          hasUnviewed: false,
        });
      }

      const isViewed = story.viewers.some((v) => v.userId === userId);
      const isLiked = story.likes.some((l) => l.userId === userId);
      const isOwner = u.id === userId;

      if (!isViewed && !isOwner) {
        grouped.get(u.id).hasUnviewed = true;
      }

      grouped.get(u.id).stories.push({
        id: story.id,
        mediaUrl: story.mediaUrl,
        caption: story.caption,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        viewCount: story.viewers.length,
        likeCount: story.likes.length,
        isViewed,
        isLiked,
        viewers: isOwner
          ? story.viewers.map((v) => ({
              id: v.user.id,
              name: v.user.name,
              username: v.user.username,
              avatarUrl: v.user.avatarUrl,
              viewedAt: v.viewedAt,
            }))
          : [],
        likers: isOwner
          ? story.likes.map((l) => ({
              id: l.user.id,
              name: l.user.name,
              username: l.user.username,
              avatarUrl: l.user.avatarUrl,
            }))
          : [],
      });
    }

    return Array.from(grouped.values());
  }

  async viewStory(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    });

    if (!story) throw new NotFoundException('Story not found');

    const viewerUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true, avatarUrl: true },
    });

    const existing = await this.prisma.storyViewer.findUnique({
      where: {
        storyId_userId: { storyId, userId },
      },
    });

    if (!existing && viewerUser) {
      await this.prisma.storyViewer.create({
        data: { storyId, userId },
      });

      this.notificationsGateway.server
        .to(`user:${story.userId}`)
        .emit('story-viewed-live', {
          storyId,
          viewer: {
            id: viewerUser.id,
            name: viewerUser.name,
            username: viewerUser.username,
            avatarUrl: viewerUser.avatarUrl,
            viewedAt: new Date().toISOString(),
          },
        });

      if (story.userId !== userId) {
        await this.notificationsQueue.add('create-notification', {
          type: 'STORY_VIEW',
          message: 'viewed your story',
          recipientId: story.userId,
          actorId: userId,
        });
      }
    }

    return { success: true };
  }

  async toggleLikeStory(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) throw new NotFoundException('Story not found');

    const likerUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true, avatarUrl: true },
    });

    const existing = await this.prisma.storyLike.findUnique({
      where: {
        storyId_userId: { storyId, userId },
      },
    });

    let liked = false;
    if (existing) {
      await this.prisma.storyLike.delete({
        where: { id: existing.id },
      });
      liked = false;
    } else {
      await this.prisma.storyLike.create({
        data: { storyId, userId },
      });
      liked = true;

      if (story.userId !== userId) {
        await this.notificationsQueue.add('create-notification', {
          type: 'STORY_LIKE',
          message: 'liked your story',
          recipientId: story.userId,
          actorId: userId,
        });
      }
    }

    if (likerUser) {
      this.notificationsGateway.server
        .to(`user:${story.userId}`)
        .emit('story-liked-live', {
          storyId,
          liked,
          liker: {
            id: likerUser.id,
            name: likerUser.name,
            username: likerUser.username,
            avatarUrl: likerUser.avatarUrl,
          },
        });
    }

    return { liked };
  }
}
