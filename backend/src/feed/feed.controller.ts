import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeedService } from './feed.service';

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getFeed(
    @Req() request: Request,

    @Query('cursor')
    cursor: string | undefined,

    @Query('limit', new DefaultValuePipe(10), ParseIntPipe)
    limit: number,
  ) {
    if (limit > 50) {
      throw new BadRequestException('Maximum limit is 50');
    }

    return this.feedService.getFollowingFeed(request.user.id, cursor, limit);
  }
}
