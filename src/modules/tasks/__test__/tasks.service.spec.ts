import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from '../tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task } from '../task.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

describe('TasksService', () => {
  let service: TasksService;
  let repository: jest.Mocked<Repository<Task>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    repository = module.get(getRepositoryToken(Task));
  });

  it('debería crear una tarea', async () => {
    const dto = { title: 'Nueva tarea', description: 'desc', completed: false };
    const mockTask = { id: '1', ...dto, userId: 'u1' };

    repository.create.mockReturnValue(mockTask as any);
    repository.save.mockResolvedValue(mockTask as any);

    const result = await service.create(dto, 'u1');
    expect(result).toEqual(mockTask);
    expect(repository.create).toHaveBeenCalledWith({ ...dto, userId: 'u1' });
  });

  it('debería devolver todas las tareas de un usuario', async () => {
    const tasks = [{ id: '1', title: 'T', description: '', completed: false }];
    repository.find.mockResolvedValue(tasks as any);

    const result = await service.findAllByUser('u1');
    expect(result).toEqual(tasks);
    expect(repository.find).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      select: ['id', 'title', 'description', 'completed', 'userId'],
      order: { id: 'DESC' },
    });
  });

  it('debería devolver una tarea existente', async () => {
    const task = { id: '1', title: 'ok', userId: 'u1', completed: false };
    repository.findOne.mockResolvedValue(task as any);

    const result = await service.findOne('1', 'u1');
    expect(result).toEqual(task);
  });

  it('debería lanzar NotFoundException si la tarea no existe', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.findOne('1', 'u1')).rejects.toThrow(NotFoundException);
  });

  it('debería actualizar una tarea existente', async () => {
    const task = { id: '1', title: 'old', userId: 'u1', completed: false };
    repository.findOne.mockResolvedValue(task as any);
    repository.save.mockResolvedValue({ ...task, title: 'new' } as any);

    const result = await service.update('1', { title: 'new' }, 'u1');
    expect(result.title).toBe('new');
  });

  it('debería eliminar una tarea', async () => {
    repository.delete.mockResolvedValue({ affected: 1 } as any);
    const result = await service.remove('1', 'u1');
    expect(result).toEqual({ message: 'Task deleted' });
  });

  it('debería lanzar error al eliminar tarea inexistente', async () => {
    repository.delete.mockResolvedValue({ affected: 0 } as any);
    await expect(service.remove('1', 'u1')).rejects.toThrow(NotFoundException);
  });
});
