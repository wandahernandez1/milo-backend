import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Note } from '../notes/note.entity';
import { Task } from '../tasks/task.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  fullName: string | null;

  @Column({ type: 'date', nullable: true })
  birthDate: string | null;

  @Column({ type: 'varchar', unique: true, length: 150, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string | null;

  @Column({ type: 'varchar', length: 7, nullable: true, default: '#6c757d' })
  avatarColor: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  googleAvatar: string | null;

  @Column({ type: 'text', nullable: true })
  googleCalendarAccessToken: string | null;

  @Column({ type: 'text', nullable: true })
  googleCalendarRefreshToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  googleCalendarTokenExpiryDate: Date | null;

  @Column({ type: 'boolean', default: false })
  googleConnected: boolean;

  @OneToMany(() => Note, (note) => note.user)
  notes: Note[];

  @OneToMany(() => Task, (task) => task.user)
  tasks: Task[];
}
