import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './note.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private noteRepository: Repository<Note>,
  ) {}

  async create(createNoteDto: CreateNoteDto, userId: string): Promise<Note> {
    const newNote = this.noteRepository.create({
      ...createNoteDto,
      userId,
    });
    return this.noteRepository.save(newNote);
  }

  async findAllByUser(userId: string): Promise<Note[]> {
    return this.noteRepository.find({ where: { userId } });
  }

  async findOne(id: string, userId: string): Promise<Note> {
    const note = await this.noteRepository.findOne({ where: { id, userId } });
    if (!note) {
      throw new NotFoundException(`Note with ID "${id}" not found.`);
    }
    return note;
  }

  async update(
    id: string,
    updateNoteDto: UpdateNoteDto,
    userId: string,
  ): Promise<Note> {
    const note = await this.noteRepository.findOne({ where: { id, userId } });
    if (!note) {
      throw new NotFoundException(`Note with ID "${id}" not found.`);
    }

    const updatedNote = { ...note, ...updateNoteDto };
    return this.noteRepository.save(updatedNote);
  }

  async remove(id: string, userId: string): Promise<any> {
    const result = await this.noteRepository.delete({ id, userId });
    if (result.affected === 0) {
      throw new NotFoundException(`Note with ID "${id}" not found.`);
    }
    return { deleted: true };
  }
}
