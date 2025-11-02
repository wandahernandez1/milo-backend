import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  // Marcar usuario como conectado a Google
  async markUserAsConnected(userId: string): Promise<User> {
    const user = await this.findOneById(userId);
    user.googleConnected = true;
    return this.usersRepository.save(user);
  }

  // Buscar por email
  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  //  Buscar por ID
  async findOneById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  //  Crear usuario (con soporte para login Google sin contraseña)
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

  //  Actualizar tokens de Google Calendar
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

  // Desconectar Google Calendar
  async disconnectGoogleCalendar(userId: string): Promise<User> {
    const user = await this.findOneById(userId);

    user.googleConnected = false;
    user.googleCalendarAccessToken = null;
    user.googleCalendarRefreshToken = null;
    user.googleCalendarTokenExpiryDate = null;

    return this.usersRepository.save(user);
  }

  // Actualizar perfil
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

  //  Actualizar avatar personalizado
  async updateAvatar(userId: string, avatarUrl: string | null): Promise<User> {
    const user = await this.findOneById(userId);
    user.avatar = avatarUrl;
    return this.usersRepository.save(user);
  }

  // Actualizar avatar de Google
  async updateGoogleAvatar(
    userId: string,
    googleAvatarUrl: string | null,
  ): Promise<User> {
    const user = await this.findOneById(userId);
    user.googleAvatar = googleAvatarUrl;
    return this.usersRepository.save(user);
  }

  //  Eliminar usuario
  async deleteProfile(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    await this.usersRepository.delete(userId);
  }
}
