import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { MailService } from '../../common/services/mail.service';

@Module({
  providers: [EmailService, MailService],
  controllers: [EmailController],
  exports: [EmailService, MailService], // Exportar ambos servicios
})
export class EmailModule {}
