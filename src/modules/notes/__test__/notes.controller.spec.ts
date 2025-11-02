import { Test, TestingModule } from '@nestjs/testing';
import { NotesController } from '../notes.controller';
import { NotesService } from '../notes.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

describe('NotesController', () => {
  let controller: NotesController;
  let service: NotesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotesController],
      providers: [
        {
          provide: NotesService,
          useValue: {
            create: jest.fn(),
            findAllByUser: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotesController>(NotesController);
    service = module.get<NotesService>(NotesService);
  });

  it('debería crear una nota', async () => {
    const dto = { title: 'T', content: 'C' };
    const mockNote = { id: '1', ...dto };
    (service.create as jest.Mock).mockResolvedValue(mockNote);

    const result = await controller.create(dto, { user: { id: 'u1' } });
    expect(result).toEqual(mockNote);
    expect(service.create).toHaveBeenCalledWith(dto, 'u1');
  });

  it('debería obtener todas las notas del usuario', async () => {
    const notes = [{ id: '1', title: 'T', content: 'C' }];
    (service.findAllByUser as jest.Mock).mockResolvedValue(notes);

    const result = await controller.findAll({ user: { id: 'u1' } });
    expect(result).toEqual(notes);
  });

  it('debería obtener una nota por id', async () => {
    const note = { id: '1', title: 'T', content: 'C' };
    (service.findOne as jest.Mock).mockResolvedValue(note);

    const result = await controller.findOne('1', { user: { id: 'u1' } });
    expect(result).toEqual(note);
  });

  it('debería actualizar una nota', async () => {
    const updated = { id: '1', title: 'new', content: 'C' };
    (service.update as jest.Mock).mockResolvedValue(updated);

    const result = await controller.update(
      '1',
      { title: 'new' },
      { user: { id: 'u1' } },
    );
    expect(result).toEqual(updated);
  });

  it('debería eliminar una nota', async () => {
    (service.remove as jest.Mock).mockResolvedValue({ deleted: true });
    const result = await controller.remove('1', { user: { id: 'u1' } });
    expect(result).toEqual({ deleted: true });
  });
});
