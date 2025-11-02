import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../user.controller';
import { UsersService } from '../user.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';
import { User } from '../user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUser: Partial<User> = {
    id: '1',
    name: 'Wanda',
    email: 'wanda@example.com',
    googleConnected: true,
  };

  const mockUsersService = {
    updateProfile: jest.fn(),
    deleteProfile: jest.fn(),
  };

  // ✅ mock del guard (simula usuario autenticado)
  const mockJwtAuthGuard = {
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      req.user = { id: '1', email: 'wanda@example.com' }; // simula usuario autenticado
      return true;
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('updateProfile', () => {
    it('debe actualizar el perfil y devolver el usuario sin contraseña', async () => {
      const updatedUser: Partial<User> = {
        id: '1',
        name: 'Nuevo',
        email: 'wanda@example.com',
        googleConnected: true,
      };

      mockUsersService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(
        { user: { id: '1' } },
        { name: 'Nuevo', password: '12345678' },
      );

      // ✅ Verificamos que el servicio se llamó correctamente
      expect(usersService.updateProfile).toHaveBeenCalledWith('1', {
        name: 'Nuevo',
        password: '12345678',
      });

      // ✅ Aseguramos que devuelve el formato esperado
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('user');
      expect(result.user).toMatchObject({
        id: '1',
        name: 'Nuevo',
        email: 'wanda@example.com',
      });

      // ✅ Confirmamos que no tiene el campo password
      expect('password' in result.user).toBe(false);
    });
  });

  describe('deleteProfile', () => {
    it('debe eliminar el perfil correctamente', async () => {
      mockUsersService.deleteProfile.mockResolvedValue(undefined);

      const result = await controller.deleteProfile({ user: { id: '1' } });

      expect(usersService.deleteProfile).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        success: true,
        message: 'Cuenta eliminada correctamente',
      });
    });
  });
});
