import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  // 🔹 Validar usuario local
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    if (!user.password) {
      throw new UnauthorizedException(
        'Usuario registrado con Google, use el login con Google.',
      );
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid)
      throw new UnauthorizedException('Credenciales inválidas');

    return user;
  }

  // 🔹 Iniciar sesión (local o Google)
  async login(user: User) {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRATION'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION'),
    });

    // 🔑 Lógica de prioridad de avatar:
    // 1️⃣ Si tiene avatar personalizado → usarlo
    // 2️⃣ Si no, pero tiene googleAvatar → usar ese
    // 3️⃣ Si no tiene ninguno → null
    const avatarToReturn = user.avatar || user.googleAvatar || null;

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: avatarToReturn,
        googleConnected: user.googleConnected ?? false,
      },
    };
  }

  // 🔹 Registro local
  async register(userDto: any) {
    const user = await this.usersService.create(userDto);
    return this.login(user);
  }

  // 🔹 Renovar token JWT
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.findOneById(payload.sub);
      return this.login(user);
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  // 🔹 Logout (client-side)
  async logout() {
    return {
      message: 'Sesión cerrada correctamente (el token se borra en cliente).',
    };
  }

  // 🔹 Login con Google
  async loginWithGoogle(token: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload) throw new UnauthorizedException('Token de Google inválido');

      const email = payload.email || '';
      const name = payload.name || 'Usuario';
      const picture = payload.picture || null;

      if (!email)
        throw new UnauthorizedException(
          'Google no proporcionó un email válido.',
        );

      let user = await this.usersService.findOneByEmail(email);

      if (!user) {
        user = await this.usersService.create({
          name,
          email,
          password: undefined,
          googleAvatar: picture, // ✅ guardamos el avatar de Google en googleAvatar
        });
      } else if (picture && user.googleAvatar !== picture) {
        // ✅ Si el usuario ya existe, actualizamos su googleAvatar si cambió
        user = await this.usersService.updateGoogleAvatar(user.id, picture);
      }

      return this.login(user);
    } catch (e) {
      console.error('❌ ERROR DE VALIDACIÓN DE GOOGLE ID TOKEN:', e);
      throw new UnauthorizedException('Error en autenticación con Google');
    }
  }
}
