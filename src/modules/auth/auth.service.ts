import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  //  Valida usuario local
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    if (!user.password) {
      throw new UnauthorizedException(
        'Usuario registrado con Google. Puedes establecer una contraseña desde tu perfil o usar el login con Google.',
      );
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid)
      throw new UnauthorizedException('Credenciales inválidas');

    return user;
  }

  //  Iniciar sesión (local o Google)
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

  //  Registro local
  async register(userDto: any) {
    const user = await this.usersService.create(userDto);
    return this.login(user);
  }

  //  Renovar token JWT
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

  //  Logout
  async logout() {
    return {
      message: 'Sesión cerrada correctamente (el token se borra en cliente).',
    };
  }

  //  Login con Google
  async loginWithGoogle(token: string) {
    try {
      if (!token) {
        console.error('❌ No se recibió token de Google');
        throw new UnauthorizedException('Token de Google no proporcionado');
      }

      // Valida que exista GOOGLE_CLIENT_ID
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      if (!clientId) {
        console.error(
          '❌ GOOGLE_CLIENT_ID no configurado en variables de entorno',
        );
        throw new UnauthorizedException(
          'Configuración de Google no disponible',
        );
      }

      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        console.error('❌ Payload de Google vacío');
        throw new UnauthorizedException('Token de Google inválido');
      }

      const email = payload.email || '';
      const name = payload.name || 'Usuario';
      const picture = payload.picture || null;

      if (!email) {
        console.error('❌ Google no proporcionó email');
        throw new UnauthorizedException(
          'Google no proporcionó un email válido.',
        );
      }

      let user = await this.usersService.findOneByEmail(email);

      if (!user) {
        user = await this.usersService.create({
          name,
          email,
          password: undefined,
          googleAvatar: picture,
        });
      } else if (picture && user.googleAvatar !== picture) {
        user = await this.usersService.updateGoogleAvatar(user.id, picture);
      }

      return this.login(user);
    } catch (e) {
      console.error('❌ ERROR DE VALIDACIÓN DE GOOGLE ID TOKEN:', e);
      console.error('❌ Tipo de error:', e.constructor.name);
      console.error('❌ Mensaje:', e.message);

      if (e.message?.includes('Token used too early')) {
        throw new UnauthorizedException(
          'Token de Google no válido aún (problema de reloj)',
        );
      }
      if (e.message?.includes('Token used too late')) {
        throw new UnauthorizedException('Token de Google expirado');
      }
      if (e.message?.includes('Invalid token signature')) {
        throw new UnauthorizedException('Firma de token de Google inválida');
      }
      if (e.message?.includes('Wrong number of segments')) {
        throw new UnauthorizedException('Formato de token de Google inválido');
      }

      throw new UnauthorizedException(
        e.message || 'Error en autenticación con Google',
      );
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      console.log('🔐 [forgotPassword] Iniciando proceso para:', email);

      const user = await this.usersService.findOneByEmail(email);

      if (!user) {
        console.log('⚠️ [forgotPassword] Usuario no encontrado:', email);
        return {
          message: 'Si el correo existe, recibirás un enlace de recuperación.',
        };
      }

      // Permitir recuperación incluso si no tiene contraseña
      // Esto permite a usuarios de Google establecer una contraseña
      console.log('📧 [forgotPassword] Procesando solicitud para:', email);
      console.log('🔐 Usuario tiene contraseña:', !!user.password);

      // Generar token de recuperacion
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      console.log('💾 [forgotPassword] Guardando token en BD...');
      // Guarda token hasheado en la base de datos
      await this.usersService.saveResetPasswordToken(
        user.id,
        hashedToken,
        expiresAt,
      );

      console.log('🔐 Token guardado en BD, procediendo a enviar email...');
      console.log('📧 Email destino:', email);
      console.log(
        '🎫 Token generado (primeros 10 chars):',
        resetToken.substring(0, 10) + '...',
      );

      // Enviar email de recuperación usando SendGrid
      console.log('📨 [forgotPassword] Enviando email con SendGrid...');
      const emailResult = await this.emailService.sendPasswordResetEmail(
        email,
        resetToken,
        !user.password, // Indica si es primera vez estableciendo contraseña
      );

      if (!emailResult.success) {
        console.error(
          '❌ [forgotPassword] Error al enviar email:',
          emailResult.error,
        );

        // Limpiar el token de la BD ya que no se pudo enviar el email
        await this.usersService.saveResetPasswordToken(
          user.id,
          null as any,
          null as any,
        );

        throw new BadRequestException(
          'No se pudo enviar el email de recuperación. Por favor, verifica que tu email esté registrado correctamente o intenta más tarde.',
        );
      }

      return {
        message:
          'Si el correo electrónico está registrado, recibirás un enlace de recuperación. Por favor, revisa tu bandeja de entrada y carpeta de spam.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      console.error(' [forgotPassword] Error inesperado:', error);
      console.error(' [forgotPassword] Stack:', error.stack);

      throw new BadRequestException(
        'Ocurrió un error al procesar tu solicitud. Por favor, intenta nuevamente más tarde.',
      );
    }
  }

  //  Restablece contraseña con token
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Busca usuario con token valido y no expirado
    const user = await this.usersService.findByValidResetToken(hashedToken);

    if (!user) {
      throw new BadRequestException(
        'Token inválido o expirado. Solicita un nuevo enlace de recuperación.',
      );
    }

    // Actualiza contraseña y limpiar token
    await this.usersService.updatePassword(user.id, newPassword);

    return { message: 'Contraseña actualizada correctamente.' };
  }

  // Establece contraseña para usuarios que no tienen (registrados con Google)
  async setPassword(
    userId: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    await this.usersService.setPassword(userId, newPassword);
    return {
      message:
        'Contraseña establecida correctamente. Ahora puedes iniciar sesión con email y contraseña.',
    };
  }
}
