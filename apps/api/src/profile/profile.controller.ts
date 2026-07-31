import { BadRequestException, Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

// ~700KB of base64 text, comfortably covering a 500KB image with encoding overhead.
const MAX_PROFILE_PICTURE_LENGTH = 700_000;

@Controller('api/v1/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getProfile(user.userId);
  }

  @Put()
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    if (dto.profilePictureUrl && dto.profilePictureUrl.length > MAX_PROFILE_PICTURE_LENGTH) {
      throw new BadRequestException('Profile picture is too large — please use an image under 500KB.');
    }
    return this.profileService.upsertProfile(user.userId, dto);
  }
}
