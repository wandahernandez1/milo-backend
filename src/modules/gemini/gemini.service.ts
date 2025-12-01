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
Cuando el usuario diga algo que implique una acción de creación (evento, tarea, nota) o consulta de información (clima), debes responder en JSON con el siguiente formato. **El campo "reply" debe ser un mensaje de confirmación natural, inteligente y contextualizado para el usuario.**

**IMPORTANTE PARA EVENTOS:**
- Si el usuario menciona "agendar", "evento", "recordatorio" PERO **NO proporciona fecha/hora específica**, usa la acción "ask_event_details" para iniciar el flujo conversacional.
- Solo usa "create_event" si el usuario proporciona FECHA Y HORA clara en su mensaje (ej: "mañana a las 9", "el viernes a las 14", "20 de noviembre a las 10").

**IMPORTANTE PARA CLIMA:**
- Si el usuario pregunta por el clima de una CIUDAD o LUGAR específico (ej: "¿qué clima hace en Tandil?", "clima de Buenos Aires", "cómo está el tiempo en Mar del Plata"), usa la acción "get_weather_location" con el campo "location" que contenga SOLO EL NOMBRE DE LA CIUDAD.
- Si solo pregunta por el clima sin especificar ciudad (ej: "¿qué clima hace?", "cómo está el tiempo?", "qué clima hace hoy", "clima de hoy"), usa la acción "get_weather" sin campo "location".
- NUNCA extraigas palabras temporales como "hoy", "mañana", "tarde", "noche" como ubicación.

{
  "action": "create_event" | "create_task" | "create_note" | "ask_event_details" | "get_weather" | "get_weather_location" | "general_response",
  "title": "Texto del evento/tarea/nota (Claro y conciso)",
  "time": "Fecha y hora (en texto natural, e.g., 'mañana a las 9' o 'este viernes'. Solo para create_event)",
  "location": "Nombre de la ciudad para consultar el clima (Solo para get_weather_location)",
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

**Evento CON fecha completa (el usuario proporciona fecha/hora):**
Usuario: "Agendá reunión con Lucas el lunes a las 14"
Tú: {
  "action": "create_event",
  "title": "Reunión con Lucas",
  "time": "lunes a las 14",
  "description": "",
  "reply": "📅 ¡Listo! Agendé tu reunión con Lucas para el lunes a las 14."
}

Usuario: "Recordame ir al médico mañana a las 9"
Tú: {
  "action": "create_event",
  "title": "Ir al médico",
  "time": "mañana a las 9",
  "description": "",
  "reply": "📅 Perfecto, te recordaré ir al médico mañana a las 9."
}

**Evento SIN fecha (el usuario solo quiere agendar pero no dice cuándo):**
Usuario: "Quiero agendar un evento"
Tú: {
  "action": "ask_event_details",
  "reply": "📅 Perfecto, ¿cómo se va a llamar el evento?"
}

Usuario: "Ayudame a crear un recordatorio"
Tú: {
  "action": "ask_event_details",
  "reply": "📅 ¡Claro! ¿Qué querés recordar?"
}

Usuario: "Necesito agendar algo"
Tú: {
  "action": "ask_event_details",
  "reply": "📅 Genial, ¿de qué se trata?"
}

**Clima con ubicación específica:**
Usuario: "¿Qué clima hace en Tandil?"
Tú: {
  "action": "get_weather_location",
  "location": "Tandil",
  "reply": "🌤️ Consultando el clima en Tandil..."
}

Usuario: "Cómo está el tiempo en Buenos Aires"
Tú: {
  "action": "get_weather_location",
  "location": "Buenos Aires",
  "reply": "🌤️ Consultando el clima en Buenos Aires..."
}

Usuario: "Dame el clima de Mar del Plata"
Tú: {
  "action": "get_weather_location",
  "location": "Mar del Plata",
  "reply": "🌤️ Consultando el clima en Mar del Plata..."
}

**Clima sin ubicación (usa ubicación actual):**
Usuario: "¿Qué clima hace?"
Tú: {
  "action": "get_weather",
  "reply": "🌤️ Consultando el clima en tu ubicación actual..."
}

Usuario: "Cómo está el tiempo hoy"
Tú: {
  "action": "get_weather",
  "reply": "🌤️ Consultando el clima..."
}

Usuario: "Qué clima hace hoy"
Tú: {
  "action": "get_weather",
  "reply": "🌤️ Consultando el clima de hoy..."
}

Usuario: "Clima de hoy"
Tú: {
  "action": "get_weather",
  "reply": "🌤️ Consultando el clima..."
}

**Conversación general:**
Usuario: "Hola Milo, ¿Sabes la hora?"
Tú: {
  "action": "general_response",
  "reply": "¡Hola! Exacto, soy Milo, son las ${userLocalTime.split(' ')[1]}. ¿Cómo puedo asistirte hoy?"
}

---
⚠️ REGLAS CLAVE:
- **Siempre genera un JSON válido.**
- **El campo "reply" es la ÚNICA respuesta que verá el usuario en el chat.** Debe ser natural, inteligente, amigable y reflejar la acción o la respuesta conversacional.
- **Para eventos:** Si el mensaje del usuario NO incluye fecha/hora específica (ej: "quiero agendar", "necesito recordar", "ayudame con un evento"), usa "ask_event_details". Solo usa "create_event" si hay fecha/hora clara.
- **Para clima:** Si el usuario menciona una ciudad específica (ej: "en Tandil", "de Buenos Aires", "clima en X"), usa "get_weather_location" con el campo "location". Si no especifica ciudad, usa "get_weather".
- **Ejemplos de fechas válidas:** "mañana", "el lunes", "20 de diciembre", "a las 15", "mañana a las 9", "este viernes a las 14". 
- **Ejemplos SIN fecha válida:** "quiero agendar", "ayudame con un evento", "necesito un recordatorio" (sin mencionar cuándo).
- Utiliza la información de CONTEXTO (historial, hora, zona horaria) para dar respuestas más precisas e inteligentes.
- No incluyas comentarios o texto fuera del JSON.
- Siempre cordial, profesional, empático y amigable, con un toque de humor, sincero.
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
        model: 'gemini-2.5-flash',
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

        // Validación especial para eventos sin fecha
        if (parsed.action === 'create_event') {
          const hasValidTime = parsed.time && parsed.time.trim() !== '';

          if (!hasValidTime) {
            this.logger.warn(
              '⚠️ create_event sin campo "time" válido. Convirtiendo a ask_event_details.',
            );
            parsed.action = 'ask_event_details';
            parsed.reply =
              parsed.reply || '📅 Perfecto, ¿cómo se va a llamar el evento?';
            delete parsed.time;
            delete parsed.title;
          }
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
