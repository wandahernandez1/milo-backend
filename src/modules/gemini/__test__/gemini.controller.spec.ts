import { Test, TestingModule } from '@nestjs/testing';
import { GeminiController } from '../gemini.controller';
import { GeminiService } from '../gemini.service';

describe('GeminiController', () => {
  let controller: GeminiController;
  let service: GeminiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeminiController],
      providers: [
        {
          provide: GeminiService,
          useValue: {
            askGemini: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GeminiController>(GeminiController);
    service = module.get<GeminiService>(GeminiService);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debería delegar correctamente a GeminiService', async () => {
    const mockResponse = { action: 'general_response', reply: '¡Hola!' };
    jest.spyOn(service, 'askGemini').mockResolvedValue(mockResponse);

    const body = {
      message: 'Hola Milo',
      history: [],
      timezone: 'America/Argentina/Buenos_Aires',
    };
    const result = await controller.askGemini(body);

    expect(service.askGemini).toHaveBeenCalledWith('Hola Milo', [], {
      timezone: 'America/Argentina/Buenos_Aires',
      localTime: undefined,
    });
    expect(result).toEqual(mockResponse);
  });
});
