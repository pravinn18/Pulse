import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsService } from './posts.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  getAllPosts(@Query('type') type?: string, @Req() request?: Request) {
    const user = (request as any)?.user;
    const userId = user?.id || user?.sub || null;
    return this.postsService.getFeedPosts(type || 'for-you', userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('saved')
  getSavedPosts(@Req() request: Request) {
    const user = (request as any).user;
    return this.postsService.getSavedPosts(user.id || user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('liked')
  getLikedPosts(@Req() request: Request) {
    const user = (request as any).user;
    return this.postsService.getLikedPosts(user.id || user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  getHistoryPosts(@Req() request: Request) {
    const user = (request as any).user;
    return this.postsService.getLikedPosts(user.id || user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 150 * 1024 * 1024 }, // 150MB upload limit for HD Reels
    }),
  )
  async createPost(
    @Body() createPostDto: CreatePostDto,
    @Req() request: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const user = (request as any).user;
    const userId = user.id || user.sub;
    let imageUrl = createPostDto.imageUrl;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        file,
        'pulse_posts',
      );
      imageUrl = uploadResult.secure_url;
    }

    return this.postsService.createPost(userId, {
      ...createPostDto,
      imageUrl,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/bookmark')
  toggleBookmark(@Param('id') postId: string, @Req() request: Request) {
    const user = (request as any).user;
    return this.postsService.toggleBookmark(user.id || user.sub, postId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  likePost(@Param('id') postId: string, @Req() request: Request) {
    const user = (request as any).user;
    return this.postsService.likePost(user.id || user.sub, postId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/like')
  unlikePost(@Param('id') postId: string, @Req() request: Request) {
    const user = (request as any).user;
    return this.postsService.unlikePost(user.id || user.sub, postId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('poll/vote/:optionId')
  votePoll(@Param('optionId') optionId: string, @Req() request: Request) {
    const user = (request as any).user;
    return this.postsService.votePoll(user.id || user.sub, optionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  createComment(
    @Param('id') postId: string,
    @Body() body: CreateCommentDto,
    @Req() request: Request,
  ) {
    const user = (request as any).user;
    return this.postsService.createComment(
      user.id || user.sub,
      postId,
      body.content,
    );
  }

  @Get(':id/comments')
  getComments(@Param('id') postId: string) {
    return this.postsService.getComments(postId);
  }

  @Get('user/:userId')
  getUserPosts(@Param('userId') userId: string) {
    return this.postsService.getUserPosts(userId);
  }

  @Get(':id')
  getPost(@Param('id') postId: string) {
    return this.postsService.getPost(postId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deletePost(@Param('id') postId: string, @Req() request: Request) {
    const user = (request as any).user;
    return this.postsService.deletePost(postId, user.id || user.sub);
  }
}
