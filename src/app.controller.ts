import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): any {
    return {
      success: true,
      message: 'Milo Backend API is running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        tasks: '/api/tasks',
        notes: '/api/notes',
        events: '/api/eventos',
        gemini: '/api/gemini',
      },
    };
  }

  @Get('health')
  healthCheck(): any {
    return {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
