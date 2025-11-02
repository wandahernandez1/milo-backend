import { Test, TestingModule } from '@nestjs/testing';
import { GeminiService } from '../gemini.service';
import { Logger } from '@nestjs/common';

// 🔧 Mock del SDK de Google
jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: jest.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: '{"action":"general_response","reply":"¡Hola, soy Milo!"}',
                  },
                ],
              },
            },
          ],
        }),
      },
    })),
  };
});

describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(async () => {
    process.env.GEMINI_API_KEY = 'fake_key'; // Simulamos API key
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeminiService],
    }).compile();

    service = module.get<GeminiService>(GeminiService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería devolver JSON parseado desde Gemini', async () => {
    const result = await service.askGemini('Hola');
    expect(result).toEqual({
      action: 'general_response',
      reply: '¡Hola, soy Milo!',
    });
  });

  it('debería devolver respuesta general si JSON no es válido', async () => {
    const mockGenerate = jest.fn().mockResolvedValue({
      candidates: [{ content: { parts: [{ text: 'texto inválido' }] } }],
    });

    // Forzamos un resultado inválido
    (service as any).ai.models.generateContent = mockGenerate;

    const result = await service.askGemini('algo no json');
    expect(result.action).toBe('general_response');
    expect(typeof result.reply).toBe('string');
  });
});
