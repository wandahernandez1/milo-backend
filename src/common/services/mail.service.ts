import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { google } from 'googleapis';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private oauth2Client;
  private isInitialized = false;

  constructor(private configService: ConfigService) {
    // Configurar OAuth2 Client de Google
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_REDIRECT_URI'),
    );

    // Establecer el refresh token
    const refreshToken = this.configService.get<string>('GMAIL_REFRESH_TOKEN');
    if (refreshToken) {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });
    }

    // Inicializar el transporter de forma asíncrona
    this.initializeTransporter().catch((error) => {
      console.error(
        '❌ Error crítico inicializando MailService:',
        error.message,
      );
    });
  }

  private async initializeTransporter() {
    try {
      console.log('📧 Inicializando MailService con Gmail API (OAuth2)...');

      // Verificar variables de entorno críticas
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      const clientSecret = this.configService.get<string>(
        'GOOGLE_CLIENT_SECRET',
      );
      const refreshToken = this.configService.get<string>(
        'GMAIL_REFRESH_TOKEN',
      );
      const mailUser = this.configService.get<string>('MAIL_USER');

      console.log('🔍 Verificando configuración OAuth2:');
      console.log(
        '  ✓ GOOGLE_CLIENT_ID:',
        clientId
          ? `Configurado (${clientId.substring(0, 20)}...)`
          : '❌ NO CONFIGURADO',
      );
      console.log(
        '  ✓ GOOGLE_CLIENT_SECRET:',
        clientSecret ? 'Configurado' : '❌ NO CONFIGURADO',
      );
      console.log(
        '  ✓ GMAIL_REFRESH_TOKEN:',
        refreshToken
          ? `Configurado (${refreshToken.length} chars)`
          : '❌ NO CONFIGURADO',
      );
      console.log('  ✓ MAIL_USER:', mailUser || '❌ NO CONFIGURADO');

      if (!clientId || !clientSecret || !refreshToken || !mailUser) {
        throw new Error(
          'Variables de entorno de Gmail no configuradas correctamente',
        );
      }

      // Obtener access token usando el refresh token
      console.log('🔑 Obteniendo access token...');
      const accessToken = await this.getAccessToken();
      console.log('✓ Access token obtenido');

      // Configurar transporter con OAuth2
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: mailUser,
          clientId: clientId,
          clientSecret: clientSecret,
          refreshToken: refreshToken,
          accessToken: accessToken,
        },
      } as any);

      // Log de configuración al iniciar
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      console.log('📧 MailService inicializado con Gmail API (OAuth2)');
      console.log(
        '🌍 FRONTEND_URL:',
        frontendUrl || 'NO CONFIGURADA (usando localhost por defecto)',
      );

      await this.verifyConnection();
      this.isInitialized = true;
      console.log('✅ MailService completamente inicializado y listo');
    } catch (error) {
      console.error('❌ Error inicializando Gmail API:', error.message);
      console.error('❌ Stack completo:', error.stack);
      console.error('⚠️ Verifica que hayas configurado correctamente:');
      console.error('   - GOOGLE_CLIENT_ID');
      console.error('   - GOOGLE_CLIENT_SECRET');
      console.error('   - GMAIL_REFRESH_TOKEN');
      console.error('   - MAIL_USER');
      this.isInitialized = false;
      throw error; // Propagar error para que sea visible
    }
  }

  private async getAccessToken(): Promise<string> {
    try {
      const { token } = await this.oauth2Client.getAccessToken();
      return token;
    } catch (error) {
      console.error(
        '❌ Error obteniendo access token de Gmail:',
        error.message,
      );
      throw new Error('No se pudo obtener el access token de Gmail');
    }
  }

  private async verifyConnection() {
    try {
      console.log('🔍 Verificando conexión con Gmail API...');
      await this.transporter.verify();
      console.log('✅ Conexión con Gmail API verificada correctamente');
    } catch (error) {
      console.error(
        '❌ Error al verificar conexión con Gmail API:',
        error.message,
      );
      console.error('📊 Código de error:', error.code);

      if (error.code === 'EAUTH' || error.responseCode === 535) {
        console.error(
          '🔐 ERROR DE AUTENTICACIÓN: Credenciales OAuth2 inválidas',
        );
        console.error('⚠️ SOLUCIÓN: Regenera el GMAIL_REFRESH_TOKEN');
        console.error('📝 Ejecuta: npm run gmail:auth');
      } else {
        console.error('⚠️ ERROR: Verifica tu configuración de Gmail API');
      }
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    console.log(
      '📧 [sendPasswordResetEmail] Iniciando envío de email a:',
      email,
    );
    console.log(
      '🔍 [sendPasswordResetEmail] Estado de inicialización:',
      this.isInitialized,
    );

    // Verificar que el servicio esté inicializado
    if (!this.isInitialized) {
      console.error(
        '❌ MailService no está inicializado. Intentando reinicializar...',
      );
      try {
        await this.initializeTransporter();
      } catch (error) {
        console.error(
          '❌ [sendPasswordResetEmail] Error reinicializando:',
          error.message,
        );
        throw new Error(
          'El servicio de correo no está disponible: ' + error.message,
        );
      }
      if (!this.isInitialized) {
        throw new Error('El servicio de correo no pudo ser inicializado');
      }
    }

    // URL del frontend donde el usuario ingresará la nueva contraseña
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const baseUrl =
      frontendUrl && frontendUrl.trim() !== ''
        ? frontendUrl
        : 'http://localhost:5173';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    // Log para debug
    console.log('📧 Intentando enviar email de reset password con Gmail API');
    console.log('📬 Destinatario:', email);
    console.log('🔗 URL de reset generada:', resetUrl);

    try {
      // Obtener un nuevo access token antes de enviar
      const accessToken = await this.getAccessToken();

      // Actualizar el transporter con el nuevo access token
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: this.configService.get<string>('MAIL_USER'),
          clientId: this.configService.get<string>('GOOGLE_CLIENT_ID'),
          clientSecret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
          refreshToken: this.configService.get<string>('GMAIL_REFRESH_TOKEN'),
          accessToken: accessToken,
        },
      } as any);

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

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email enviado exitosamente a:', email);
      console.log('📬 Message ID:', info.messageId);
      console.log('📊 Response:', info.response);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error enviando correo con Gmail API:', error);
      console.error('❌ Detalles del error:', {
        code: error.code,
        message: error.message,
      });

      if (
        error.code === 'EAUTH' ||
        error.message?.includes('Invalid credentials')
      ) {
        console.error(
          '🔐 ERROR DE AUTENTICACIÓN: Las credenciales OAuth2 son inválidas',
        );
        console.error(
          '⚠️ SOLUCIÓN: Regenera el GMAIL_REFRESH_TOKEN ejecutando: npm run gmail:auth',
        );
        throw new Error('Error de autenticación con Gmail API');
      }

      throw new Error('No se pudo enviar el correo de recuperación');
    }
  }
}
