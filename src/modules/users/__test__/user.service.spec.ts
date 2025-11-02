import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConflictException, NotFoundException } from '@nestjs/common';

jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashedpass'),
  compare: jest.fn().mockResolvedValue(true),
}));

const mockUser = {
  id: '1',
  name: 'Wanda',
  email: 'wanda@example.com',
  password: 'hashedpass',
  googleConnected: false,
};

const mockRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;
  let repo: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get<Repository<User>>(getRepositoryToken(User));
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('findOneByEmail', () => {
    it('debe retornar un usuario por email', async () => {
      mockRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.findOneByEmail('wanda@example.com');
      expect(result).toEqual(mockUser);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'wanda@example.com' },
      });
    });
  });

  describe('findOneById', () => {
    it('debe retornar un usuario por ID', async () => {
      mockRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.findOneById('1');
      expect(result).toEqual(mockUser);
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOneById('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('debe crear un nuevo usuario con contraseña hasheada', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(mockUser);
      mockRepo.save.mockResolvedValue(mockUser);

      const result = await service.create({
        name: 'Wanda',
        email: 'wanda@example.com',
        password: '12345678',
      });

      expect(result).toEqual(mockUser);
      expect(mockRepo.create).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si el email ya existe', async () => {
      mockRepo.findOne.mockResolvedValue(mockUser);
      await expect(
        service.create({
          name: 'W',
          email: 'wanda@example.com',
          password: '123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateProfile', () => {
    it('debe actualizar el perfil con hash nuevo', async () => {
      mockRepo.findOne.mockResolvedValue(mockUser);
      mockRepo.save.mockResolvedValue({ ...mockUser, name: 'Nuevo' });

      const result = await service.updateProfile('1', {
        name: 'Nuevo',
        password: '12345678',
      });
      expect(result.name).toBe('Nuevo');
      expect(bcrypt.hash).toHaveBeenCalled();
    });
  });

  describe('deleteProfile', () => {
    it('debe eliminar un usuario existente', async () => {
      mockRepo.findOne.mockResolvedValue(mockUser);
      mockRepo.delete.mockResolvedValue({ affected: 1 });
      await service.deleteProfile('1');
      expect(mockRepo.delete).toHaveBeenCalledWith('1');
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteProfile('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markUserAsConnected', () => {
    it('marca como conectado a Google', async () => {
      mockRepo.findOne.mockResolvedValue(mockUser);
      mockRepo.save.mockResolvedValue({ ...mockUser, googleConnected: true });
      const result = await service.markUserAsConnected('1');
      expect(result.googleConnected).toBe(true);
    });
  });

  describe('updateGoogleCalendarTokens', () => {
    it('actualiza los tokens correctamente', async () => {
      mockRepo.findOne.mockResolvedValue(mockUser);
      mockRepo.save.mockResolvedValue({
        ...mockUser,
        googleConnected: true,
        googleCalendarAccessToken: 'token',
      });

      const tokens = { access_token: 'token', expiry_date: Date.now() + 1000 };
      const result = await service.updateGoogleCalendarTokens('1', tokens);
      expect(result.googleConnected).toBe(true);
      expect(result.googleCalendarAccessToken).toBe('token');
    });
  });

  describe('disconnectGoogleCalendar', () => {
    it('desconecta al usuario de Google Calendar', async () => {
      mockRepo.findOne.mockResolvedValue({
        ...mockUser,
        googleConnected: true,
      });
      mockRepo.save.mockResolvedValue({
        ...mockUser,
        googleConnected: false,
        googleCalendarAccessToken: null,
      });

      const result = await service.disconnectGoogleCalendar('1');
      expect(result.googleConnected).toBe(false);
    });
  });
});
