import { Controller, Put, Delete, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateProfile(@Req() req, @Body() updateUserDto: UpdateUserDto) {
    const updatedUser = await this.usersService.updateProfile(req.user.id, updateUserDto);
    const { password, ...userWithoutPassword } = updatedUser;
    return { success: true, user: userWithoutPassword };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  async deleteProfile(@Req() req) {
    await this.usersService.deleteProfile(req.user.id);
    return { success: true, message: 'Cuenta eliminada correctamente' };
  }
}
