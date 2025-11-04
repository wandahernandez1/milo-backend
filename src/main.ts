import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');

  // Configuración de CORS más flexible
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://milo-frontend-six.vercel.app',
    process.env.FRONTEND_URL, // Agregar variable de entorno para flexibilidad
  ].filter(Boolean); // Eliminar valores undefined

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origin (mobile apps, curl, etc)
      if (!origin) return callback(null, true);

      // Permitir orígenes de Vercel (*.vercel.app)
      if (origin.includes('vercel.app')) {
        return callback(null, true);
      }

      // Verificar si el origin está en la lista permitida
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }

      logger.warn(`❌ Origen bloqueado por CORS: ${origin}`);
      callback(new Error('No permitido por CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Authorization'],
    maxAge: 3600, // Cache preflight requests por 1 hora
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT ? Number(process.env.PORT) : 8080;

  await app.listen(port);
  logger.log(`🚀 Servidor corriendo en puerto ${port}`);
  logger.log(`🌍 Redirección Google: ${process.env.GOOGLE_REDIRECT_URI}`);
}

bootstrap();
