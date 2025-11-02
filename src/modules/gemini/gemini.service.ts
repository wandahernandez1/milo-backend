import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
  private readonly ai: GoogleGenAI;

  //  CONFIGURACIÓN DE LÍMITES
  private readonly MAX_HISTORY_MESSAGES = 20;
  private readonly KEEP_RECENT_MESSAGES = 10;
  private readonly MAX_TOTAL_CHARS = 30000;
  private readonly MAX_MESSAGE_LENGTH = 1000;

  constructor() {
    if (!this.GEMINI_API_KEY) {
      this.logger.warn('⚠️ GEMINI_API_KEY no está definido');
    }
    this.ai = new GoogleGenAI({ apiKey: this.GEMINI_API_KEY });
  }

  private truncateMessage(
    text: string,
    maxLength: number = this.MAX_MESSAGE_LENGTH,
  ): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private summarizeOldHistory(
    history: { sender: 'user' | 'model'; text: string }[],
  ): { sender: 'user' | 'model'; text: string }[] {
    if (history.length <= this.MAX_HISTORY_MESSAGES) {
      return history;
    }

    this.logger.log(
      `📊 Historial largo detectado (${history.length} mensajes). Optimizando...`,
    );

    const recentMessages = history.slice(-this.KEEP_RECENT_MESSAGES);
    const oldMessages = history.slice(0, -this.KEEP_RECENT_MESSAGES);

    if (oldMessages.length > 0) {
      const summaryText = `[Resumen de ${oldMessages.length} mensajes anteriores: conversación sobre ${this.extractTopics(oldMessages)}]`;

      return [
        { sender: 'model' as const, text: summaryText },
        ...recentMessages,
      ];
    }

    return recentMessages;
  }

  private extractTopics(
    messages: { sender: 'user' | 'model'; text: string }[],
  ): string {
    const userMessages = messages
      .filter((m) => m.sender === 'user')
      .map((m) => m.text)
      .join(' ');

    const keywords = [
      'evento',
      'tarea',
      'nota',
      'reunión',
      'recordatorio',
      'calendario',
    ];
    const foundTopics = keywords.filter((kw) =>
      userMessages.toLowerCase().includes(kw),
    );

    return foundTopics.length > 0 ? foundTopics.join(', ') : 'varios temas';
  }

  private optimizeHistory(
    history: { sender: 'user' | 'model'; text: string }[],
  ): { sender: 'user' | 'model'; text: string }[] {
    let optimized = this.summarizeOldHistory(history);

    optimized = optimized.map((msg) => ({
      ...msg,
      text: this.truncateMessage(msg.text),
    }));

    const totalChars = optimized.reduce((sum, msg) => sum + msg.text.length, 0);

    if (totalChars > this.MAX_TOTAL_CHARS) {
      this.logger.warn(
        `⚠️ Historial muy grande (${totalChars} chars). Reduciendo más...`,
      );
      optimized = optimized.slice(-Math.floor(this.KEEP_RECENT_MESSAGES / 2));
    }

    this.logger.log(
      `✅ Historial optimizado: ${optimized.length} mensajes, ~${totalChars} caracteres`,
    );

    return optimized;
  }

  async askGemini(
    message: string,
    history: { sender: 'user' | 'model'; text: string }[] = [],
    extra?: { timezone?: string; localTime?: string },
  ) {
    try {
      const optimizedHistory = this.optimizeHistory(history);

      const userTimezone = extra?.timezone ?? 'Desconocida';
      const userLocalTime =
        extra?.localTime ??
        new Date().toLocaleString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

      const context = `
Zona horaria del usuario: ${userTimezone}
Fecha y hora actual del usuario: ${userLocalTime}
`;

      const systemPrompt = `
Eres **Milo**, un asistente personal inteligente, amable y organizado. 
Tu propósito es ayudar al usuario con todo tipo de tareas cotidianas: notas, recordatorios, calendario, tareas, información general y conversación natural.
Tu principal objetivo es que el usuario te perciba como un asistente **inteligente y capaz de procesar toda la información y contexto** de la conversación.

---
🧭 CONTEXTO DEL USUARIO:
${context}

---
⚙️ FUNCIONES DISPONIBLES (SIEMPRE RESPONDE EN JSON)
Cuando el usuario diga algo que implique una acción de creación (evento, tarea, nota), debes responder en JSON con el siguiente formato. **El campo "reply" debe ser un mensaje de confirmación natural, inteligente y contextualizado para el usuario.**

{
  "action": "create_event" | "create_task" | "create_note" | "general_response",
  "title": "Texto del evento/tarea/nota (Claro y conciso)",
  "time": "Fecha y hora (en texto natural, e.g., 'mañana a las 9' o 'este viernes'. Opcional)",
  "description": "Descripción adicional (opcional, si es relevante)",
  "reply": "Mensaje de confirmación o respuesta natural para mostrar al usuario"
}

Si el usuario hace una pregunta general, saluda, pide un chiste o cualquier conversación que no implique una acción de creación directa, responde con:
{
  "action": "general_response",
  "reply": "Texto amigable, inteligente y conversacional, **considerando el historial de la conversación para dar contexto**"
}

---
📅 EJEMPLOS DE RESPUESTA INTELIGENTE
Usuario: "Agendá reunión con Lucas el lunes a las 14 y anota que tengo que leer el resumen del libro que me dijiste ayer."
Tú: {
  "action": "create_event",
  "title": "Reunión con Lucas",
  "time": "lunes a las 14",
  "description": "",
  "reply": "📅 ¡Listo! Agendé tu reunión con Lucas. Sobre el resumen, lo mejor sería crear una nota aparte. ¿Quieres que lo hagamos?"
}

Usuario: "Hola Milo, ¿Sabes la hora?"
Tú: {
  "action": "general_response",
  "reply": "¡Hola! Exacto, soy Milo,son las ${userLocalTime.split(' ')[1]}. ¿Cómo puedo asistirte hoy?"
}

---
⚠️ REGLAS CLAVE:
- **Siempre genera un JSON válido.**
- **El campo "reply" es la ÚNICA respuesta que verá el usuario en el chat.** Debe ser natural, inteligente, amigable y reflejar la acción o la respuesta conversacional.
- Utiliza la información de CONTEXTO (historial, hora, zona horaria) para dar respuestas más precisas e inteligentes.
- No incluyas comentarios o texto fuera del JSON.
-Siempre cordial , profesional, empático y amigable, con un toque de humor, sincero.
`;

      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...optimizedHistory.map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        })),
        {
          role: 'user',
          parts: [{ text: this.truncateMessage(message, 2000) }],
        },
      ];

      const totalSize = JSON.stringify(contents).length;
      this.logger.log(
        `📤 Enviando a Gemini: ${contents.length} mensajes, ~${Math.round(totalSize / 1024)}KB`,
      );

      const result = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents,
      });

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      try {
        // Limpieza mejorada de la respuesta
        const cleanedText = text
          .trim()
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/, '')
          .replace(/\s*```$/g, '');

        const parsed = JSON.parse(cleanedText);

        if (!parsed.action && parsed.reply) {
          parsed.action = 'general_response';
        }

        if (!parsed.reply) {
          this.logger.warn(
            '⚠️ Respuesta sin campo "reply". Agregando fallback.',
          );
          parsed.reply = parsed.title || 'Entendido';
        }

        this.logger.log(
          `✅ Respuesta procesada correctamente: ${parsed.action}`,
        );
        return parsed;
      } catch (parseError) {
        this.logger.error('❌ Error parseando JSON de Gemini:', {
          originalText: text.substring(0, 500),
          error: parseError.message,
        });

        return {
          action: 'general_response',
          reply:
            text.trim() ||
            'Lo siento, no pude procesar tu solicitud correctamente.',
        };
      }
    } catch (error) {
      this.logger.error('❌ Error en askGemini:', {
        message: error.message,
        code: error.code,
        status: error.status,
      });

      if (
        error.message?.includes('quota') ||
        error.message?.includes('limit')
      ) {
        return {
          action: 'general_response',
          reply:
            'He alcanzado mi límite de uso por ahora. Inténtalo en unos minutos. ',
        };
      }

      if (
        error.message?.includes('size') ||
        error.message?.includes('too large')
      ) {
        this.logger.warn(
          '⚠️ Mensaje demasiado grande. Intentando con historial reducido...',
        );

        if (history.length > 0) {
          return this.askGemini(message, history.slice(-5), extra);
        }
      }

      return {
        action: 'general_response',
        reply:
          'Disculpa, tuve un problema técnico. ¿Podrías repetir tu mensaje? 🤔',
      };
    }
  }
}
