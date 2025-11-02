import { Test, TestingModule } from '@nestjs/testing';
import { GoogleController } from '../google.controller';
import { GoogleService } from '../google.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

describe('GoogleController', () => {
  let controller: GoogleController;
  let service: GoogleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoogleController],
      providers: [
        {
          provide: GoogleService,
          useValue: {
            getAuthUrl: jest.fn(),
            getTokens: jest.fn(),
            getCalendarEvents: jest.fn(),
            createEvent: jest.fn(),
            updateEvent: jest.fn(),
            deleteEvent: jest.fn(),
            markUserAsConnected: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GoogleController>(GoogleController);
    service = module.get<GoogleService>(GoogleService);
  });

  it('debería definirse el controlador', () => {
    expect(controller).toBeDefined();
  });

  it('debería devolver URL de auth de Google', async () => {
    (service.getAuthUrl as jest.Mock).mockReturnValue(
      'https://google.com/auth',
    );
    const req = { user: { id: '123' } };
    const result = await controller.redirectToGoogle(req);
    expect(result).toEqual({ url: 'https://google.com/auth' });
  });

  it('debería obtener eventos', async () => {
    const mockEvents = [{ id: 1, summary: 'Evento de prueba' }];
    (service.getCalendarEvents as jest.Mock).mockResolvedValue(mockEvents);
    const req = { user: { id: '123' } };
    const result = await controller.getEvents(req, '2025-01-01', '2025-12-31');
    expect(result).toEqual(mockEvents);
  });

  it('debería crear evento', async () => {
    const mockEvent = { id: '1', summary: 'Evento creado' };
    (service.createEvent as jest.Mock).mockResolvedValue(mockEvent);
    const req = { user: { id: '123' } };
    const body = { summary: 'Evento creado', natural_time: 'mañana a las 10' };
    const result = await controller.createEvent(req, body);
    expect(result).toEqual(mockEvent);
  });

  it('debería actualizar evento', async () => {
    const mockUpdated = { id: '1', summary: 'Evento actualizado' };
    (service.updateEvent as jest.Mock).mockResolvedValue(mockUpdated);
    const req = { user: { id: '123' } };
    const result = await controller.updateEvent(req, '1', { summary: 'nuevo' });
    expect(result).toEqual(mockUpdated);
  });

  it('debería eliminar evento', async () => {
    (service.deleteEvent as jest.Mock).mockResolvedValue({ success: true });
    const req = { user: { id: '123' } };
    const result = await controller.deleteEvent(req, '1');
    expect(result).toEqual({ success: true });
  });
});
