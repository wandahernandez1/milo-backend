import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { google } from 'googleapis';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private oauth2Client;
  private isInitialized = false;
  private readonly isProduction: boolean;
  private readonly enableDebugLogs: boolean;

  constructor(private configService: ConfigService) {
    this.isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    this.enableDebugLogs =
      this.configService.get<string>('MAIL_DEBUG') === 'true' ||
      !this.isProduction;

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
      this.logger.error('Error crítico inicializando MailService', error.stack);
    });
  }

  private async initializeTransporter() {
    try {
      if (this.enableDebugLogs) {
        this.logger.log('Inicializando MailService con Gmail API (OAuth2)...');
      }

      // Verificar variables de entorno críticas
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      const clientSecret = this.configService.get<string>(
        'GOOGLE_CLIENT_SECRET',
      );
      const refreshToken = this.configService.get<string>(
        'GMAIL_REFRESH_TOKEN',
      );
      const mailUser = this.configService.get<string>('MAIL_USER');

      if (this.enableDebugLogs) {
        this.logger.log('Verificando configuración OAuth2');
        this.logger.log(
          `GOOGLE_CLIENT_ID: ${clientId ? 'Configurado' : 'NO CONFIGURADO'}`,
        );
        this.logger.log(
          `GOOGLE_CLIENT_SECRET: ${clientSecret ? 'Configurado' : 'NO CONFIGURADO'}`,
        );
        this.logger.log(
          `GMAIL_REFRESH_TOKEN: ${refreshToken ? 'Configurado' : 'NO CONFIGURADO'}`,
        );
        this.logger.log(`MAIL_USER: ${mailUser || 'NO CONFIGURADO'}`);
      }

      if (!clientId || !clientSecret || !refreshToken || !mailUser) {
        throw new Error(
          'Variables de entorno de Gmail no configuradas correctamente',
        );
      }

      // Obtener access token usando el refresh token
      if (this.enableDebugLogs) {
        this.logger.log('Obteniendo access token...');
      }
      const accessToken = await this.getAccessToken();
      if (this.enableDebugLogs) {
        this.logger.log('Access token obtenido');
      }

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
      if (this.enableDebugLogs) {
        this.logger.log('MailService inicializado con Gmail API (OAuth2)');
        this.logger.log(
          `FRONTEND_URL: ${frontendUrl || 'NO CONFIGURADA (usando localhost por defecto)'}`,
        );
      }

      await this.verifyConnection();
      this.isInitialized = true;
      this.logger.log('MailService completamente inicializado y listo');
    } catch (error) {
      this.logger.error('Error inicializando Gmail API', error.stack);
      if (!this.isProduction) {
        this.logger.error('Verifica que hayas configurado correctamente:');
        this.logger.error('- GOOGLE_CLIENT_ID');
        this.logger.error('- GOOGLE_CLIENT_SECRET');
        this.logger.error('- GMAIL_REFRESH_TOKEN');
        this.logger.error('- MAIL_USER');
      }
      this.isInitialized = false;
      throw error; // Propagar error para que sea visible
    }
  }

  private async getAccessToken(): Promise<string> {
    try {
      const { token } = await this.oauth2Client.getAccessToken();
      return token;
    } catch (error) {
      this.logger.error('Error obteniendo access token de Gmail', error.stack);
      throw new Error('No se pudo obtener el access token de Gmail');
    }
  }

  private async verifyConnection() {
    try {
      if (this.enableDebugLogs) {
        this.logger.log('Verificando conexión con Gmail API...');
      }
      await this.transporter.verify();
      if (this.enableDebugLogs) {
        this.logger.log('Conexión con Gmail API verificada correctamente');
      }
    } catch (error) {
      this.logger.error(
        'Error al verificar conexión con Gmail API',
        error.message,
      );

      if (error.code === 'EAUTH' || error.responseCode === 535) {
        this.logger.error(
          'ERROR DE AUTENTICACIÓN: Credenciales OAuth2 inválidas',
        );
        if (!this.isProduction) {
          this.logger.error('SOLUCIÓN: Regenera el GMAIL_REFRESH_TOKEN');
          this.logger.error('Ejecuta: npm run gmail:auth');
        }
      } else {
        this.logger.error('ERROR: Verifica tu configuración de Gmail API');
      }
    }
  }

  private getDomainRecommendations(emailDomain: string): {
    isExternal: boolean;
    requiresSlowDelivery: boolean;
    tips: string[];
  } {
    const gmailDomains = ['gmail.com', 'googlemail.com'];
    const isExternal = !gmailDomains.includes(emailDomain.toLowerCase());

    const tips: string[] = [];

    if (isExternal) {
      tips.push('Dominio externo detectado');
      tips.push(
        'Se aplicarán configuraciones optimizadas para entrega externa',
      );
    }

    // Dominios conocidos por ser más estrictos
    const strictDomains = [
      'hotmail.com',
      'outlook.com',
      'live.com',
      'yahoo.com',
      'yahoo.es',
      'aol.com',
    ];
    const requiresSlowDelivery = strictDomains.some((domain) =>
      emailDomain.toLowerCase().includes(domain),
    );

    if (requiresSlowDelivery) {
      tips.push('Dominio con filtros anti-spam estrictos detectado');
      tips.push(
        'Se recomienda verificar configuración SPF/DKIM del dominio de envío',
      );
    }

    return {
      isExternal,
      requiresSlowDelivery,
      tips,
    };
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    if (this.enableDebugLogs) {
      this.logger.log(
        `[sendPasswordResetEmail] Iniciando envío de email a: ${email}`,
      );
      this.logger.log(
        `[sendPasswordResetEmail] Estado de inicialización: ${this.isInitialized}`,
      );
    }

    // Verificar que el servicio esté inicializado
    if (!this.isInitialized) {
      this.logger.warn(
        'MailService no está inicializado. Intentando reinicializar...',
      );
      try {
        await this.initializeTransporter();
      } catch (error) {
        this.logger.error(
          '[sendPasswordResetEmail] Error reinicializando',
          error.stack,
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
    if (this.enableDebugLogs) {
      this.logger.log(
        'Intentando enviar email de reset password con Gmail API',
      );
      this.logger.log(`Destinatario: ${email}`);
      this.logger.log(`URL de reset generada: ${resetUrl}`);
    }

    // Detectar el dominio del email
    const emailDomain = email.split('@')[1];

    // Obtener recomendaciones específicas para el dominio
    const domainInfo = this.getDomainRecommendations(emailDomain);
    if (this.enableDebugLogs) {
      this.logger.log(`Dominio del destinatario: ${emailDomain}`);
      this.logger.log(`Es dominio externo: ${domainInfo.isExternal}`);
      this.logger.log(
        `Requiere entrega lenta: ${domainInfo.requiresSlowDelivery}`,
      );
      if (domainInfo.tips.length > 0) {
        domainInfo.tips.forEach((tip) => this.logger.log(`${tip}`));
      }
    }

    // Sistema de reintentos
    const maxRetries = domainInfo.requiresSlowDelivery ? 5 : 3; // Más intentos para dominios estrictos
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (this.enableDebugLogs) {
          this.logger.log(`Intento ${attempt} de ${maxRetries}...`);
        }

        // Obtener un nuevo access token antes de enviar
        const accessToken = await this.getAccessToken();

        // Actualizar el transporter con el nuevo access token
        // Configuración mejorada para dominios externos
        this.transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true, // true para 465, false para otros puertos
          auth: {
            type: 'OAuth2',
            user: this.configService.get<string>('MAIL_USER'),
            clientId: this.configService.get<string>('GOOGLE_CLIENT_ID'),
            clientSecret: this.configService.get<string>(
              'GOOGLE_CLIENT_SECRET',
            ),
            refreshToken: this.configService.get<string>('GMAIL_REFRESH_TOKEN'),
            accessToken: accessToken,
          },
          // Opciones adicionales para mejorar la entrega a dominios externos
          pool: true, // Usar pool de conexiones reutilizables
          maxConnections: 5,
          maxMessages: 100, // Aumentado para mejor throughput
          rateDelta: 20000, // 20 segundos de ventana
          rateLimit: 14, // Límite de Gmail: ~14 mensajes por segundo
          // Opciones de socket para evitar timeouts con servidores lentos
          // Ajustar timeouts según el ambiente
          socketTimeout: this.isProduction ? 45000 : 60000,
          greetingTimeout: 30000,
          connectionTimeout: this.isProduction ? 45000 : 60000,
          // Opciones de TLS mejoradas
          tls: {
            rejectUnauthorized: true,
            minVersion: 'TLSv1.2', // Asegurar TLS 1.2 o superior
            ciphers: 'HIGH:!aNULL:!MD5', // Cifrados seguros
          },
          // Opciones de DNS timeout
          dnsTimeout: 30000,
          // Log de debug solo en desarrollo
          debug: this.enableDebugLogs,
          logger: this.enableDebugLogs,
        } as any);

        const mailUser = this.configService.get<string>('MAIL_USER') || '';

        const mailOptions = {
          from: `"MiloAssistant Security" <${mailUser}>`,
          to: email,
          subject: 'Restablecer Contraseña - MiloAssistant',
          // Headers adicionales para mejorar reputación y evitar spam
          headers: {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            Importance: 'high',
            'X-Mailer': 'MiloAssistant Security System',
            'Reply-To': mailUser,
            'Return-Path': mailUser,
            // Headers para mejorar deliverability
            'Message-ID': `<${Date.now()}.${Math.random().toString(36).substring(7)}@miloassistant.com>`,
            'X-Entity-Ref-ID': resetToken.substring(0, 20),
            // Headers anti-spam
            'List-Unsubscribe': '<mailto:unsubscribe@miloassistant.com>',
            Precedence: 'bulk',
          },
          // Agregar versión de texto plano para mejor compatibilidad
          text: `
Restablecer Contraseña - MiloAssistant

Estimado usuario,

Hemos recibido una solicitud para restablecer la contraseña de su cuenta en MiloAssistant.

Para continuar con el proceso, copie y pegue el siguiente enlace en su navegador:

${resetUrl}

Este enlace es válido por 1 hora a partir de la recepción de este correo.

IMPORTANTE: Si usted no solicitó este restablecimiento de contraseña, ignore este mensaje. Su contraseña actual permanecerá sin cambios.

---
MiloAssistant - Tu asistente personal inteligente
Este es un correo automático, por favor no responda a este mensaje.
© 2025 MiloAssistant. Todos los derechos reservados.
          `,
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

        if (this.enableDebugLogs) {
          this.logger.log('Enviando correo...');
        }
        const info = await this.transporter.sendMail(mailOptions);

        if (this.enableDebugLogs) {
          this.logger.log(`Email enviado exitosamente a: ${email}`);
          this.logger.log(`Message ID: ${info.messageId}`);
          this.logger.log(`Response: ${info.response}`);
          this.logger.log(
            `Accepted recipients: ${JSON.stringify(info.accepted)}`,
          );
          this.logger.log(
            `Rejected recipients: ${JSON.stringify(info.rejected)}`,
          );
          this.logger.log(
            `Pending recipients: ${JSON.stringify(info.pending)}`,
          );
        }

        // Verificar si el correo fue aceptado
        if (info.rejected && info.rejected.length > 0) {
          this.logger.error(
            `Email rechazado por el servidor: ${JSON.stringify(info.rejected)}`,
          );
          throw new Error('El correo fue rechazado por el servidor de destino');
        }

        if (info.pending && info.pending.length > 0) {
          if (this.enableDebugLogs) {
            this.logger.warn(
              `Email en estado pendiente: ${JSON.stringify(info.pending)}`,
            );
            this.logger.warn(
              'Esto puede ocurrir con correos no-Gmail. El correo será procesado pero puede tardar.',
            );
            if (domainInfo.isExternal) {
              this.logger.warn(
                'Para dominios externos, el correo puede tardar varios minutos en llegar.',
              );
              this.logger.warn(
                'Verifica que el dominio de envío tenga configurado SPF y DKIM correctamente.',
              );
            }
          }
        }

        // Si llegamos aquí, el envío fue exitoso
        this.logger.log(
          `Email de recuperación enviado exitosamente en intento ${attempt}`,
        );
        if (domainInfo.isExternal && this.enableDebugLogs) {
          this.logger.log(
            'Correo enviado a dominio externo. Puede tardar algunos minutos en llegar.',
          );
        }
        return { success: true, messageId: info.messageId, info };
      } catch (error) {
        lastError = error;
        this.logger.error(`Error en intento ${attempt}: ${error.message}`);

        if (this.enableDebugLogs) {
          this.logger.error(
            'Detalles del error:',
            JSON.stringify({
              code: error.code,
              message: error.message,
              command: error.command,
              response: error.response,
              responseCode: error.responseCode,
            }),
          );
        }

        // Si es error de autenticación, no reintentar
        if (
          error.code === 'EAUTH' ||
          error.message?.includes('Invalid credentials')
        ) {
          this.logger.error(
            'ERROR DE AUTENTICACIÓN: Las credenciales OAuth2 son inválidas',
          );
          if (!this.isProduction) {
            this.logger.error(
              'SOLUCIÓN: Regenera el GMAIL_REFRESH_TOKEN ejecutando: npm run gmail:auth',
            );
          }
          throw new Error('Error de autenticación con Gmail API');
        }

        // Si no es el último intento, esperar antes de reintentar
        if (attempt < maxRetries) {
          // Backoff exponencial ajustado según el tipo de dominio
          const baseWaitTime = domainInfo.requiresSlowDelivery ? 3000 : 2000;
          const waitTime = attempt * baseWaitTime; // 2s/3s, 4s/6s, 6s/9s, etc.
          if (this.enableDebugLogs) {
            this.logger.log(
              `Esperando ${waitTime}ms antes del siguiente intento...`,
            );
          }
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    this.logger.error('Todos los intentos de envío fallaron');
    this.logger.error(`Último error: ${lastError?.message}`, lastError?.stack);
    throw new Error(
      'No se pudo enviar el correo de recuperación después de múltiples intentos',
    );
  }
}
