import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { GeminiModule } from './modules/gemini/gemini.module';
import { EventosModule } from './modules/eventos/eventos.module';
import { NotesModule } from './modules/notes/notes.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { GoogleModule } from './modules/google/google.module';

import { User } from './modules/users/user.entity';
import { Note } from './modules/notes/note.entity';
import { Task } from './modules/tasks/task.entity';

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
      synchronize: false,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    }),
    AuthModule,
    UsersModule,
    GeminiModule,
    NotesModule,
    TasksModule,
    GoogleModule,
    EventosModule,
  ],
})
export class AppModule {}
