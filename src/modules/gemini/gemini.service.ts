import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
  private readonly ai: GoogleGenAI;

  constructor() {
    if (!this.GEMINI_API_KEY) {
      this.logger.warn('⚠️ GEMINI_API_KEY no está definido');
    }
    this.ai = new GoogleGenAI({ apiKey: this.GEMINI_API_KEY });
  }

  async askGemini(
    message: string,
    history: { sender: 'user' | 'model'; text: string }[] = [],
    extra?: { timezone?: string; localTime?: string },
  ) {
    // Utilizamos el contexto actual para respuestas más inteligentes
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
`; // La lógica de contents se beneficia del historial (history) para la inteligencia

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...history.map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const result = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
    });

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    try {
      // 🔑 NUEVA LIMPIEZA: Eliminamos los bloques de código JSON (```json) que añade Gemini
      const cleanedText = text
        .trim()
        .replace(/^```json\s*/, '') // Elimina la apertura
        .replace(/\s*```$/, ''); // Elimina el cierre
      const parsed = JSON.parse(cleanedText); // Usamos el texto limpio
      // Aseguramos que siempre haya una acción o una respuesta.

      if (!parsed.action && parsed.reply) {
        parsed.action = 'general_response';
      }
      return parsed;
    } catch (err) {
      this.logger.warn(
        '⚠️ Respuesta no válida JSON (después de limpieza):',
        text,
      ); // Si falla el JSON, devolvemos el texto plano como una respuesta general.
      return {
        action: 'general_response',
        reply: text.trim() || 'No pude entender la respuesta.',
      };
    }
  }
}
