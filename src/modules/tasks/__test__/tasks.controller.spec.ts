import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from '../tasks.controller';
import { TasksService } from '../tasks.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

describe('TasksController', () => {
  let controller: TasksController;
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: {
            create: jest.fn(),
            findAllByUser: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TasksController>(TasksController);
    service = module.get<TasksService>(TasksService);
  });

  it('debería obtener todas las tareas del usuario', async () => {
    const tasks = [{ id: '1', title: 'Tarea', completed: false }];
    (service.findAllByUser as jest.Mock).mockResolvedValue(tasks);

    const result = await controller.getTasks({ user: { id: 'u1' } });
    expect(result).toEqual(tasks);
  });

  it('debería crear una nueva tarea', async () => {
    const dto = { title: 'Tarea', description: 'desc' };
    const mockTask = { id: '1', ...dto };
    (service.create as jest.Mock).mockResolvedValue(mockTask);

    const result = await controller.createTask(dto, { user: { id: 'u1' } });
    expect(result).toEqual(mockTask);
    expect(service.create).toHaveBeenCalledWith(dto, 'u1');
  });

  it('debería actualizar una tarea', async () => {
    const updated = { id: '1', title: 'Nueva', completed: false };
    (service.update as jest.Mock).mockResolvedValue(updated);

    const result = await controller.updateTask(
      '1',
      { title: 'Nueva' },
      { user: { id: 'u1' } },
    );
    expect(result).toEqual(updated);
    expect(service.update).toHaveBeenCalledWith('1', { title: 'Nueva' }, 'u1');
  });

  it('debería eliminar una tarea', async () => {
    (service.remove as jest.Mock).mockResolvedValue({
      message: 'Task deleted',
    });

    const result = await controller.deleteTask('1', { user: { id: 'u1' } });
    expect(result).toEqual({ message: 'Task deleted' });
    expect(service.remove).toHaveBeenCalledWith('1', 'u1');
  });
});
