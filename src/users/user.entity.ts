import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Note } from '../notes/note.entity';
import { Task } from '../tasks/task.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  // Relación con notas
  @OneToMany(() => Note, (note) => note.user)
  notes: Note[];
    // Relación con tareas
  @OneToMany(() => Task, (task) => task.user)
  tasks: Task[];
}
