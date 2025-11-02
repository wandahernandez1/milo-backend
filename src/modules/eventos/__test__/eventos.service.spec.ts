import { Test, TestingModule } from '@nestjs/testing';
import { EventosService } from '../eventos.service';

describe('EventosService', () => {
  let service: EventosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventosService],
    }).compile();

    service = module.get<EventosService>(EventosService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería sincronizar eventos y devolverlos', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const userId = '123';
    const eventos = [{ id: 1, title: 'Evento test' }];

    const result = await service.syncFromGoogle(userId, eventos);

    expect(consoleSpy).toHaveBeenCalledWith(
      `🔄 Sincronizando ${eventos.length} eventos para usuario ${userId}`,
    );
    expect(result).toEqual(eventos);

    consoleSpy.mockRestore();
  });
});
