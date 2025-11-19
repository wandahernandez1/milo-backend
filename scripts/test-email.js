/**
 * Script de prueba para verificar el envío de correos
 * Uso: node scripts/test-email.js <email_destino>
 */

require('dotenv').config();
const nodemailer = require('nodemailer');
const { google } = require('googleapis');

async function testEmail(toEmail) {
  console.log('🧪 Iniciando prueba de envío de correo...\n');
  console.log('📬 Destinatario:', toEmail);
  console.log('📧 Remitente:', process.env.MAIL_USER);
  console.log('');

  try {
    // Configurar OAuth2 Client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });

    // Obtener access token
    console.log('🔑 Obteniendo access token...');
    const { token } = await oauth2Client.getAccessToken();
    console.log('✅ Access token obtenido\n');

    // Crear transporter
    console.log('🔧 Configurando transporter...');
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: process.env.MAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: token,
      },
      pool: true,
      maxConnections: 5,
      socketTimeout: 60000,
      greetingTimeout: 30000,
      connectionTimeout: 60000,
      tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
        ciphers: 'HIGH:!aNULL:!MD5',
      },
      dnsTimeout: 30000,
      debug: true,
      logger: true,
    });

    // Verificar conexión
    console.log('🔍 Verificando conexión con Gmail...');
    await transporter.verify();
    console.log('✅ Conexión verificada\n');

    // Detectar dominio
    const emailDomain = toEmail.split('@')[1];
    console.log('🌐 Dominio del destinatario:', emailDomain);
    console.log('');

    // Preparar correo de prueba
    const testToken = 'test-token-' + Date.now();
    const resetUrl = `http://localhost:5173/reset-password?token=${testToken}`;

    const mailOptions = {
      from: `"MiloAssistant Security" <${process.env.MAIL_USER}>`,
      to: toEmail,
      subject: '🧪 Prueba de Correo - MiloAssistant',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        Importance: 'high',
        'X-Mailer': 'MiloAssistant Security System',
        'Reply-To': process.env.MAIL_USER,
        'Return-Path': process.env.MAIL_USER,
        'Message-ID': `<${Date.now()}.${Math.random().toString(36).substring(7)}@miloassistant.com>`,
        'List-Unsubscribe': '<mailto:unsubscribe@miloassistant.com>',
        Precedence: 'bulk',
      },
      text: `
Este es un correo de prueba de MiloAssistant

Si recibiste este correo, significa que la configuración de envío está funcionando correctamente.

Dominio de destino: ${emailDomain}
Hora de envío: ${new Date().toLocaleString()}

URL de prueba: ${resetUrl}

---
MiloAssistant
      `,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <h1 style="color: #5469d4;">🧪 Prueba de Correo</h1>
    <p>Si recibiste este correo, significa que la configuración de envío está funcionando correctamente.</p>
    
    <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <strong>Información del envío:</strong><br>
      📧 Dominio de destino: ${emailDomain}<br>
      🕐 Hora de envío: ${new Date().toLocaleString()}<br>
      🔗 URL de prueba: <a href="${resetUrl}">${resetUrl}</a>
    </div>
    
    <p style="color: #666; font-size: 12px; margin-top: 30px;">
      Este es un correo automático de prueba de MiloAssistant.
    </p>
  </div>
</body>
</html>
      `,
    };

    // Enviar correo
    console.log('📤 Enviando correo de prueba...');
    const info = await transporter.sendMail(mailOptions);

    console.log('\n✅ ¡Correo enviado exitosamente!');
    console.log('📬 Message ID:', info.messageId);
    console.log('📊 Response:', info.response);
    console.log('📊 Accepted:', info.accepted);
    console.log('📊 Rejected:', info.rejected);
    console.log('📊 Pending:', info.pending);

    if (info.pending && info.pending.length > 0) {
      console.log('\n⚠️  IMPORTANTE: El correo está en estado "pending"');
      console.log('   Esto es normal para dominios externos a Gmail.');
      console.log('   El correo puede tardar varios minutos en llegar.');
      console.log('   Verifica también la carpeta de spam.');
    }

    console.log('\n✅ Prueba completada exitosamente');
  } catch (error) {
    console.error('\n❌ Error durante la prueba:');
    console.error('Código:', error.code);
    console.error('Mensaje:', error.message);
    console.error('Command:', error.command);
    console.error('Response:', error.response);

    if (error.code === 'EAUTH') {
      console.error('\n🔐 ERROR DE AUTENTICACIÓN');
      console.error('Ejecuta: npm run gmail:auth');
    }

    process.exit(1);
  }
}

// Obtener email del argumento de línea de comandos
const toEmail = process.argv[2];

if (!toEmail) {
  console.error('❌ Error: Debes proporcionar un email de destino');
  console.log('Uso: node scripts/test-email.js <email_destino>');
  console.log('Ejemplo: node scripts/test-email.js usuario@hotmail.com');
  process.exit(1);
}

// Validar formato de email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(toEmail)) {
  console.error('❌ Error: El email proporcionado no es válido');
  process.exit(1);
}

testEmail(toEmail);
