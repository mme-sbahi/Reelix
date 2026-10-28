import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current user (same data as /auth/profile)' })
  async getMe(@CurrentUser('userId') userId: string) {
    const user = await this.usersService.findByIdOrThrow(userId);
    // class-transformer strips passwordHash/hashedRefreshToken via
    // @Exclude() + the global ClassSerializerInterceptor from main.ts
    return user;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update your own profile' })
  updateMe(@CurrentUser('userId') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }
  @Get()
  @ApiOperation({ summary: 'List all users (id + username only)' })
  listUsers() {
    return this.usersService.listUsers();
  }

  @Get(':id')
  @ApiOperation({ summary: "View a user's public profile" })
  getUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') requestingUserId: string,
  ) {
    return this.usersService.getPublicProfile(id, requestingUserId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update your own profile' })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') requestingUserId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    if (id !== requestingUserId) {
      throw new ForbiddenException("You can only update your own profile");
    }
    return this.usersService.updateProfile(id, dto);
  }
}