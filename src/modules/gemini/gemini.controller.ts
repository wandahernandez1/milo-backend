import { Controller, Post, Body } from '@nestjs/common';
import { GeminiService } from './gemini.service';

@Controller('gemini')
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Post()
  async askGemini(
    @Body()
    body: {
      message: string;
      history?: any[];
      timezone?: string;
      localTime?: string;
    },
  ) {
    const { message, history = [], timezone, localTime } = body;

    return this.geminiService.askGemini(message, history, {
      timezone,
      localTime,
    });
  }
}
