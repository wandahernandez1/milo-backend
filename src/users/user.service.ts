import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}


  async create(userDto: { name: string; email: string; password: string }): Promise<User> {
    const existingUser = await this.findOneByEmail(userDto.email);
    if (existingUser) {
      throw new ConflictException('Email ya registrado');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(userDto.password, salt);

    const newUser = this.usersRepository.create({
      ...userDto,
      password: hashedPassword,
    });

    return this.usersRepository.save(newUser);
  }
  async findOneByEmail(email: string): Promise<User | null> {
  return this.usersRepository.findOne({ where: { email } });
}
  async findOneById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOneById(userId);

    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt();
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async deleteProfile(userId: string): Promise<void> {
    const user = await this.findOneById(userId);
    await this.usersRepository.remove(user);
  }
}
