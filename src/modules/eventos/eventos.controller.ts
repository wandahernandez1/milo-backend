import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EventosService } from './eventos.service';
import { GoogleService } from '../google/google.service';
import * as chrono from 'chrono-node';

@Controller('eventos')
export class EventosController {
  constructor(
    private readonly eventosService: EventosService,
    private readonly googleService: GoogleService,
  ) {}

  // 🗓️ Sincronizar con Google Calendar
  @UseGuards(JwtAuthGuard)
  @Get('sync')
  async syncEventos(@Req() req: any) {
    const userId = req.user.id;
    const now = new Date();
    const timeMin = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const timeMax = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const googleEventos = await this.googleService.getCalendarEvents(
      userId,
      timeMin,
      timeMax,
    );

    await this.eventosService.syncFromGoogle(userId, googleEventos);

    return { eventos: googleEventos };
  }

  // ✨ Crear evento (desde chat o desde formulario)
  @UseGuards(JwtAuthGuard)
  @Post()
  async createEvento(@Req() req: any, @Body() body: any) {
    console.log('📦 Body recibido:', JSON.stringify(body, null, 2));
    const userId = req.user.id;
    const { summary, description, natural_time, start, end } = body;

    console.log('📦 Body recibido:', body);

    if (!summary) {
      throw new BadRequestException(
        'El evento debe tener un título (summary).',
      );
    }

    let eventStart = start;
    let eventEnd = end;

    // 🧠 Permitir usar summary como texto natural si no viene natural_time
    const textoFecha = natural_time || summary;

    if (textoFecha && (!start || !end)) {
      const parsed = chrono.parseDate(textoFecha, new Date(), {
        forwardDate: true,
      });

      if (!parsed) {
        throw new BadRequestException(
          'No pude entender la fecha u hora del evento.',
        );
      }

      const startISO = parsed.toISOString();
      const endISO = new Date(parsed.getTime() + 60 * 60 * 1000).toISOString(); // +1h

      eventStart = {
        dateTime: startISO,
        timeZone: 'America/Argentina/Buenos_Aires',
      };
      eventEnd = {
        dateTime: endISO,
        timeZone: 'America/Argentina/Buenos_Aires',
      };
    }

    if (!eventStart || !eventEnd) {
      throw new BadRequestException(
        'El evento debe tener un campo "natural_time" (chat) o "start" y "end" válidos (modal).',
      );
    }

    // 👉 Crear el evento en Google Calendar
    const createdEvent = await this.googleService.createCalendarEvent(userId, {
      summary,
      description,
      start: eventStart,
      end: eventEnd,
    });

    // 🗃️ Registrar localmente si querés mantener una copia
    await this.eventosService.registrarEvento(userId, createdEvent);

    return {
      message: '✅ Evento creado correctamente.',
      evento: createdEvent,
    };
  }
}
