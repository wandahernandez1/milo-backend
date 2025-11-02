import { Test, TestingModule } from '@nestjs/testing';
import { GoogleService } from '../google.service';
import { UsersService } from '../../users/user.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: jest.fn(() => 'mockAuthUrl'),
        getToken: jest
          .fn()
          .mockResolvedValue({ tokens: { access_token: 'mockToken' } }),
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockResolvedValue({
          credentials: { access_token: 'newToken' },
        }),
      })),
    },
    calendar: jest.fn().mockReturnValue({
      events: {
        list: jest.fn().mockResolvedValue({ data: { items: [{ id: 1 }] } }),
        insert: jest
          .fn()
          .mockResolvedValue({ data: { id: '123', summary: 'Evento creado' } }),
        update: jest.fn().mockResolvedValue({
          data: { id: '123', summary: 'Evento actualizado' },
        }),
        delete: jest.fn().mockResolvedValue({}),
      },
    }),
  },
}));

describe('GoogleService', () => {
  let service: GoogleService;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock'),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findOneById: jest.fn().mockResolvedValue({
              id: '1',
              googleCalendarAccessToken: 'mockAccess',
              googleCalendarRefreshToken: 'mockRefresh',
            }),
            updateGoogleCalendarTokens: jest.fn(),
            usersRepository: {
              save: jest.fn().mockResolvedValue(true),
            },
          },
        },
      ],
    }).compile();

    service = module.get<GoogleService>(GoogleService);
    usersService = module.get<UsersService>(UsersService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería generar URL de autenticación', () => {
    const url = service.getAuthUrl('123');
    expect(url).toBe('mockAuthUrl');
  });

  it('debería obtener tokens de Google', async () => {
    await service.getTokens('code', 'state');
    expect(usersService.updateGoogleCalendarTokens).toHaveBeenCalled();
  });

  it('debería lanzar error si el token es inválido', async () => {
    jest.spyOn(usersService, 'findOneById').mockResolvedValueOnce({
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
      avatar: null,
      googleCalendarAccessToken: null,
      googleCalendarRefreshToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    await expect(service.getCalendarEvents('1', 'a', 'b')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debería crear evento', async () => {
    const result = await service.createEvent('1', {
      summary: 'Test Event',
      natural_time: 'mañana a las 10',
    });
    expect(result).toHaveProperty('id');
  });

  it('debería actualizar evento', async () => {
    const result = await service.updateEvent('1', '123', {
      summary: 'Actualizado',
      start: {
        dateTime: new Date().toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      end: {
        dateTime: new Date().toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
    });
    expect(result).toHaveProperty('id');
  });

  it('debería eliminar evento', async () => {
    const result = await service.deleteEvent('1', '123');
    expect(result).toEqual({ success: true });
  });
});
