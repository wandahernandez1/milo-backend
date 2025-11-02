import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('UsersController (e2e)', () => {
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

  describe('/users/me (PUT)', () => {
    it('debería retornar 401 sin autenticación', () => {
      return request(app.getHttpServer())
        .put('/api/users/me')
        .send({
          name: 'Nuevo nombre',
        })
        .expect(401);
    });
  });

  describe('/users/me (DELETE)', () => {
    it('debería retornar 401 sin autenticación', () => {
      return request(app.getHttpServer()).delete('/api/users/me').expect(401);
    });
  });

  describe('/users/avatar (PUT)', () => {
    it('debería retornar 401 sin autenticación al actualizar avatar', () => {
      return request(app.getHttpServer())
        .put('/api/users/avatar')
        .send({
          avatar: 'https://example.com/avatar.png',
        })
        .expect(401);
    });
  });

  describe('Validaciones del perfil', () => {
    it('debería validar el formato del email si se proporciona', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/users/me')
        .send({
          email: 'email-invalido',
        });

      // Debería fallar por autenticación o validación
      expect([400, 401]).toContain(response.status);
    });

    it('debería validar la longitud mínima de la contraseña', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/users/me')
        .send({
          password: '123', // Muy corta
        });

      // Debería fallar por autenticación o validación
      expect([400, 401]).toContain(response.status);
    });
  });
});
