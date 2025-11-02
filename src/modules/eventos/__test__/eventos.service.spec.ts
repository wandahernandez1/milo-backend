import { Test, TestingModule } from '@nestjs/testing';
import { EventosService } from '../eventos.service';
import { Logger } from '@nestjs/common';

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
    const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const userId = '123';
    const eventos = [{ id: 1, title: 'Evento test' }];

    const result = await service.syncFromGoogle(userId, eventos);

    expect(loggerSpy).toHaveBeenCalledWith(
      `🔄 Sincronizando ${eventos.length} eventos para usuario ${userId}`,
    );
    expect(result).toEqual(eventos);

    loggerSpy.mockRestore();
  });

  it('debería registrar un evento correctamente', async () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const userId = '123';
    const evento = { id: 1, summary: 'Reunión importante' };

    await service.registrarEvento(userId, evento);

    expect(loggerSpy).toHaveBeenCalledWith(
      `📅 Registrando nuevo evento para usuario ${userId}: ${evento.summary}`,
    );

    loggerSpy.mockRestore();
  });
});
