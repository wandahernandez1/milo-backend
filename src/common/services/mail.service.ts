import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    // URL del frontend donde el usuario ingresará la nueva contraseña
    const resetUrl = `${this.configService.get('FRONTEND_URL') || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"MiloAssistant Security" <${this.configService.get<string>('MAIL_USER')}>`,
      to: email,
      subject: 'Restablecer Contraseña - MiloAssistant',
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Restablecer Contraseña</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f6f9fc; padding: 50px 0;">
            <tr>
              <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="padding: 48px 40px 32px 40px; text-align: center; border-bottom: 1px solid #e6e9ef;">
                      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #1a1f36; letter-spacing: -0.5px;">
                        MiloAssistant
                      </h1>
                      <p style="margin: 0; font-size: 14px; color: #8898aa; font-weight: 400;">
                        Solicitud de restablecimiento de contraseña
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Contenido Principal -->
                  <tr>
                    <td style="padding: 40px 40px 32px 40px;">
                      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #525f7f;">
                        Estimado usuario,
                      </p>
                      <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #525f7f;">
                        Hemos recibido una solicitud para restablecer la contraseña de su cuenta en MiloAssistant. Si usted realizó esta solicitud, haga clic en el botón a continuación para continuar con el proceso.
                      </p>
                      
                      <!-- Botón Principal -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td align="center" style="padding: 8px 0 32px 0;">
                            <a href="${resetUrl}" 
                               style="display: inline-block; background-color: #5469d4; color: #ffffff; text-decoration: none; 
                                      padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 500; 
                                      letter-spacing: 0.2px; box-shadow: 0 2px 4px rgba(84, 105, 212, 0.3);">
                              Restablecer contraseña
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Información adicional -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" 
                             style="background-color: #f7fafc; border: 1px solid #e6e9ef; border-radius: 6px; margin: 0 0 24px 0;">
                        <tr>
                          <td style="padding: 20px 24px;">
                            <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.5; color: #525f7f; font-weight: 500;">
                              Validez del enlace
                            </p>
                            <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #697386;">
                              Este enlace de restablecimiento es válido por <strong>1 hora</strong> a partir de la recepción de este correo. Después de ese tiempo, deberá solicitar un nuevo enlace.
                            </p>
                            <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #525f7f; font-weight: 500;">
                              Enlace alternativo
                            </p>
                            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #697386;">
                              Si el botón no funciona, copie y pegue el siguiente enlace en su navegador:
                            </p>
                            <p style="margin: 10px 0 0 0; padding: 12px; background-color: #ffffff; border-radius: 4px; 
                                      font-size: 11px; color: #5469d4; word-break: break-all; border: 1px solid #e6e9ef;">
                              ${resetUrl}
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Advertencia de seguridad -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" 
                             style="background-color: #fffbea; border-left: 3px solid #f4c430; border-radius: 6px;">
                        <tr>
                          <td style="padding: 16px 20px;">
                            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #856404;">
                              Importante - Seguridad de la cuenta
                            </p>
                            <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #856404;">
                              Si usted no solicitó este restablecimiento de contraseña, le recomendamos ignorar este mensaje. 
                              Su contraseña actual permanecerá sin cambios. Si sospecha de actividad no autorizada, 
                              contacte con nuestro equipo de soporte.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 32px 40px; background-color: #f7fafc; border-top: 1px solid #e6e9ef; text-align: center;">
                      <p style="margin: 0 0 8px 0; font-size: 13px; color: #8898aa;">
                        Este es un correo automático, por favor no responda a este mensaje.
                      </p>
                      <p style="margin: 0; font-size: 12px; color: #aab7c5; line-height: 1.5;">
                        © 2025 MiloAssistant. Todos los derechos reservados.
                      </p>
                    </td>
                  </tr>
                </table>
                
                <!-- Espaciado inferior -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 580px;">
                  <tr>
                    <td style="padding: 24px 40px; text-align: center;">
                      <p style="margin: 0; font-size: 11px; color: #aab7c5; line-height: 1.5;">
                        MiloAssistant - Tu asistente personal inteligente
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Error enviando correo:', error);
      throw new Error('No se pudo enviar el correo de recuperación');
    }
  }
}
