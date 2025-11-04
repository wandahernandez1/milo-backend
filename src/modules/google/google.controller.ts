import {
  Controller,
  Get,
  Query,
  Res,
  Req,
  UseGuards,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { GoogleService } from './google.service';
import express from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// Esto incluye el campo 'natural_time' que viene del chat.
interface ChatEventDto {
  summary: string;
  description?: string;
  natural_time?: string;
  start?: any;
  end?: any;
}
@Controller('google')
export class GoogleController {
  constructor(private readonly googleService: GoogleService) {} // Endpoint para iniciar conexión con Google Calendar

  @UseGuards(JwtAuthGuard)
  @Get('auth')
  async redirectToGoogle(@Req() req: any) {
    const userId = req.user.id;
    const url = this.googleService.getAuthUrl(userId);

    return { url: url };
  }

  // Callback de Google
  @Get('callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: express.Response,
  ) {
    if (!state) {
      console.warn('⚠️ No se recibió state (ID de usuario).');
      return res.redirect(`${process.env.FRONTEND_URL}/calendar?error=no_user`);
    }

    try {
      const tokens = await this.googleService.getTokens(code, state);

      await this.googleService.markUserAsConnected(state);

      return res.redirect(
        `${process.env.FRONTEND_URL}/panel/calendario?connected=true`,
      );
    } catch (error) {
      console.error('❌ Error en callback de Google Calendar:', error);
      return res.redirect(
        `${process.env.FRONTEND_URL}/panel/calendario?error=token_failure`,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('events')
  async getEvents(
    @Req() req: any,
    @Query('timeMin') timeMin: string,
    @Query('timeMax') timeMax: string,
  ) {
    const userId = req.user.id;

    return this.googleService.getCalendarEvents(userId, timeMin, timeMax);
  }

  // Crear evento
  @Post('events')
  @UseGuards(JwtAuthGuard)
  async createEvent(@Req() req: any, @Body() body: ChatEventDto) {
    const userId = req.user.id;
    return this.googleService.createEvent(userId, body);
  }

  // Actualizar evento
  @UseGuards(JwtAuthGuard)
  @Patch('events/:id')
  async updateEvent(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const userId = req.user.id;
    return this.googleService.updateEvent(userId, id, body);
  }

  // Eliminar evento
  @UseGuards(JwtAuthGuard)
  @Delete('events/:id')
  async deleteEvent(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.googleService.deleteEvent(userId, id);
  }
}
