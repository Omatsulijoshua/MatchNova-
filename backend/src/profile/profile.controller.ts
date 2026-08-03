import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import {
  CreateProfileDto,
  UpdateProfileDto,
  ProfileSearchQueryDto,
} from './dto/profile.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('profiles')
@UseGuards(AuthGuard('jwt'))
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  async getMe(@Request() req: { user: { id: string } }) {
    return this.profileService.getProfile(req.user.id);
  }

  @Post('me')
  async createMe(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateProfileDto,
  ) {
    return this.profileService.createProfile(req.user.id, dto);
  }

  @Put('me')
  async updateMe(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(req.user.id, dto);
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Request() req: { user: { id: string } },
    @Query() query: ProfileSearchQueryDto,
  ) {
    return this.profileService.searchProfiles(req.user.id, query);
  }
}
