import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import {
  SendEmailDto,
  SendBulkEmailDto,
  SendTemplateEmailDto,
} from './dto/send-email.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('email')
@UseGuards(JwtAuthGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  async sendEmail(@Body() sendEmailDto: SendEmailDto) {
    const result = await this.emailService.sendEmail(
      sendEmailDto.to,
      sendEmailDto.subject,
      sendEmailDto.text,
      sendEmailDto.html,
    );

    if (!result.success) {
      return {
        success: false,
        message: 'Error al enviar el email',
        error: result.error,
      };
    }

    return {
      success: true,
      message: 'Email enviado exitosamente',
      messageId: result.messageId,
    };
  }

  @Post('send-template')
  async sendTemplateEmail(@Body() sendTemplateDto: SendTemplateEmailDto) {
    const result = await this.emailService.sendTemplateEmail(
      sendTemplateDto.to,
      sendTemplateDto.subject,
      {
        title: sendTemplateDto.title,
        content: sendTemplateDto.content,
        footer: sendTemplateDto.footer,
      },
    );

    if (!result.success) {
      return {
        success: false,
        message: 'Error al enviar el email',
        error: result.error,
      };
    }

    return {
      success: true,
      message: 'Email enviado exitosamente',
      messageId: result.messageId,
    };
  }

  @Post('send-bulk')
  async sendBulkEmails(@Body() sendBulkDto: SendBulkEmailDto) {
    const result = await this.emailService.sendBulkEmails(sendBulkDto.emails);

    return {
      success: result.success,
      message: `Enviados: ${result.sent}, Fallidos: ${result.failed}`,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
    };
  }
}
