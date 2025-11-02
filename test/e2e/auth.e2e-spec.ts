import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('debería validar que el email es requerido', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          password: '12345678',
          name: 'Test User',
        })
        .expect(400);
    });

    it('debería validar que la contraseña es requerida', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          name: 'Test User',
        })
        .expect(400);
    });

    it('debería validar el formato del email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '12345678',
          name: 'Test User',
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('debería validar que el email es requerido', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          password: '12345678',
        })
        .expect(400);
    });

    it('debería retornar 401 con credenciales incorrectas', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'noexiste@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('/auth/me (GET)', () => {
    it('debería retornar 401 sin token de autenticación', () => {
      return request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('debería validar que el refresh_token es requerido', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({})
        .expect(400);
    });
  });
});
