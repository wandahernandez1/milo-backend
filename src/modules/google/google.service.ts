import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/user.service';
import * as chrono from 'chrono-node';
import { format, addHours, addDays } from 'date-fns';

const USER_TIMEZONE = 'America/Argentina/Buenos_Aires';

interface CalendarEventInput {
  summary: string;
  description?: string;
  natural_time?: string;
  start?: { dateTime: string; timeZone: string } | { date: string };
  end?: { dateTime: string; timeZone: string } | { date: string };
}

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);
  private oauth2Client;
  createCalendarEvent: any;

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_REDIRECT_URI'),
    );
  }

  private parseNaturalTime(
    naturalTime: string,
    timezone: string,
  ): { start: any; end: any } {
    this.logger.log(`🔍 Parseando tiempo natural: "${naturalTime}"`);

    const today = new Date();
    let textToProcess = naturalTime.trim();

    // Normalización de formatos de hora en español (ORDEN IMPORTANTE)
    textToProcess = textToProcess
      // Primero: manejar horas con minutos + hs (ej: "20:30hs")
      .replace(/(\d{1,2}):(\d{2})\s*hs?\b/gi, '$1:$2')
      // Segundo: manejar horas sin minutos + hs (ej: "20hs")
      .replace(/(\d{1,2})\s*hs?\b/gi, '$1:00')
      // Tercero: "de la tarde/mañana/noche"
      .replace(/(\d{1,2})\s*de\s+la\s+tarde/gi, (match, hour) => {
        const h = parseInt(hour);
        return h < 12 ? `${h + 12}:00` : `${h}:00`;
      })
      .replace(/(\d{1,2})\s*de\s+la\s+ma[ñn]ana/gi, '$1:00')
      .replace(/(\d{1,2})\s*de\s+la\s+noche/gi, (match, hour) => {
        const h = parseInt(hour);
        return h < 12 ? `${h + 12}:00` : `${h}:00`;
      })
      // Cuarto: manejar "a las XX" sin ":"
      .replace(/a\s+las?\s+(\d{1,2})(?!:)/gi, 'a las $1:00')
      // Quinto: normalizar "que viene" para chrono
      .replace(
        /\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s+que\s+viene\b/gi,
        'próximo $1',
      );

    this.logger.log(`📝 Texto normalizado: "${textToProcess}"`);

    const hasTime = /\d{1,2}:\d{2}/i.test(textToProcess);
    const hasDay =
      /(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|ma[ñn]ana|hoy|próximo|\d{1,2})/i.test(
        textToProcess,
      );

    this.logger.log(
      `🔎 Detección - Tiene hora: ${hasTime}, Tiene día: ${hasDay}`,
    );

    // Si tiene día pero no hora, agregar hora por defecto
    if (hasDay && !hasTime) {
      textToProcess = `${textToProcess} a las 9:00`;
      this.logger.log(`📅 Agregando hora por defecto: "${textToProcess}"`);
    }

    const parsedDate = chrono.es.parse(textToProcess, today, {
      forwardDate: true,
    });

    if (!parsedDate || parsedDate.length === 0) {
      this.logger.error(
        `❌ No se pudo parsear: "${naturalTime}" (normalizado: "${textToProcess}")`,
      );
      throw new BadRequestException(
        'No pude entender la fecha y hora proporcionada. Intenta con más detalles, por ejemplo: "mañana a las 15" o "el viernes 6 a las 18".',
      );
    }

    this.logger.log(`✅ Fecha parseada correctamente: ${parsedDate[0].text}`);
    this.logger.log(
      `📊 Datos del parse: ${JSON.stringify({
        hasHour: parsedDate[0].start.isCertain('hour'),
        hasMinute: parsedDate[0].start.isCertain('minute'),
        hasDay: parsedDate[0].start.isCertain('day'),
      })}`,
    );

    const start = parsedDate[0].start.date();
    let end = parsedDate[0].end ? parsedDate[0].end.date() : addHours(start, 1);

    const isFullDay =
      !parsedDate[0].start.isCertain('hour') &&
      !parsedDate[0].end?.isCertain('hour');

    if (isFullDay) {
      const startDate = format(start, 'yyyy-MM-dd');
      const endDate = format(addDays(start, 1), 'yyyy-MM-dd');

      this.logger.log(`📆 Evento de día completo: ${startDate} → ${endDate}`);

      return {
        start: { date: startDate },
        end: { date: endDate },
      };
    }

    this.logger.log(
      `⏰ Evento con hora específica: ${start.toISOString()} → ${end.toISOString()}`,
    );

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

  async getTokens(code: string, state: string): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token) {
        throw new UnauthorizedException('Error al obtener tokens de Google.');
      }

      await this.usersService.updateGoogleCalendarTokens(state, tokens);
      await this.markUserAsConnected(state);
    } catch (err) {
      console.error('🔥 Error dentro de getTokens():', err);
      throw err;
    }
  }

  async markUserAsConnected(userId: string) {
    const user = await this.usersService.findOneById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    user.googleConnected = true;
    await this.usersService['usersRepository'].save(user);
  }
  async refreshAccessToken(refreshToken: string) {
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_REDIRECT_URI'),
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });

    try {
      console.log('🔄 Intentando refrescar token de Google...');
      const { credentials } = await oauth2Client.refreshAccessToken();
      console.log('✅ Token refrescado exitosamente');
      return credentials;
    } catch (error) {
      console.error(
        '❌ Error refrescando token:',
        error.response?.data || error.message,
      );
      throw new UnauthorizedException(
        'No se pudo refrescar el token de Google. Por favor, reconecta tu cuenta.',
      );
    }
  }

  async getCalendarEvents(userId: string, timeMin: string, timeMax: string) {
    try {
      const user = await this.usersService.findOneById(userId);
      if (!user) {
        console.error(`❌ Usuario ${userId} no encontrado`);
        throw new NotFoundException('Usuario no encontrado');
      }

      if (!user.googleCalendarAccessToken || !user.googleCalendarRefreshToken) {
        console.error('❌ Tokens de Google Calendar no encontrados en la BD');
        throw new UnauthorizedException(
          'Cuenta de Google no conectada correctamente. Por favor, reconecta tu cuenta.',
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
        maxResults: 250,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const eventCount = eventsResponse.data.items?.length || 0;

      return eventsResponse.data.items || [];
    } catch (err) {
      console.error('❌ Error en getCalendarEvents:', err.message);
      throw new UnauthorizedException(
        `Error obteniendo eventos: ${err.message}`,
      );
    }
  }

  async createEvent(userId: string, eventData: CalendarEventInput) {
    try {
      const user = await this.usersService.findOneById(userId);
      if (!user) throw new NotFoundException('Usuario no encontrado');

      if (!user.googleCalendarAccessToken || !user.googleCalendarRefreshToken) {
        throw new UnauthorizedException(
          'Tu cuenta de Google Calendar no está conectada. Por favor, ve a tu perfil y conecta tu cuenta de Google para poder crear eventos.',
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
        try {
          const newTokens = await this.refreshAccessToken(
            user.googleCalendarRefreshToken,
          );
          await this.usersService.updateGoogleCalendarTokens(userId, newTokens);
          this.oauth2Client.setCredentials(newTokens);
        } catch (refreshErr) {
          throw new UnauthorizedException(
            'No se pudo refrescar el token de Google.',
          );
        }
      }
      let finalEventBody: any = {
        summary: eventData.summary || 'Evento sin título',
        description: eventData.description || '',
      };

      if (eventData.natural_time) {
        const timeObjects = this.parseNaturalTime(
          eventData.natural_time,
          USER_TIMEZONE,
        );
        finalEventBody = { ...finalEventBody, ...timeObjects };
      } else if (eventData.start && eventData.end) {
        finalEventBody.start = eventData.start;
        finalEventBody.end = eventData.end;
      } else {
        throw new BadRequestException(
          'El evento debe tener un campo "natural_time" (chat) o "start" y "end" válidos (modal).',
        );
      }

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
      } else if (finalEventBody.start?.date && finalEventBody.end?.date) {
        const startDateString = finalEventBody.start.date.split('T')[0];
        const endDateString = finalEventBody.end.date.split('T')[0];

        if (startDateString === endDateString) {
          const nextDay = new Date(startDateString);
          nextDay.setDate(nextDay.getDate() + 1);
          finalEventBody.end.date = nextDay.toISOString().split('T')[0];
        }
      }

      const calendar = google.calendar({
        version: 'v3',
        auth: this.oauth2Client,
      });

      const insertRes = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: finalEventBody,
      });

      return insertRes.data;
    } catch (err) {
      this.logger.error(' Error creando evento en Google Calendar:');
      this.logger.error(`Mensaje: ${err.message}`);
      this.logger.error(`Código: ${err.code}`);
      this.logger.error(`Stack: ${err.stack}`);

      if (err.response?.data) {
        this.logger.error(
          '📥 Respuesta de Google:',
          JSON.stringify(err.response.data, null, 2),
        );
      }

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
        `Error creando evento en Google Calendar: ${err.message}`,
      );
    }
  }
  async updateEvent(userId: string, eventId: string, updates: any) {
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
        const tokens = await this.refreshAccessToken(
          user.googleCalendarRefreshToken,
        );
        await this.usersService.updateGoogleCalendarTokens(userId, tokens);
        this.oauth2Client.setCredentials(tokens);
      }

      const eventUpdate: any = {
        summary: updates.summary || 'Sin título',
        description: updates.description || '',
        start: updates.start,
        end: updates.end,
      };

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

      const calendar = google.calendar({
        version: 'v3',
        auth: this.oauth2Client,
      });

      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId,
        requestBody: eventUpdate,
      });

      return response.data;
    } catch (err) {
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
      throw new InternalServerErrorException(
        'Error eliminando evento en Google Calendar.',
      );
    }
  }
}
