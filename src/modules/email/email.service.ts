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

    const title = isFirstTimePassword
      ? 'Establecimiento de Contraseña'
      : 'Recuperación de Contraseña';

    const mainMessage = isFirstTimePassword
      ? 'Ha solicitado establecer una contraseña para su cuenta registrada con Google. Esta acción le permitirá acceder a su cuenta mediante dos métodos de autenticación diferentes.'
      : 'Ha solicitado restablecer la contraseña de su cuenta en Milo Assistant.';

    const buttonText = isFirstTimePassword
      ? 'Establecer Contraseña'
      : 'Restablecer Contraseña';

    const additionalInfo = isFirstTimePassword
      ? '<p style="background: #f0f4f8; padding: 15px; border-left: 3px solid #4a5568; margin: 20px 0;"><strong>Beneficios del acceso dual:</strong> Podrá iniciar sesión tanto con su cuenta de Google como con correo electrónico y contraseña.</p>'
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #2d3748;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f7fafc;
            }
            .container {
              background: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .header {
              background: #2d3748;
              color: #ffffff;
              padding: 30px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .brand {
              font-size: 14px;
              color: #cbd5e0;
              margin-top: 8px;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 16px;
              margin-bottom: 20px;
            }
            .message {
              color: #4a5568;
              margin-bottom: 20px;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .button {
              display: inline-block;
              padding: 14px 40px;
              background: #2d3748;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 4px;
              font-weight: 600;
              font-size: 16px;
            }
            .button:hover {
              background: #1a202c;
            }
            .info-box {
              background: #edf2f7;
              border-left: 4px solid #4a5568;
              padding: 15px;
              margin: 20px 0;
            }
            .info-box strong {
              color: #2d3748;
            }
            .link-section {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              font-size: 13px;
              color: #718096;
            }
            .link-section a {
              color: #4299e1;
              word-break: break-all;
            }
            .footer {
              background: #f7fafc;
              text-align: center;
              padding: 20px;
              color: #718096;
              font-size: 12px;
              border-top: 1px solid #e2e8f0;
            }
            .footer-brand {
              font-weight: 600;
              color: #2d3748;
              margin-bottom: 8px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${title}</h1>
              <div class="brand">MiloAssistant Security</div>
            </div>
            
            <div class="content">
              <div class="greeting">Estimado usuario,</div>
              
              <p class="message">${mainMessage}</p>
              
              ${additionalInfo}
              
              <p class="message">Para proceder con ${isFirstTimePassword ? 'el establecimiento' : 'el restablecimiento'} de su contraseña, haga clic en el siguiente botón:</p>
              
              <div class="button-container">
                <a href="${resetUrl}" class="button">${buttonText}</a>
              </div>

              <div class="info-box">
                <strong>Información importante:</strong> Este enlace de seguridad expirará en 1 hora por motivos de protección de su cuenta.
              </div>

              <p class="message">
                ${!isFirstTimePassword ? 'Si usted no solicitó este cambio, puede ignorar este correo electrónico de forma segura. Su cuenta permanecerá protegida.' : 'Después de establecer su contraseña, podrá continuar utilizando su cuenta de Google para iniciar sesión. Esta contraseña proporciona una opción adicional de acceso.'}
              </p>
              
              <div class="link-section">
                <p><strong>Enlace alternativo:</strong></p>
                <p>Si el botón no funciona, copie y pegue el siguiente enlace en su navegador:</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
              </div>
            </div>
            
            <div class="footer">
              <div class="footer-brand">MiloAssistant Security</div>
              <p>© ${new Date().getFullYear()} Milo Assistant. Todos los derechos reservados.</p>
              <p>Este es un correo electrónico automático. Por favor, no responda a este mensaje.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
${title} - MiloAssistant Security

Estimado usuario,

${mainMessage}

${isFirstTimePassword ? 'Beneficios del acceso dual: Podrá iniciar sesión tanto con su cuenta de Google como con correo electrónico y contraseña.' : ''}

Para proceder con ${isFirstTimePassword ? 'el establecimiento' : 'el restablecimiento'} de su contraseña, visite el siguiente enlace:
${resetUrl}

INFORMACIÓN IMPORTANTE: Este enlace de seguridad expirará en 1 hora por motivos de protección de su cuenta.

${!isFirstTimePassword ? 'Si usted no solicitó este cambio, puede ignorar este correo electrónico de forma segura. Su cuenta permanecerá protegida.' : 'Después de establecer su contraseña, podrá continuar utilizando su cuenta de Google para iniciar sesión.'}

---
MiloAssistant Security
© ${new Date().getFullYear()} Milo Assistant. Todos los derechos reservados.
Este es un correo electrónico automático. Por favor, no responda a este mensaje.
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
