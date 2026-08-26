import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        process.env.FRONTEND_URL,
      ].filter(Boolean) as string[];

      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private static userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.query?.token as string);

      if (!token) return;

      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub || payload.id;
      if (!userId) return;

      socket.data.userId = userId;
      socket.join(`user:${userId}`);

      if (!NotificationsGateway.userSockets.has(userId)) {
        NotificationsGateway.userSockets.set(userId, new Set());
      }
      NotificationsGateway.userSockets.get(userId)?.add(socket.id);

      
      await this.prisma.user.update({
        where: { id: userId },
        data: { isOnline: true },
      });

      this.server.emit('user:presence-change', {
        userId,
        isOnline: true,
        lastSeen: new Date().toISOString(),
      });
    } catch {}
  }

  async handleDisconnect(socket: Socket) {
    const userId = socket.data?.userId;
    if (!userId) return;

    const userSocketSet = NotificationsGateway.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.delete(socket.id);
      if (userSocketSet.size === 0) {
        NotificationsGateway.userSockets.delete(userId);

        const now = new Date();
        await this.prisma.user.update({
          where: { id: userId },
          data: { isOnline: false, lastSeen: now },
        });

        this.server.emit('user:presence-change', {
          userId,
          isOnline: false,
          lastSeen: now.toISOString(),
        });
      }
    }
  }

  @SubscribeMessage('chat:join-room')
  handleJoinChatRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() conversationId: string,
  ) {
    socket.join(`chat:${conversationId}`);
  }

  @SubscribeMessage('chat:leave-room')
  handleLeaveChatRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() conversationId: string,
  ) {
    socket.leave(`chat:${conversationId}`);
  }

  @SubscribeMessage('chat:typing-start')
  handleTypingStart(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string; username: string },
  ) {
    const userId = socket.data?.userId;
    socket.to(`chat:${data.conversationId}`).emit('chat:user-typing', {
      conversationId: data.conversationId,
      userId,
      username: data.username,
      isTyping: true,
    });
  }

  @SubscribeMessage('chat:typing-stop')
  handleTypingStop(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = socket.data?.userId;
    socket.to(`chat:${data.conversationId}`).emit('chat:user-typing', {
      conversationId: data.conversationId,
      userId,
      isTyping: false,
    });
  }

  @SubscribeMessage('chat:mark-seen')
  async handleMarkSeen(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = socket.data?.userId;
    if (!userId || !data.conversationId) return;

    await this.prisma.message.updateMany({
      where: {
        conversationId: data.conversationId,
        senderId: { not: userId },
        status: { not: 'READ' },
      },
      data: { status: 'READ' },
    });

    this.server.to(`chat:${data.conversationId}`).emit('chat:seen-receipt', {
      conversationId: data.conversationId,
      seenByUserId: userId,
      seenAt: new Date().toISOString(),
    });
  }

  sendDirectMessage(conversationId: string, message: any) {
    this.server
      .to(`chat:${conversationId}`)
      .emit(`chat:${conversationId}`, message);
    this.server.emit('new-direct-message', message);
  }

  sendNotification(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('new-notification', notification);
  }

  sendNewComment(postId: string, comment: any) {
    this.server.to(`post:${postId}`).emit('new-comment', comment);
  }
}
