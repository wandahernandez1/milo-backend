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

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configuración OAuth2
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// Usar un redirect URI especial que muestra el código directamente en la página
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

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
console.log('\n1. Abre el siguiente enlace en tu navegador:\n');
console.log('\x1b[36m%s\x1b[0m', authUrl);
console.log(
  '\n2. Inicia sesión con la cuenta de Gmail que usarás para enviar correos',
);
console.log('3. Acepta los permisos solicitados');
console.log('4. Google te mostrará un código de autorización en la página');
console.log('5. COPIA ese código completo (ejemplo: 4/0Ab32j90OuGA55W7...)\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Crear interfaz de lectura
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Solicitar código de autorización
rl.question('📝 Pega aquí el código de autorización: ', async (inputCode) => {
  try {
    // Limpiar el código (quitar espacios, saltos de línea, etc.)
    const code = inputCode.trim();

    console.log('\n⏳ Procesando código de autorización...');
    console.log('📋 Código recibido:', code.substring(0, 20) + '...');

    // Intercambiar código por tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.error('\n❌ ERROR: No se recibió refresh_token');
      console.error('⚠️ Esto puede pasar si ya autorizaste la app antes.');
      console.error('\n💡 SOLUCIÓN:');
      console.error('1. Ve a https://myaccount.google.com/permissions');
      console.error('2. Revoca el acceso a esta aplicación');
      console.error('3. Ejecuta este script nuevamente\n');
      rl.close();
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
  }

  rl.close();
});
