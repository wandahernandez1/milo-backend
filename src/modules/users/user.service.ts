import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User } from './user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

type UserCreateInput =
  | CreateUserDto
  | (Partial<CreateUserDto> & {
      avatar?: string | null;
      googleAvatar?: string | null;
    });

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  // Marca usuario como conectado a Google
  async markUserAsConnected(userId: string): Promise<User> {
    const user = await this.findOneById(userId);
    user.googleConnected = true;
    return this.usersRepository.save(user);
  }

  // Busca por email
  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  //  Busca por ID
  async findOneById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  //  Busca por ID con relaciones (tasks y notes)
  async findOneByIdWithRelations(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['tasks', 'notes'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  //  Crea usuario (con soporte para login Google sin contraseña)
  async create(userDto: UserCreateInput): Promise<User> {
    if (!userDto.email) {
      throw new ConflictException('El email es obligatorio.');
    }

    const existingUser = await this.findOneByEmail(userDto.email);
    if (existingUser) {
      throw new ConflictException('Este email ya está registrado.');
    }

    let hashedPassword: string | null = null;
    if ('password' in userDto && userDto.password) {
      const salt = await bcrypt.genSalt();
      hashedPassword = await bcrypt.hash(userDto.password, salt);
    }

    const dataToCreate: Partial<User> = {
      name: userDto.name,
      email: userDto.email,
      password: hashedPassword,
      avatar: userDto.avatar ?? null,
      googleAvatar: 'googleAvatar' in userDto ? userDto.googleAvatar : null,
      googleConnected: false,
    };

    const newUser = this.usersRepository.create(dataToCreate);
    return this.usersRepository.save(newUser);
  }

  //  Actualiza tokens de Google Calendar
  async updateGoogleCalendarTokens(userId: string, tokens: any): Promise<User> {
    const user = await this.findOneById(userId);

    const expiryDate = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    user.googleCalendarAccessToken = tokens.access_token;
    user.googleCalendarRefreshToken =
      tokens.refresh_token || user.googleCalendarRefreshToken;
    user.googleCalendarTokenExpiryDate = expiryDate;
    user.googleConnected = true;

    return this.usersRepository.save(user);
  }

  // Desconecta Google Calendar
  async disconnectGoogleCalendar(userId: string): Promise<User> {
    const user = await this.findOneById(userId);

    user.googleConnected = false;
    user.googleCalendarAccessToken = null;
    user.googleCalendarRefreshToken = null;
    user.googleCalendarTokenExpiryDate = null;

    return this.usersRepository.save(user);
  }

  // Actualiza perfil
  async updateProfile(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.findOneById(userId);

    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt();
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  //  Actualiza avatar personalizado
  async updateAvatar(userId: string, avatarUrl: string | null): Promise<User> {
    const user = await this.findOneById(userId);
    user.avatar = avatarUrl;
    return this.usersRepository.save(user);
  }

  // Actualiza avatar de Google
  async updateGoogleAvatar(
    userId: string,
    googleAvatarUrl: string | null,
  ): Promise<User> {
    const user = await this.findOneById(userId);
    user.googleAvatar = googleAvatarUrl;
    return this.usersRepository.save(user);
  }

  //  Elimina usuario
  async deleteProfile(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    await this.usersRepository.delete(userId);
  }

  // Guarda token de recuperacion de contraseña
  async saveResetPasswordToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      resetPasswordToken: token,
      resetPasswordExpires: expiresAt,
    });
  }

  // Busca usuario por token valido
  async findByValidResetToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: MoreThan(new Date()),
      },
    });
  }

  // Actualizar contraseña y limpia token
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await this.usersRepository.update(userId, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
  }

  // Establece contraseña para usuarios que no tienen (registrados con Google)
  async setPassword(userId: string, newPassword: string): Promise<User> {
    const user = await this.findOneById(userId);

    if (user.password) {
      throw new ConflictException(
        'Este usuario ya tiene una contraseña. Usa la función de actualizar perfil.',
      );
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    return this.usersRepository.save(user);
  }
}
