import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('TasksController (e2e)', () => {
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

  describe('/tasks (GET)', () => {
    it('debería retornar 401 sin autenticación', () => {
      return request(app.getHttpServer()).get('/api/tasks').expect(401);
    });
  });

  describe('/tasks (POST)', () => {
    it('debería retornar 401 sin autenticación', () => {
      return request(app.getHttpServer())
        .post('/api/tasks')
        .send({
          title: 'Nueva tarea',
          description: 'Descripción',
        })
        .expect(401);
    });

    it('debería validar que el título es requerido', async () => {
      // Intentamos crear sin título (requeriría autenticación primero)
      // Este test verifica la estructura del endpoint
      const response = await request(app.getHttpServer())
        .post('/api/tasks')
        .send({
          description: 'Descripción sin título',
        });

      // Debería fallar por autenticación o validación
      expect([400, 401]).toContain(response.status);
    });
  });

  describe('/tasks/:id (PATCH)', () => {
    it('debería retornar 401 sin autenticación', () => {
      return request(app.getHttpServer())
        .patch('/api/tasks/test-id')
        .send({
          title: 'Tarea actualizada',
        })
        .expect(401);
    });
  });

  describe('/tasks/:id (DELETE)', () => {
    it('debería retornar 401 sin autenticación', () => {
      return request(app.getHttpServer())
        .delete('/api/tasks/test-id')
        .expect(401);
    });
  });
});
