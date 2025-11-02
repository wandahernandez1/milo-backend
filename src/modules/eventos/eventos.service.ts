import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EventosService {
  private readonly logger = new Logger(EventosService.name);

  async syncFromGoogle(userId: string, eventos: any[]) {
    this.logger.log(
      `🔄 Sincronizando ${eventos.length} eventos para usuario ${userId}`,
    );
    // Lógica para sincronizar con la DB (por ahora lo dejamos en consola)
    return eventos;
  }

  async registrarEvento(userId: string, evento: any) {
    this.logger.log(
      `📅 Registrando nuevo evento para usuario ${userId}: ${evento.summary}`,
    );
    // Acá podrías guardarlo en la base de datos si querés persistirlo localmente
  }
}
