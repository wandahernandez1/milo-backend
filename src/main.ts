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

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://milo-frontend-six.vercel.app',
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (origin.includes('vercel.app')) {
        return callback(null, true);
      }

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
    maxAge: 3600,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 3000;
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

  await app.listen(port, host);
  logger.log(`🚀 Servidor corriendo en ${host}:${port}`);
  logger.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`🌍 Redirección Google: ${process.env.GOOGLE_REDIRECT_URI}`);
  logger.log(
    `🔑 Google Client ID configurado: ${process.env.GOOGLE_CLIENT_ID ? '✅ Sí' : '❌ No'}`,
  );
  logger.log(
    `🔒 JWT Secret configurado: ${process.env.JWT_SECRET ? '✅ Sí' : '❌ No'}`,
  );
  logger.log(`📦 Orígenes CORS permitidos: ${allowedOrigins.join(', ')}`);
}

bootstrap();
