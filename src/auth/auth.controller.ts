import {
  Controller,
  Post,
  Body,
  Get,
  Request,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IsString } from 'class-validator';
import { LoginDto } from './dto/login.dto';

class RefreshDto {
  @IsString()
  refresh_token: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }
@Post('login')
  async login(@Body() loginDto: LoginDto) {
    try {
      const user = await this.authService.validateUser(
        loginDto.email,
        loginDto.password,
      );
      return this.authService.login(user);
    } catch (err) {
      throw new UnauthorizedException(
        err.message || 'Email o contraseña incorrectos',
      );
    }
  }


  @Post('refresh')
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refreshToken(refreshDto.refresh_token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    const { password, ...user } = req.user;
    return user;
  }

  @Post('logout')
  async logout() {
    return this.authService.logout();
  }
}
