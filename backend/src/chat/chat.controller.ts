import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('conversations')
  async getUserConversations(@Req() request: Request) {
    const user = (request as any).user;
    return this.chatService.getUserConversations(user.id || user.sub);
  }

  @Post('conversations/user/:targetUserId')
  async getOrCreateConversation(
    @Param('targetUserId') targetUserId: string,
    @Req() request: Request,
  ) {
    const user = (request as any).user;
    return this.chatService.getOrCreateConversation(
      user.id || user.sub,
      targetUserId,
    );
  }

  @Post('groups')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  async createGroup(
    @Body('name') name: string,
    @Body('memberIds') memberIdsStr: string,
    @Req() request: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const user = (request as any).user;
    let groupAvatarUrl: string | undefined = undefined;
    if (file) {
      const upload = await this.cloudinaryService.uploadImage(
        file,
        'pulse_groups',
      );
      groupAvatarUrl = upload.secure_url;
    }

    let memberIds: string[] = [];
    try {
      memberIds = JSON.parse(memberIdsStr || '[]');
    } catch {
      memberIds = [];
    }

    return this.chatService.createGroup(user.id || user.sub, {
      name,
      memberIds,
      groupAvatarUrl,
    });
  }

  @Delete('conversations/:conversationId')
  async deleteConversation(
    @Param('conversationId') conversationId: string,
    @Req() request: Request,
  ) {
    const user = (request as any).user;
    return this.chatService.deleteConversationForUser(
      user.id || user.sub,
      conversationId,
    );
  }

  @Get('conversations/:conversationId/messages')
  async getConversationMessages(
    @Param('conversationId') conversationId: string,
    @Req() request: Request,
  ) {
    const user = (request as any).user;
    return this.chatService.getConversationMessages(
      user.id || user.sub,
      conversationId,
    );
  }

  @Post('messages')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB chunk for fast chat video/image uploads
    }),
  )
  async sendMessage(
    @Body('conversationId') conversationId: string,
    @Body('content') content: string,
    @Body('replyToId') replyToId?: string,
    @Req() request?: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const user = (request as any).user;
    let mediaUrl: string | undefined = undefined;
    let mediaType: string | undefined = undefined;

    if (file) {
      const upload = await this.cloudinaryService.uploadImage(
        file,
        'pulse_chat',
      );
      mediaUrl = upload.secure_url;
      mediaType = file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE';
    }

    return this.chatService.sendMessage(user.id || user.sub, {
      conversationId,
      content,
      mediaUrl,
      mediaType,
      replyToId,
    });
  }

  @Patch('messages/:id')
  async editMessage(
    @Param('id') id: string,
    @Body('content') content: string,
    @Req() request: Request,
  ) {
    const user = (request as any).user;
    return this.chatService.editMessage(user.id || user.sub, id, content);
  }

  @Delete('messages/:id')
  async deleteMessage(@Param('id') id: string, @Req() request: Request) {
    const user = (request as any).user;
    return this.chatService.deleteMessage(user.id || user.sub, id);
  }

  @Post('messages/:id/react')
  async react(
    @Param('id') id: string,
    @Body('emoji') emoji: string,
    @Req() request: Request,
  ) {
    const user = (request as any).user;
    return this.chatService.toggleReaction(user.id || user.sub, id, emoji);
  }
}
