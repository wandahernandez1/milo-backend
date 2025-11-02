import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let service: Partial<AuthService>;

  beforeEach(async () => {
    service = {
      register: jest.fn().mockResolvedValue({ access_token: 'mock' }),
      login: jest.fn().mockResolvedValue({ access_token: 'mock' }),
      validateUser: jest
        .fn()
        .mockResolvedValue({ id: 1, email: 'test@example.com' }),
      loginWithGoogle: jest
        .fn()
        .mockResolvedValue({ access_token: 'googleMock' }),
      refreshToken: jest
        .fn()
        .mockResolvedValue({ access_token: 'refreshMock' }),
      logout: jest.fn().mockResolvedValue({ message: 'ok' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('debería registrar un usuario', async () => {
    const result = await controller.register({
      email: 'a@b.com',
      password: '1234',
    } as any);
    expect(result.access_token).toBe('mock');
  });

  it('debería loguear un usuario', async () => {
    const result = await controller.login({
      email: 'a@b.com',
      password: '1234',
    });
    expect(result.access_token).toBe('mock');
  });

  it('debería manejar error en login', async () => {
    (service.validateUser as jest.Mock).mockRejectedValueOnce(
      new Error('Credenciales inválidas'),
    );

    await expect(
      controller.login({ email: 'a@b.com', password: 'bad' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('debería hacer login con Google', async () => {
    const result = await controller.googleLogin({ token: 'abc' });
    expect(result.access_token).toBe('googleMock');
  });

  it('debería refrescar token', async () => {
    const result = await controller.refresh({ refresh_token: 'token123' });
    expect(result.access_token).toBe('refreshMock');
  });

  it('debería devolver perfil del usuario autenticado', () => {
    const req = { user: { id: 1, email: 'test@example.com', password: 'x' } };
    const result = controller.getProfile(req);
    expect(result).toEqual({ id: 1, email: 'test@example.com' });
  });

  it('debería hacer logout', async () => {
    const result = await controller.logout();
    expect(result.message).toBe('ok');
  });
});
