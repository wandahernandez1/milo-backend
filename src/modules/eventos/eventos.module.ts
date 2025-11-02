import { Module } from '@nestjs/common';
import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';
import { GoogleModule } from '../google/google.module'; // 👈 Asegurate de importar esto

@Module({
  imports: [GoogleModule], // 👈 Agregá el módulo que exporta GoogleService
  controllers: [EventosController],
  providers: [EventosService],
})
export class EventosModule {}
