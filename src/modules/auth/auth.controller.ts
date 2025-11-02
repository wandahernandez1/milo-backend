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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IsString } from 'class-validator';
import { LoginDto } from './dto/login.dto';

// ✅ DTO para refrescar token
class RefreshDto {
  @IsString()
  refresh_token: string;
}

// ✅ DTO para login con Google
class GoogleTokenDto {
  @IsString()
  token: string; // 👈 mismo nombre que usa el AuthService
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Registro normal (email/password)
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  // Login tradicional
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

  // ✅ Login con Google
  @Post('google/login')
  async googleLogin(@Body() googleTokenDto: GoogleTokenDto) {
    return this.authService.loginWithGoogle(googleTokenDto.token);
  }

  // Renovar el token
  @Post('refresh')
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refreshToken(refreshDto.refresh_token);
  }

  // Perfil del usuario autenticado
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    const { password, ...user } = req.user;
    return user;
  }

  // Logout
  @Post('logout')
  async logout() {
    return this.authService.logout();
  }
}
