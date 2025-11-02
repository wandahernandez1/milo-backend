import { Controller, Put, Delete, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Put('avatar')
  async updateAvatar(@Req() req, @Body() updateAvatarDto: UpdateAvatarDto) {
    const updatedUser = await this.usersService.updateAvatar(
      req.user.id,
      updateAvatarDto.avatar,
    );
    const { password, ...userWithoutPassword } = updatedUser;
    // prioridad de avatar
    const avatarToReturn =
      updatedUser.avatar || updatedUser.googleAvatar || null;
    return {
      success: true,
      user: { ...userWithoutPassword, avatar: avatarToReturn },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateProfile(@Req() req, @Body() updateUserDto: UpdateUserDto) {
    const updatedUser = await this.usersService.updateProfile(
      req.user.id,
      updateUserDto,
    );
    const { password, ...userWithoutPassword } = updatedUser;
    // prioridad de avatar
    const avatarToReturn =
      updatedUser.avatar || updatedUser.googleAvatar || null;
    return {
      success: true,
      user: { ...userWithoutPassword, avatar: avatarToReturn },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  async deleteProfile(@Req() req) {
    await this.usersService.deleteProfile(req.user.id);
    return { success: true, message: 'Cuenta eliminada correctamente' };
  }
}
