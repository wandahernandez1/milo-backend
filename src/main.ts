import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // Habilita CORS
  app.enableCors({
    origin: 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // ✅ Activar validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina propiedades extra
      forbidNonWhitelisted: true, // lanza error si hay propiedades no permitidas
      transform: true, // transforma automáticamente a los tipos definidos en el DTO
    }),
  );

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
