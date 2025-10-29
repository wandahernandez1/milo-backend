import { Injectable, NotFoundException,ConflictException, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

 async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.findOneByEmail(createUserDto.email);
    if (existingUser) {
        // Validación de unicidad manual ANTES de la DB.
        throw new ConflictException('Este email ya está registrado.');
    }
    
    // Si no existe, procedemos a hashear y guardar
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const newUser = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    try {
        return this.usersRepository.save(newUser);
    } catch (error) {
        // En caso de que se haya colado por algún race condition (menos común)
        throw new ConflictException('Error al crear usuario. Email duplicado.');
    }
  }

  async findOneById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
