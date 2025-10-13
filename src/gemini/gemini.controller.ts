// src/gemini/gemini.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { GeminiService } from './gemini.service';

@Controller('gemini')
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Post()
  async ask(@Body('message') message: string, @Body('history') history: any[]) {
    // ✅ Devolvemos la respuesta del servicio, que puede ser un JSON o una respuesta normal
    return this.geminiService.askGemini(message, history);
  }
}
