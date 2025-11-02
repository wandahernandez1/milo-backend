import { Test, TestingModule } from '@nestjs/testing';
import { NotesService } from '../notes.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Note } from '../note.entity';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

describe('NotesService', () => {
  let service: NotesService;
  let repository: jest.Mocked<Repository<Note>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        {
          provide: getRepositoryToken(Note),
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

    service = module.get<NotesService>(NotesService);
    repository = module.get(getRepositoryToken(Note));
  });

  it('debería crear una nota', async () => {
    const dto = { title: 'Test', content: 'Contenido' };
    const note = { id: '1', ...dto, userId: '123' };

    repository.create.mockReturnValue(note as any);
    repository.save.mockResolvedValue(note as any);

    const result = await service.create(dto, '123');
    expect(result).toEqual(note);
    expect(repository.create).toHaveBeenCalledWith({ ...dto, userId: '123' });
    expect(repository.save).toHaveBeenCalledWith(note);
  });

  it('debería devolver todas las notas de un usuario', async () => {
    const notes = [{ id: '1', title: 'n1', content: 'c1', userId: '123' }];
    repository.find.mockResolvedValue(notes as any);

    const result = await service.findAllByUser('123');
    expect(result).toEqual(notes);
  });

  it('debería devolver una nota si existe', async () => {
    const note = { id: '1', title: 'Test', content: 'ok', userId: '123' };
    repository.findOne.mockResolvedValue(note as any);

    const result = await service.findOne('1', '123');
    expect(result).toEqual(note);
  });

  it('debería lanzar NotFoundException si no existe la nota', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.findOne('1', '123')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('debería actualizar una nota existente', async () => {
    const note = { id: '1', title: 'old', content: 'old', userId: '123' };
    repository.findOne.mockResolvedValue(note as any);
    repository.save.mockResolvedValue({ ...note, title: 'new' } as any);

    const result = await service.update('1', { title: 'new' }, '123');
    expect(result.title).toBe('new');
  });

  it('debería eliminar una nota', async () => {
    repository.delete.mockResolvedValue({ affected: 1 } as any);
    const result = await service.remove('1', '123');
    expect(result).toEqual({ deleted: true });
  });

  it('debería lanzar error al eliminar una nota inexistente', async () => {
    repository.delete.mockResolvedValue({ affected: 0 } as any);
    await expect(service.remove('1', '123')).rejects.toThrow(NotFoundException);
  });
});
