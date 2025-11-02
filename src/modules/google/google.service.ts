import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/user.service';
// 🔑 Importaciones para la lógica de hora natural
import * as chrono from 'chrono-node';
import { format, addHours, addDays } from 'date-fns';

// 🌎 Zona horaria por defecto
const USER_TIMEZONE = 'America/Argentina/Buenos_Aires';

// Definimos la estructura que puede venir del frontend (chat o modal)
interface CalendarEventInput {
  summary: string;
  description?: string;
  natural_time?: string; // Viene del chat: "hoy a las 21:00"
  start?: { dateTime: string; timeZone: string } | { date: string }; // Viene del modal
  end?: { dateTime: string; timeZone: string } | { date: string }; // Viene del modal
}

@Injectable()
export class GoogleService {
  private oauth2Client;
  createCalendarEvent: any;

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    console.log(
      '🔍 GOOGLE_REDIRECT_URI:',
      this.configService.get('GOOGLE_REDIRECT_URI'),
    );

    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_REDIRECT_URI'),
    );
  }

  // ------------------------------------------------------
  // 🔑 Lógica para parsear la hora natural (NUEVA FUNCIÓN)
  // ------------------------------------------------------
  private parseNaturalTime(
    naturalTime: string,
    timezone: string,
  ): { start: any; end: any } {
    const today = new Date();

    // Usamos el parser en español para interpretar 'hoy', 'mañana', etc.
    const parsedDate = chrono.es.parse(naturalTime, today, {
      forwardDate: true,
    });

    if (!parsedDate || parsedDate.length === 0) {
      throw new BadRequestException(
        'No pude entender la fecha y hora proporcionada por el chat.',
      );
    }

    const start = parsedDate[0].start.date();
    let end = parsedDate[0].end ? parsedDate[0].end.date() : addHours(start, 1);

    // Determinar si es un evento de día completo (si no se especificó hora)
    const isFullDay =
      !parsedDate[0].start.isCertain('hour') &&
      !parsedDate[0].end?.isCertain('hour');

    if (isFullDay) {
      // Evento de día completo: usa 'date' en formato YYYY-MM-DD
      const startDate = format(start, 'yyyy-MM-dd');
      // El 'end date' de Google debe ser el día siguiente (exclusivo)
      const endDate = format(addDays(start, 1), 'yyyy-MM-dd');

      return {
        start: { date: startDate },
        end: { date: endDate },
      };
    }

    // Evento con hora: usa 'dateTime' y timezone
    return {
      start: {
        dateTime: start.toISOString(),
        timeZone: timezone,
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: timezone,
      },
    };
  }

  // ------------------------------------------------------
  // 🔗 Generar URL de autenticación de Google
  // ------------------------------------------------------
  getAuthUrl(userId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: userId,
    });
  }

  // ------------------------------------------------------
  // 🔑 Obtener y guardar tokens de Google
  // ------------------------------------------------------
  async getTokens(code: string, state: string): Promise<void> {
    console.log('📥 LLEGÓ A getTokens()');
    console.log('🧩 Código recibido:', code);
    console.log('👤 UserID (state):', state);

    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      console.log('🔑 Tokens recibidos:', tokens);

      if (!tokens.access_token) {
        throw new UnauthorizedException('Error al obtener tokens de Google.');
      }

      await this.usersService.updateGoogleCalendarTokens(state, tokens);
      await this.markUserAsConnected(state);

      console.log('✅ Tokens guardados correctamente y usuario conectado.');
    } catch (err) {
      console.error('🔥 Error dentro de getTokens():', err);
      throw err;
    }
  }

  // ------------------------------------------------------
  // ✅ Marcar usuario como conectado a Google
  // ------------------------------------------------------
  async markUserAsConnected(userId: string) {
    const user = await this.usersService.findOneById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    user.googleConnected = true;
    await this.usersService['usersRepository'].save(user);
  }

  // ------------------------------------------------------
  // ♻️ Refrescar token usando la API moderna de Google
  // ------------------------------------------------------
  async refreshAccessToken(refreshToken: string) {
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_REDIRECT_URI'),
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      console.log('🔄 Nuevos tokens obtenidos:', credentials);
      return credentials;
    } catch (error) {
      console.error(
        '❌ Error refrescando token:',
        error.response?.data || error.message,
      );
      throw new UnauthorizedException(
        'No se pudo refrescar el token de Google.',
      );
    }
  }

  // ------------------------------------------------------
  // 📅 Obtener eventos del calendario
  // ------------------------------------------------------
  async getCalendarEvents(userId: string, timeMin: string, timeMax: string) {
    try {
      console.log(`📅 Obteniendo eventos para usuario: ${userId}`);
      const user = await this.usersService.findOneById(userId);
      if (!user) throw new NotFoundException('Usuario no encontrado');

      if (!user.googleCalendarAccessToken || !user.googleCalendarRefreshToken) {
        throw new UnauthorizedException(
          'Cuenta de Google no conectada correctamente.',
        );
      }

      this.oauth2Client.setCredentials({
        access_token: user.googleCalendarAccessToken,
        refresh_token: user.googleCalendarRefreshToken,
      });

      // Refresh token if expired
      const now = new Date();
      if (
        user.googleCalendarTokenExpiryDate &&
        user.googleCalendarTokenExpiryDate < now
      ) {
        console.log('🔁 Token expirado, refrescando...');
        const newTokens = await this.refreshAccessToken(
          user.googleCalendarRefreshToken,
        );
        await this.usersService.updateGoogleCalendarTokens(userId, newTokens);
        this.oauth2Client.setCredentials(newTokens);
      }

      const calendar = google.calendar({
        version: 'v3',
        auth: this.oauth2Client,
      });
      const eventsResponse = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return eventsResponse.data.items || [];
    } catch (err) {
      console.error(
        '🔥 Error obteniendo eventos:',
        err.response?.data || err.message,
      );
      throw new UnauthorizedException(
        `Error obteniendo eventos: ${err.message}`,
      );
    }
  }

  // ------------------------------------------------------
  // 🗓️ Crear un nuevo evento (CORREGIDO)
  // ------------------------------------------------------
  async createEvent(userId: string, eventData: CalendarEventInput) {
    try {
      const user = await this.usersService.findOneById(userId);
      if (!user) throw new NotFoundException('Usuario no encontrado');

      if (!user.googleCalendarAccessToken || !user.googleCalendarRefreshToken) {
        throw new UnauthorizedException(
          'Cuenta de Google no conectada correctamente.',
        );
      }

      this.oauth2Client.setCredentials({
        access_token: user.googleCalendarAccessToken,
        refresh_token: user.googleCalendarRefreshToken,
      });

      // 🔄 Refrescar token si expiró
      const now = new Date();
      if (
        user.googleCalendarTokenExpiryDate &&
        user.googleCalendarTokenExpiryDate < now
      ) {
        console.log('🔁 Token expirado, refrescando antes de crear evento...');
        try {
          const newTokens = await this.refreshAccessToken(
            user.googleCalendarRefreshToken,
          );
          await this.usersService.updateGoogleCalendarTokens(userId, newTokens);
          this.oauth2Client.setCredentials(newTokens);
        } catch (refreshErr) {
          console.error(
            '⚠️ Error al refrescar token antes de crear evento:',
            refreshErr.response?.data || refreshErr.message || refreshErr,
          );
          throw new UnauthorizedException(
            'No se pudo refrescar el token de Google.',
          );
        }
      }

      // ✅ LOGICA AÑADIDA: Manejar el campo 'natural_time' del chat
      let finalEventBody: any = {
        summary: eventData.summary || 'Evento sin título',
        description: eventData.description || '',
      };

      if (eventData.natural_time) {
        // Viene del chat: Interpretamos la hora natural
        console.log(`💬 Procesando hora natural: ${eventData.natural_time}`);
        const timeObjects = this.parseNaturalTime(
          eventData.natural_time,
          USER_TIMEZONE,
        );
        finalEventBody = { ...finalEventBody, ...timeObjects };
      } else if (eventData.start && eventData.end) {
        // Viene de un modal/formulario con start/end ya definidos
        finalEventBody.start = eventData.start;
        finalEventBody.end = eventData.end;
      } else {
        // No hay información de tiempo
        throw new BadRequestException(
          'El evento debe tener un campo "natural_time" (chat) o "start" y "end" válidos (modal).',
        );
      }

      // 🕐 Normalizar formato de fechas si son objetos dateTime (se usa para re-validar/ajustar)
      if (finalEventBody.start?.dateTime && finalEventBody.end?.dateTime) {
        const start = new Date(finalEventBody.start.dateTime);
        let end = new Date(finalEventBody.end.dateTime);

        if (start.getTime() === end.getTime()) {
          end = new Date(start.getTime() + 30 * 60 * 1000);
        }

        finalEventBody.start.dateTime = start.toISOString();
        finalEventBody.end.dateTime = end.toISOString();

        if (!finalEventBody.start.timeZone) {
          finalEventBody.start.timeZone = USER_TIMEZONE;
        }
        if (!finalEventBody.end.timeZone) {
          finalEventBody.end.timeZone = USER_TIMEZONE;
        }
      }
      // 🗓️ Si es de día completo (date)
      else if (finalEventBody.start?.date && finalEventBody.end?.date) {
        // Aseguramos que el end sea el día siguiente si son iguales, como requiere Google
        const startDateString = finalEventBody.start.date.split('T')[0];
        const endDateString = finalEventBody.end.date.split('T')[0];

        if (startDateString === endDateString) {
          const nextDay = new Date(startDateString);
          nextDay.setDate(nextDay.getDate() + 1);
          finalEventBody.end.date = nextDay.toISOString().split('T')[0];
        }
      }

      //  Crear evento en Google Calendar
      const calendar = google.calendar({
        version: 'v3',
        auth: this.oauth2Client,
      });

      console.log('📤 Enviando evento a Google Calendar:', finalEventBody);

      const insertRes = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: finalEventBody, // <-- Usamos el cuerpo final normalizado
      });

      console.log('✅ Evento creado correctamente en Google Calendar');
      return insertRes.data;
    } catch (err) {
      console.error('🔥 Error creando evento en Google Calendar:');
      console.error('📄 Mensaje:', err.message);
      console.error('📦 Código:', err.code);
      console.error(
        '📥 Respuesta completa de Google:',
        JSON.stringify(err.response?.data, null, 2),
      );

      // Manejo de errores simplificado
      if (err instanceof BadRequestException) throw err;

      if (err.code === 400) {
        throw new BadRequestException(
          `Solicitud inválida a Google Calendar: ${err.response?.data?.error?.message || err.message}`,
        );
      }

      if (err.code === 401 || err.code === 403) {
        throw new UnauthorizedException(
          'Token de Google inválido o sin permisos.',
        );
      }

      throw new InternalServerErrorException(
        'Error creando evento en Google Calendar.',
      );
    }
  }

  // ------------------------------------------------------
  // ✏️ Actualizar evento existente
  // ------------------------------------------------------
  async updateEvent(userId: string, eventId: string, updates: any) {
    // ... (El código de updateEvent no necesita cambios, ya que asume que
    //     las actualizaciones vienen con start/end ya formateados o son solo
    //     cambios de summary/description).
    try {
      const user = await this.usersService.findOneById(userId);
      if (!user) throw new NotFoundException('Usuario no encontrado');

      if (!user.googleCalendarAccessToken || !user.googleCalendarRefreshToken) {
        throw new UnauthorizedException(
          'Cuenta de Google no conectada correctamente.',
        );
      }

      this.oauth2Client.setCredentials({
        access_token: user.googleCalendarAccessToken,
        refresh_token: user.googleCalendarRefreshToken,
      });

      // 🔄 Refrescar token si expiró
      const now = new Date();
      if (
        user.googleCalendarTokenExpiryDate &&
        user.googleCalendarTokenExpiryDate < now
      ) {
        console.log(
          '🔁 Token expirado, refrescando antes de actualizar evento...',
        );
        const tokens = await this.refreshAccessToken(
          user.googleCalendarRefreshToken,
        );
        await this.usersService.updateGoogleCalendarTokens(userId, tokens);
        this.oauth2Client.setCredentials(tokens);
      }

      // ✅ Validar y normalizar los datos de actualización
      const eventUpdate: any = {
        summary: updates.summary || 'Sin título',
        description: updates.description || '',
        start: updates.start,
        end: updates.end,
      };

      // 🕐 Normalizar formato de fechas si son strings
      if (updates.start?.dateTime) {
        eventUpdate.start = {
          dateTime: new Date(updates.start.dateTime).toISOString(),
          timeZone: updates.start.timeZone || USER_TIMEZONE,
        };
      }

      if (updates.end?.dateTime) {
        eventUpdate.end = {
          dateTime: new Date(updates.end.dateTime).toISOString(),
          timeZone: updates.end.timeZone || USER_TIMEZONE,
        };
      }

      // 🗓️ Preparar cliente de Google Calendar
      const calendar = google.calendar({
        version: 'v3',
        auth: this.oauth2Client,
      });

      console.log('📝 Actualizando evento en Google Calendar...');
      console.log('📌 eventId:', eventId);
      console.log('📦 Datos normalizados:', eventUpdate);

      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId,
        requestBody: eventUpdate,
      });

      console.log('✅ Evento actualizado correctamente:', response.data.id);
      return response.data;
    } catch (err) {
      console.error('🔥 Error actualizando evento en Google Calendar:');
      console.error('Mensaje:', err.message);
      console.error('Código:', err.code);
      console.error('Detalles:', err.response?.data || err);

      if (err.code === 404) {
        throw new NotFoundException('Evento no encontrado en Google Calendar.');
      }
      if (err.code === 401 || err.code === 403) {
        throw new UnauthorizedException(
          'Token de Google inválido o sin permisos.',
        );
      }

      throw new InternalServerErrorException(
        `Error actualizando evento en Google Calendar: ${err.response?.data?.error?.message || err.message}`,
      );
    }
  }

  // ------------------------------------------------------
  // 🗑️ Eliminar evento del calendario
  // ------------------------------------------------------
  async deleteEvent(userId: string, eventId: string) {
    try {
      const user = await this.usersService.findOneById(userId);
      if (!user) throw new NotFoundException('Usuario no encontrado');

      if (!user.googleCalendarAccessToken || !user.googleCalendarRefreshToken) {
        throw new UnauthorizedException(
          'Cuenta de Google no conectada correctamente.',
        );
      }

      this.oauth2Client.setCredentials({
        access_token: user.googleCalendarAccessToken,
        refresh_token: user.googleCalendarRefreshToken,
      });

      const now = new Date();
      if (
        user.googleCalendarTokenExpiryDate &&
        user.googleCalendarTokenExpiryDate < now
      ) {
        console.log(
          '🔁 Token expirado, refrescando antes de eliminar evento...',
        );
        const newTokens = await this.refreshAccessToken(
          user.googleCalendarRefreshToken,
        );
        await this.usersService.updateGoogleCalendarTokens(userId, newTokens);
        this.oauth2Client.setCredentials(newTokens);
      }

      const calendar = google.calendar({
        version: 'v3',
        auth: this.oauth2Client,
      });
      await calendar.events.delete({ calendarId: 'primary', eventId });

      return { success: true };
    } catch (err) {
      console.error(
        '🔥 Error eliminando evento en Google Calendar:',
        err.response?.data || err.message,
      );
      throw new InternalServerErrorException(
        'Error eliminando evento en Google Calendar.',
      );
    }
  }
}
