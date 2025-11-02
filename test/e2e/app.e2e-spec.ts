import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Aplicamos el mismo prefijo global que la app real
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('debería validar que la aplicación se inicia correctamente', () => {
    expect(app).toBeDefined();
  });

  it('debería responder a rutas no existentes con 404', () => {
    return request(app.getHttpServer())
      .get('/api/ruta-inexistente-12345')
      .expect(404);
  });

  it('debería requerir autenticación para rutas protegidas', () => {
    return request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });
});
