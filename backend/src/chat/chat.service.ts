import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async createGroup(
    adminId: string,
    dto: { name: string; memberIds: string[]; groupAvatarUrl?: string },
  ) {
    const participantIds = Array.from(new Set([adminId, ...dto.memberIds]));

    const group = await this.prisma.conversation.create({
      data: {
        isGroup: true,
        name: dto.name,
        groupAvatarUrl: dto.groupAvatarUrl || null,
        adminId,
        participants: {
          create: participantIds.map((userId) => ({ userId })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });

    return group;
  }

  async getOrCreateConversation(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new ForbiddenException('Cannot start conversation with yourself');
    }

    try {
      const existing = await this.prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { participants: { some: { userId } } },
            { participants: { some: { userId: targetUserId } } },
          ],
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  avatarUrl: true,
                  bio: true,
                  isOnline: true,
                  lastSeen: true,
                  createdAt: true,
                  _count: {
                    select: { followers: true, following: true },
                  },
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (existing) {
       
        await this.prisma.conversationParticipant.updateMany({
          where: { conversationId: existing.id, userId },
          data: { clearedAt: null },
        });
        return existing;
      }

      return await this.prisma.conversation.create({
        data: {
          isGroup: false,
          participants: {
            create: [{ userId }, { userId: targetUserId }],
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  avatarUrl: true,
                  bio: true,
                  isOnline: true,
                  lastSeen: true,
                  createdAt: true,
                  _count: {
                    select: { followers: true, following: true },
                  },
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    } catch (error) {
      console.error('Error in getOrCreateConversation:', error);
      throw new InternalServerErrorException('Failed to open conversation');
    }
  }

  async getUserConversations(userId: string) {
    try {
      const convs = await this.prisma.conversation.findMany({
        where: {
          participants: {
            some: {
              userId,
              clearedAt: null, 
            },
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  avatarUrl: true,
                  bio: true,
                  isOnline: true,
                  lastSeen: true,
                  createdAt: true,
                  _count: {
                    select: { followers: true, following: true },
                  },
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return convs;
    } catch (error) {
      console.error('Error in getUserConversations:', error);
      throw new InternalServerErrorException('Failed to fetch conversations');
    }
  }

  async getConversationMessages(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: { userId, conversationId },
      },
    });

    if (!participant) throw new ForbiddenException('Access denied');

    
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: 'READ' },
      },
      data: { status: 'READ' },
    });

    return await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(participant.clearedAt
          ? { createdAt: { gt: participant.clearedAt } }
          : {}),
      },
      include: {
        sender: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: { select: { name: true } },
          },
        },
        reactions: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(
    userId: string,
    dto: {
      conversationId: string;
      content: string;
      mediaUrl?: string;
      mediaType?: string;
      replyToId?: string;
    },
  ) {
    const isParticipant = await this.prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: { userId, conversationId: dto.conversationId },
      },
    });

    if (!isParticipant) throw new ForbiddenException('Access denied');

    const message = await this.prisma.message.create({
      data: {
        content: dto.content || '',
        mediaUrl: dto.mediaUrl || null,
        mediaType: dto.mediaType || null,
        senderId: userId,
        conversationId: dto.conversationId,
        status: 'DELIVERED',
        replyToId: dto.replyToId || null,
      },
      include: {
        sender: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: { select: { name: true } },
          },
        },
        reactions: true,
      },
    });

    // Unhide for all participants if someone sent a message
    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId: dto.conversationId },
      data: { clearedAt: null },
    });

    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { updatedAt: new Date() },
    });

    this.notificationsGateway.sendDirectMessage(dto.conversationId, message);

    return message;
  }

  async deleteConversationForUser(userId: string, conversationId: string) {
    await this.prisma.conversationParticipant.updateMany({
      where: { userId, conversationId },
      data: { clearedAt: new Date() },
    });
    return { success: true };
  }

  async deleteMessage(userId: string, messageId: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!msg || msg.senderId !== userId) throw new ForbiddenException();

    await this.prisma.message.delete({ where: { id: messageId } });
    return { success: true };
  }

  async toggleReaction(userId: string, messageId: string, emoji: string) {
    const existing = await this.prisma.messageReaction.findUnique({
      where: {
        userId_messageId_emoji: { userId, messageId, emoji },
      },
    });

    if (existing) {
      await this.prisma.messageReaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.messageReaction.create({
        data: { userId, messageId, emoji },
      });
    }

    return this.prisma.message.findUnique({
      where: { id: messageId },
      include: { reactions: true, sender: true, replyTo: true },
    });
  }

  async editMessage(userId: string, messageId: string, content: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!msg || msg.senderId !== userId) throw new ForbiddenException();

    return this.prisma.message.update({
      where: { id: messageId },
      data: { content, isEdited: true },
    });
  }
}
