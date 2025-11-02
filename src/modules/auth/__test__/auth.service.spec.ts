import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;
  let configService: Partial<ConfigService>;

  beforeEach(async () => {
    usersService = {
      findOneByEmail: jest.fn(),
      findOneById: jest.fn(),
      create: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mockToken'),
      verify: jest.fn().mockReturnValue({ sub: 1 }),
    };

    configService = {
      get: jest.fn((key: string) => {
        const map = {
          JWT_SECRET: 'test-secret',
          JWT_EXPIRATION: '1h',
          JWT_REFRESH_SECRET: 'test-refresh',
          JWT_REFRESH_EXPIRATION: '7d',
          GOOGLE_CLIENT_ID: 'google-client-id',
        };
        return map[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('debería validar correctamente el usuario', async () => {
      (usersService.findOneByEmail as jest.Mock).mockResolvedValue({
        email: 'test@example.com',
        password: 'hashedPass',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', '1234');
      expect(result.email).toBe('test@example.com');
    });

    it('debería lanzar error si el usuario no existe', async () => {
      (usersService.findOneByEmail as jest.Mock).mockResolvedValue(null);
      await expect(service.validateUser('x@y.com', '123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debería lanzar error si la contraseña es incorrecta', async () => {
      (usersService.findOneByEmail as jest.Mock).mockResolvedValue({
        email: 'test@example.com',
        password: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('test@example.com', 'bad'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('debería devolver tokens de acceso y refresh', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'User',
      } as any;
      const result = await service.login(mockUser);
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('register', () => {
    it('debería crear usuario y loguearlo', async () => {
      const mockUser = { id: 1, email: 'test@example.com' } as any;
      (usersService.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'x@y.com',
        password: '123',
      });
      expect(result.access_token).toBe('mockToken');
      expect(usersService.create).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('debería refrescar el token correctamente', async () => {
      (usersService.findOneById as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'user@mail.com',
      });
      const result = await service.refreshToken('mockRefresh');
      expect(result.access_token).toBe('mockToken');
    });

    it('debería lanzar error si el token es inválido', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error();
      });
      await expect(service.refreshToken('invalid')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
