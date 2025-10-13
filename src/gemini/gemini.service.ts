import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
  private readonly ai: GoogleGenAI;

  constructor() {
    if (!this.GEMINI_API_KEY) {
      this.logger.warn('GEMINI_API_KEY no está definido');
    }
    this.ai = new GoogleGenAI({ apiKey: this.GEMINI_API_KEY });
  }

  async askGemini(
    message: string,
    history: { sender: 'user' | 'model'; text: string }[] = [],
  ): Promise<{
    reply: string;
    action: string | null;
    title?: string;
    content?: string;
    location?: string;
    topic?: string;
    task?: string;
    time?: string;
    description?: string;
  }> {
    if (!this.GEMINI_API_KEY) {
      return { reply: 'API Key no definida 😥', action: null };
    }

    const prompt = `Eres un asistente personal llamado Milo.
    ... (tus instrucciones) ...`;

    const contents = [
      { role: 'model', parts: [{ text: prompt }] },
      ...history.map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const fallbackResponses = [
      'Lo siento, Milo no puede responder ahora 😥',
      'Estoy un poco ocupado, intenta de nuevo en unos segundos 😅',
      'No pude procesar tu solicitud, pero sigo aprendiendo 😉',
    ];

    const maxRetries = 3;
    const delayMs = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
        });

        const candidate = result.candidates?.[0];
        const replyText = candidate?.content?.parts?.[0]?.text?.trim();

        this.logger.debug(`Respuesta cruda (intento ${attempt}): ${replyText}`);

        if (!replyText) {
          this.logger.warn(
            `Sin contenido en intento ${attempt}: ${JSON.stringify(result)}`,
          );
          throw new Error('No se recibió texto de Gemini');
        }

        try {
          const parsed = JSON.parse(replyText);
          if (parsed && parsed.action) {
            return {
              reply: '',
              action: parsed.action,
              title: parsed.title ?? '',
              content: parsed.content ?? '',
              location: parsed.location ?? '',
              topic: parsed.topic ?? '',
              task: parsed.task ?? '',
              time: parsed.time ?? '',
              description: parsed.description ?? '',
            };
          }
        } catch {
          // No es JSON válido → texto plano
        }

        return { reply: replyText, action: null };
      } catch (err) {
        this.logger.error(`Error en intento ${attempt}`, err);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, delayMs));
        } else {
          const fallback =
            fallbackResponses[
              Math.floor(Math.random() * fallbackResponses.length)
            ];
          return { reply: fallback, action: null };
        }
      }
    }

    return { reply: 'Error inesperado 😵', action: null };
  }
}
