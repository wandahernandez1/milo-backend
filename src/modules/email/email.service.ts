import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import { MailService } from '../../common/services/mail.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private configService: ConfigService,
    private mailService: MailService,
  ) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        '⚠️ SENDGRID_API_KEY no está configurada, usando solo Gmail API',
      );
      return;
    }

    sgMail.setApiKey(apiKey);
    this.logger.log('✅ SendGrid configurado correctamente');
  }

  /**
   * Envía un email usando SendGrid
   * @param to - Email del destinatario o array de emails
   * @param subject - Asunto del email
   * @param text - Contenido en texto plano
   * @param html - Contenido en HTML (opcional)
   */
  async sendEmail(
    to: string | string[],
    subject: string,
    text: string,
    html?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const sender = this.configService.get<string>('SENDGRID_SENDER');

      if (!sender) {
        throw new Error(
          'SENDGRID_SENDER no está configurado en las variables de entorno',
        );
      }

      const msg = {
        to,
        from: {
          email: sender,
          name: 'Milo Assistant',
        },
        subject,
        text,
        html: html || text,
        // Mejoras anti-spam
        replyTo: sender,
        trackingSettings: {
          clickTracking: {
            enable: false,
          },
          openTracking: {
            enable: false,
          },
        },
        mailSettings: {
          bypassListManagement: {
            enable: false,
          },
        },
      };

      const [response] = await sgMail.send(msg);

      this.logger.log(`✅ Email enviado exitosamente a ${to}`);

      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
      };
    } catch (error) {
      this.logger.error('❌ Error al enviar email:', error);

      // Extraer mensaje de error más útil
      let errorMessage = 'Error desconocido al enviar email';

      if (error.response) {
        errorMessage =
          error.response.body?.errors?.[0]?.message || error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Envía un email con plantilla personalizada
   */
  async sendTemplateEmail(
    to: string | string[],
    subject: string,
    templateData: {
      title: string;
      content: string;
      footer?: string;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 12px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${templateData.title}</h1>
          </div>
          <div class="content">
            ${templateData.content}
          </div>
          ${templateData.footer ? `<div class="footer">${templateData.footer}</div>` : ''}
        </body>
      </html>
    `;

    const text = `${templateData.title}\n\n${templateData.content.replace(/<[^>]*>/g, '')}`;

    return this.sendEmail(to, subject, text, html);
  }

  async sendBulkEmails(
    emails: Array<{
      to: string;
      subject: string;
      text: string;
      html?: string;
    }>,
  ): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      success: true,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const email of emails) {
      const result = await this.sendEmail(
        email.to,
        email.subject,
        email.text,
        email.html,
      );

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push(`${email.to}: ${result.error}`);
      }
    }

    results.success = results.failed === 0;

    this.logger.log(
      `📊 Emails masivos: ${results.sent} enviados, ${results.failed} fallidos`,
    );

    return results;
  }

  /**
   * Envía un email para recuperación de contraseña con sistema dual
   * Intenta SendGrid primero, si falla usa Gmail API como respaldo
   * @param email - Email del destinatario
   * @param resetToken - Token de recuperación
   * @param isFirstTimePassword - Si es la primera vez que establece contraseña (cuenta de Google)
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    isFirstTimePassword = false,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Títulos y mensajes personalizados según el tipo de usuario
    const title = isFirstTimePassword
      ? '🔐 Establece tu Contraseña'
      : '🔐 Recuperación de Contraseña';

    const mainMessage = isFirstTimePassword
      ? 'Te registraste con Google y ahora puedes establecer una contraseña para tener acceso dual a tu cuenta.'
      : 'Has solicitado restablecer tu contraseña de Milo Assistant.';

    const buttonText = isFirstTimePassword
      ? 'Establecer Contraseña'
      : 'Restablecer Contraseña';

    const additionalInfo = isFirstTimePassword
      ? '<p><strong>¿Por qué es útil?</strong><br>Con una contraseña podrás iniciar sesión tanto con Google como con email y contraseña.</p>'
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #667eea;
              color: white !important;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 12px;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 10px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
          </div>
          <div class="content">
            <p>Hola,</p>
            <p>${mainMessage}</p>
            ${additionalInfo}
            <p>Haz clic en el siguiente botón para ${isFirstTimePassword ? 'establecer' : 'crear'} tu contraseña:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">${buttonText}</a>
            </div>

            <div class="warning">
              <strong>⚠️ Importante:</strong> Este enlace expirará en 1 hora.
            </div>

            ${!isFirstTimePassword ? '<p>Si no solicitaste este cambio, puedes ignorar este email de forma segura.</p>' : '<p>Podrás seguir usando Google para iniciar sesión, esta contraseña es opcional y te da acceso dual.</p>'}
            
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
              <a href="${resetUrl}">${resetUrl}</a>
            </p>

            <p style="margin-top: 20px; font-size: 11px; color: #999;">
              💡 <strong>Consejo:</strong> Si este email está en spam, márcalo como "No es spam" para recibir futuros emails en tu bandeja principal.
            </p>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Milo Assistant. Todos los derechos reservados.<br>
            Este es un email automático, por favor no respondas a este mensaje.
          </div>
        </body>
      </html>
    `;

    const text = `
${title} - Milo Assistant

Hola,

${mainMessage}

${isFirstTimePassword ? '¿Por qué es útil? Con una contraseña podrás iniciar sesión tanto con Google como con email y contraseña.' : ''}

Para ${isFirstTimePassword ? 'establecer' : 'crear'} tu contraseña, visita el siguiente enlace:
${resetUrl}

⚠️ Este enlace expirará en 1 hora.

${!isFirstTimePassword ? 'Si no solicitaste este cambio, puedes ignorar este email de forma segura.' : 'Podrás seguir usando Google para iniciar sesión, esta contraseña es opcional.'}

---
© ${new Date().getFullYear()} Milo Assistant
    `;

    this.logger.log(
      `📧 Enviando email de ${isFirstTimePassword ? 'establecimiento' : 'recuperación'} de contraseña a ${email}`,
    );

    // Sistema dual: Intenta SendGrid primero, Gmail API como respaldo
    this.logger.log('📨 Intento 1: SendGrid...');
    const sendGridResult = await this.sendEmail(
      email,
      title,
      text.trim(),
      html,
    );

    if (sendGridResult.success) {
      this.logger.log('✅ Email enviado exitosamente con SendGrid');
      return sendGridResult;
    }

    // Si SendGrid falla, intentar con Gmail API
    this.logger.warn(
      `⚠️ SendGrid falló, intentando con Gmail API como respaldo...`,
    );
    this.logger.warn(`Error de SendGrid: ${sendGridResult.error}`);

    try {
      this.logger.log('📨 Intento 2: Gmail API...');
      await this.mailService.sendPasswordResetEmail(email, resetToken);
      this.logger.log('✅ Email enviado exitosamente con Gmail API');
      return {
        success: true,
        messageId: 'gmail-api',
      };
    } catch (gmailError) {
      this.logger.error('❌ Gmail API también falló:', gmailError.message);
      return {
        success: false,
        error: `Ambos servicios fallaron. SendGrid: ${sendGridResult.error}, Gmail: ${gmailError.message}`,
      };
    }
  }
}
