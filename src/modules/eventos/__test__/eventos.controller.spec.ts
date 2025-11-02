import { Test, TestingModule } from '@nestjs/testing';
import { EventosController } from '../eventos.controller';
import { EventosService } from '../eventos.service';
import { GoogleService } from '../../google/google.service';

describe('EventosController', () => {
  let controller: EventosController;
  let eventosService: EventosService;
  let googleService: GoogleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventosController],
      providers: [
        {
          provide: EventosService,
          useValue: {
            syncFromGoogle: jest.fn(),
          },
        },
        {
          provide: GoogleService,
          useValue: {
            getCalendarEvents: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EventosController>(EventosController);
    eventosService = module.get<EventosService>(EventosService);
    googleService = module.get<GoogleService>(GoogleService);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debería sincronizar eventos desde Google', async () => {
    const req = { user: { id: 'user123' } };
    const mockEventos = [{ id: '1', title: 'Evento Google' }];

    jest
      .spyOn(googleService, 'getCalendarEvents')
      .mockResolvedValue(mockEventos);
    jest.spyOn(eventosService, 'syncFromGoogle').mockResolvedValue(mockEventos);

    const result = await controller.syncEventos(req);

    expect(googleService.getCalendarEvents).toHaveBeenCalled();
    expect(eventosService.syncFromGoogle).toHaveBeenCalledWith(
      'user123',
      mockEventos,
    );
    expect(result).toEqual({ eventos: mockEventos });
  });
});
