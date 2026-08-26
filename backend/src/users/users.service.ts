import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications')
    private readonly notificationQueue: Queue,
  ) {}

  async searchExplore(query: string) {
    if (!query || query.trim().length === 0) {
      return { users: [], posts: [] };
    }

    const cleanQuery = query.trim();

    const [users, posts] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: cleanQuery, mode: 'insensitive' } },
            { name: { contains: cleanQuery, mode: 'insensitive' } },
            { bio: { contains: cleanQuery, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
          bio: true,
          createdAt: true,
          _count: {
            select: {
              followers: true,
              following: true,
            },
          },
        },
        take: 15,
      }),
      this.prisma.post.findMany({
        where: {
          content: { contains: cleanQuery, mode: 'insensitive' },
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
          likes: { select: { userId: true } },
          bookmarks: { select: { userId: true } },
          poll: {
            include: {
              options: {
                include: {
                  votes: { select: { userId: true } },
                },
              },
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    return { users, posts };
  }

  async getSuggestedUsers(currentUserId?: string) {
    return this.prisma.user.findMany({
      where: {
        ...(currentUserId ? { id: { not: currentUserId } } : {}),
        avatarUrl: { not: null },
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        bio: true,
        followers: currentUserId
          ? {
              where: { followerId: currentUserId },
              select: { id: true },
            }
          : false,
        _count: {
          select: { followers: true, following: true },
        },
      },
      take: 12,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(updateProfileDto.name !== undefined && {
          name: updateProfileDto.name,
        }),
        ...(updateProfileDto.bio !== undefined && {
          bio: updateProfileDto.bio,
        }),
        ...(updateProfileDto.avatarUrl !== undefined && {
          avatarUrl: updateProfileDto.avatarUrl,
        }),
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }

  async getProfile(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        avatarUrl: true,
        isPrivate: true,
        allowDMsFromAnyone: true,
        notifyLikes: true,
        notifyComments: true,
        notifyFollows: true,
        notifyMentions: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateSettings(
    userId: string,
    settingsDto: {
      isPrivate?: boolean;
      allowDMsFromAnyone?: boolean;
      notifyLikes?: boolean;
      notifyComments?: boolean;
      notifyFollows?: boolean;
      notifyMentions?: boolean;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: { ...settingsDto },
      select: {
        id: true,
        name: true,
        username: true,
        isPrivate: true,
        allowDMsFromAnyone: true,
        notifyLikes: true,
        notifyComments: true,
        notifyFollows: true,
        notifyMentions: true,
      },
    });
  }

  async changePassword(
    userId: string,
    dto: { currentPass: string; newPass: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(dto.currentPass, user.password);
    if (!isValid) {
      throw new BadRequestException('Current password does not match');
    }

    if (dto.newPass.length < 6) {
      throw new BadRequestException(
        'New password must be at least 6 characters long',
      );
    }

    const hashed = await bcrypt.hash(dto.newPass, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { message: 'Password updated successfully' };
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'Account permanently deleted' };
  }

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new ConflictException('You cannot follow yourself');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: followingId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      throw new ConflictException('Already following this user');
    }

    const follow = await this.prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });

    if (user.notifyFollows) {
      await this.notificationQueue.add('create-notification', {
        type: 'FOLLOW',
        message: 'started following you',
        recipientId: followingId,
        actorId: followerId,
      });
    }

    return {
      message: 'User followed successfully',
      follow,
    };
  }

  async unfollowUser(followerId: string, followingId: string) {
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (!existingFollow) {
      throw new NotFoundException('You are not following this user');
    }

    await this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    return {
      message: 'User unfollowed successfully',
    };
  }

  async getFollowers(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const followers = await this.prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return followers.map((follow) => follow.follower);
  }

  async getFollowing(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return following.map((follow) => follow.following);
  }
}
