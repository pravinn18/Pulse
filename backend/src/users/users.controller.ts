import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('search/query')
  search(@Query('q') query: string) {
    return this.usersService.searchExplore(query);
  }

  @Get('suggested/explore')
  getSuggestedUsers(@Req() request: Request) {
    const userId = (request.user as any)?.id;
    return this.usersService.getSuggestedUsers(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('settings/privacy')
  updateSettings(
    @Req() request: Request,
    @Body()
    body: {
      isPrivate?: boolean;
      allowDMsFromAnyone?: boolean;
      notifyLikes?: boolean;
      notifyComments?: boolean;
      notifyFollows?: boolean;
      notifyMentions?: boolean;
    },
  ) {
    return this.usersService.updateSettings(request.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('settings/password')
  changePassword(
    @Req() request: Request,
    @Body() body: { currentPass: string; newPass: string },
  ) {
    return this.usersService.changePassword(request.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('settings/account')
  deleteAccount(@Req() request: Request) {
    return this.usersService.deleteAccount(request.user.id);
  }
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @UseInterceptors(FileInterceptor('avatar'))
  async updateProfile(
    @Req() request: Request,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() avatarFile?: Express.Multer.File,
  ) {
    let avatarUrl = updateProfileDto.avatarUrl;

    if (avatarFile) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        avatarFile,
        'pulse_avatars',
      );
      avatarUrl = uploadResult.secure_url;
    }

    return this.usersService.updateProfile(request.user.id, {
      ...updateProfileDto,
      avatarUrl,
    });
  }

  @Get(':username')
  getProfile(@Param('username') username: string) {
    return this.usersService.getProfile(username);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  followUser(@Param('id') userId: string, @Req() request: Request) {
    return this.usersService.followUser(request.user.id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/follow')
  unfollowUser(@Param('id') userId: string, @Req() request: Request) {
    return this.usersService.unfollowUser(request.user.id, userId);
  }

  @Get(':id/followers')
  getFollowers(@Param('id') userId: string) {
    return this.usersService.getFollowers(userId);
  }

  @Get(':id/following')
  getFollowing(@Param('id') userId: string) {
    return this.usersService.getFollowing(userId);
  }
}
