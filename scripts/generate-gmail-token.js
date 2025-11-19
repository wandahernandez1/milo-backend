#!/usr/bin/env node

/**
 * Script para generar el GMAIL_REFRESH_TOKEN necesario para enviar correos con Gmail API
 *
 * Requisitos previos:
 * 1. Tener un proyecto en Google Cloud Console
 * 2. Habilitar Gmail API en el proyecto
 * 3. Crear credenciales OAuth 2.0 (ID de cliente para aplicación de escritorio)
 * 4. Configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el .env
 * 5. Configurar GOOGLE_REDIRECT_URI en el .env (por defecto: http://localhost:3000/api/google/callback)
 *
 * Uso:
 * npm run gmail:auth
 */

const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configuración OAuth2
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// Usar localhost como redirect URI (debe estar configurado en Google Cloud Console)
const REDIRECT_URI = 'http://localhost:3000/google/callback';

// Scopes necesarios para Gmail API
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://mail.google.com/',
];

console.log('\n🔐 ========================================');
console.log('   GENERADOR DE GMAIL REFRESH TOKEN');
console.log('========================================\n');

// Validar configuración
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ ERROR: Faltan credenciales de Google');
  console.error('\n📝 Asegúrate de tener en tu archivo .env:');
  console.error('   GOOGLE_CLIENT_ID=tu_client_id');
  console.error('   GOOGLE_CLIENT_SECRET=tu_client_secret');
  console.error(
    '   GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback\n',
  );
  console.error('📖 Guía: https://console.cloud.google.com/apis/credentials');
  process.exit(1);
}

console.log('✅ Credenciales encontradas');
console.log('📋 Client ID:', CLIENT_ID.substring(0, 20) + '...');
console.log('🔗 Redirect URI:', REDIRECT_URI);
console.log('');

// Crear cliente OAuth2
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
);

// Generar URL de autorización
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent', // Forzar para obtener refresh token
});

console.log('🌐 PASO 1: Autoriza esta aplicación');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n🚀 Iniciando servidor local en http://localhost:3000...\n');

// Crear servidor HTTP temporal
const server = http.createServer();
let serverStarted = false;

server.on('request', async (req, res) => {
  const queryObject = url.parse(req.url, true).query;

  if (queryObject.code) {
    const code = queryObject.code;

    // Mostrar página de éxito
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Autorización Exitosa</title>
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
          .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; max-width: 500px; }
          h1 { color: #4CAF50; margin: 0 0 20px 0; }
          p { color: #666; line-height: 1.6; }
          .success { font-size: 60px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✅</div>
          <h1>¡Autorización Exitosa!</h1>
          <p>El token de Gmail ha sido configurado correctamente.</p>
          <p><strong>Puedes cerrar esta ventana y volver a la terminal.</strong></p>
        </div>
      </body>
      </html>
    `);

    console.log('\n✅ Código de autorización recibido');
    console.log('⏳ Procesando código de autorización...');

    try {
      // Intercambiar código por tokens
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        console.error('\n❌ ERROR: No se recibió refresh_token');
        console.error('⚠️ Esto puede pasar si ya autorizaste la app antes.');
        console.error('\n💡 SOLUCIÓN:');
        console.error('1. Ve a https://myaccount.google.com/permissions');
        console.error('2. Revoca el acceso a esta aplicación');
        console.error('3. Ejecuta este script nuevamente\n');
        server.close();
        process.exit(1);
      }

      console.log('\n✅ ¡Tokens obtenidos exitosamente!');
      console.log('\n📋 REFRESH TOKEN (guárdalo en tu .env):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\x1b[32m%s\x1b[0m', tokens.refresh_token);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Intentar actualizar .env automáticamente
      try {
        const envPath = path.join(__dirname, '..', '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');

        // Verificar si ya existe GMAIL_REFRESH_TOKEN
        if (envContent.includes('GMAIL_REFRESH_TOKEN=')) {
          // Reemplazar valor existente
          envContent = envContent.replace(
            /GMAIL_REFRESH_TOKEN=.*/,
            `GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`,
          );
        } else {
          // Agregar nueva línea
          envContent += `\nGMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`;
        }

        fs.writeFileSync(envPath, envContent);
        console.log('✅ Archivo .env actualizado automáticamente\n');
      } catch (error) {
        console.log('⚠️ No se pudo actualizar .env automáticamente');
        console.log('📝 Copia manualmente este valor a tu archivo .env:\n');
        console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`);
      }

      console.log('🎉 ¡Configuración completada!');
      console.log('\n📬 Ahora puedes enviar correos con Gmail API');
      console.log('🚀 Reinicia tu servidor NestJS para aplicar los cambios\n');

      // Cerrar servidor
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);
    } catch (error) {
      console.error('\n❌ ERROR al obtener tokens:', error.message);

      if (error.response) {
        console.error('📊 Detalles del error:', error.response.data);
      }

      console.error('\n💡 Posibles soluciones:');
      console.error(
        '1. Verifica que el código no haya expirado (son de un solo uso)',
      );
      console.error('2. Asegúrate de copiar el código completo');
      console.error(
        '3. Verifica que GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET sean correctos\n',
      );

      server.close();
      process.exit(1);
    }
  } else if (queryObject.error) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Error de Autorización</title>
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
          .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; max-width: 500px; }
          h1 { color: #f44336; margin: 0 0 20px 0; }
          p { color: #666; line-height: 1.6; }
          .error { font-size: 60px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error">❌</div>
          <h1>Error de Autorización</h1>
          <p>La autorización fue cancelada o falló.</p>
          <p><strong>Puedes cerrar esta ventana y volver a intentarlo.</strong></p>
        </div>
      </body>
      </html>
    `);

    console.error('\n❌ Autorización cancelada por el usuario');
    server.close();
    process.exit(1);
  }
});

server.listen(3000, () => {
  serverStarted = true;
  console.log('✅ Servidor iniciado en http://localhost:3000\n');
  console.log('1. Abre el siguiente enlace en tu navegador:\n');
  console.log('\x1b[36m%s\x1b[0m', authUrl);
  console.log(
    '\n2. Inicia sesión con tu cuenta de Gmail (wandahernandez2023cl@gmail.com)',
  );
  console.log('3. Acepta los permisos solicitados');
  console.log('4. Serás redirigido automáticamente y el token se guardará\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⏳ Esperando autorización...\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('\n❌ ERROR: El puerto 3000 ya está en uso');
    console.error(
      '💡 SOLUCIÓN: Cierra cualquier aplicación que esté usando el puerto 3000',
    );
    console.error(
      '   O modifica el REDIRECT_URI en Google Cloud Console a otro puerto\n',
    );
  } else {
    console.error('\n❌ ERROR al iniciar servidor:', err.message);
  }
  process.exit(1);
});
