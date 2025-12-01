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
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';

//  DTO para refrescar token
class RefreshDto {
  @IsString()
  refresh_token: string;
}

//  DTO para login con Google
class GoogleTokenDto {
  @IsString()
  token: string;
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

  //  Login con Google
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
  async getProfile(@Request() req) {
    // Cargar usuario con relaciones de tasks y notes
    const userWithRelations = await this.authService.getUserWithRelations(
      req.user.id,
    );
    const { password, ...user } = userWithRelations;
    // Aplicar lógica de prioridad de avatar
    const avatarToReturn = user.avatar || user.googleAvatar || null;
    return {
      ...user,
      avatar: avatarToReturn,
      hasPassword: !!userWithRelations.password,
    };
  }

  // Logout
  @Post('logout')
  async logout() {
    return this.authService.logout();
  }

  // Solicita recuperacion de contraseña
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  // Restablecer contraseña con token
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  // Establecer contraseña para usuarios sin contraseña (registrados con Google)
  @UseGuards(JwtAuthGuard)
  @Post('set-password')
  async setPassword(@Request() req, @Body() setPasswordDto: SetPasswordDto) {
    return this.authService.setPassword(req.user.id, setPasswordDto.password);
  }
}
