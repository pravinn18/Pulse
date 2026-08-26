import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StoriesService } from './stories.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@UseGuards(JwtAuthGuard)
@Controller('stories')
export class StoriesController {
  constructor(
    private readonly storiesService: StoriesService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('feed')
  getFeedStories(@Req() req: Request) {
    const user = (req as any).user;
    return this.storiesService.getFeedStories(user.id || user.sub);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('media', {
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  async createStory(
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
    @Body('caption') caption?: string,
  ) {
    const user = (req as any).user;
    if (!file) {
      throw new BadRequestException('Media file is required');
    }

    const upload = await this.cloudinaryService.uploadImage(
      file,
      'pulse_stories',
    );

    return this.storiesService.createStory(
      user.id || user.sub,
      upload.secure_url,
      caption,
    );
  }

  @Post(':id/view')
  viewStory(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.storiesService.viewStory(user.id || user.sub, id);
  }

  @Post(':id/like')
  likeStory(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.storiesService.toggleLikeStory(user.id || user.sub, id);
  }

  @Delete(':id')
  deleteStory(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.storiesService.deleteStory(id, user.id || user.sub);
  }
}
