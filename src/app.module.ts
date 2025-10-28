import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GeminiModule } from './gemini/gemini.module';
import { NotesModule } from './notes/notes.module';
import { User } from './users/user.entity';
import { Note } from './notes/note.entity';

import { Task } from './tasks/task.entity';
import { TasksModule } from './tasks/tasks.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DATABASE_HOST || 'localhost',
      port: Number(process.env.DATABASE_PORT) || 3306,
      username: process.env.DATABASE_USERNAME || 'root',
      password: process.env.DATABASE_PASSWORD || '123456',
      database: process.env.DATABASE_NAME || 'basededatosmilo',
        entities: [User, Note, Task],
      synchronize: true, // ⚠️ Solo en desarrollo
    }),
    GeminiModule,
    AuthModule,
    UsersModule,
    NotesModule,
    TasksModule,
  ],
})
export class AppModule {}
