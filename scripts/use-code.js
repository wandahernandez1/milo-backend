#!/usr/bin/env node

/**
 * Script rápido para convertir un código de autorización en refresh token
 * Uso: node scripts/use-code.js "TU_CODIGO_AQUI"
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

// Obtener código desde argumentos de línea de comandos
const code = process.argv[2];

if (!code) {
  console.error('❌ ERROR: Debes proporcionar el código de autorización');
  console.error('\n📝 Uso:');
  console.error('   node scripts/use-code.js "4/0Ab32j90OuGA55W7..."');
  console.error('\nO simplemente pega el código cuando te lo pida:\n');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
);

console.log('\n⏳ Procesando código de autorización...');
console.log('📋 Código:', code.substring(0, 30) + '...\n');

oauth2Client
  .getToken(code)
  .then(({ tokens }) => {
    if (!tokens.refresh_token) {
      console.error('\n❌ ERROR: No se recibió refresh_token');
      console.error('⚠️ Esto puede pasar si ya autorizaste la app antes.');
      console.error('\n💡 SOLUCIÓN:');
      console.error('1. Ve a https://myaccount.google.com/permissions');
      console.error('2. Revoca el acceso a esta aplicación');
      console.error('3. Ejecuta este script nuevamente\n');
      process.exit(1);
    }

    console.log('✅ ¡Tokens obtenidos exitosamente!');
    console.log('\n📋 REFRESH TOKEN:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\x1b[32m%s\x1b[0m', tokens.refresh_token);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Actualizar .env automáticamente
    try {
      const envPath = path.join(__dirname, '..', '.env');
      let envContent = fs.readFileSync(envPath, 'utf8');

      if (envContent.includes('GMAIL_REFRESH_TOKEN=')) {
        envContent = envContent.replace(
          /GMAIL_REFRESH_TOKEN=.*/,
          `GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`,
        );
      } else {
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
    console.log('📬 Ahora puedes enviar correos con Gmail API');
    console.log('🚀 Reinicia tu servidor NestJS para aplicar los cambios\n');
  })
  .catch((error) => {
    console.error('\n❌ ERROR al obtener tokens:', error.message);

    if (error.response) {
      console.error('📊 Detalles:', error.response.data);
    }

    console.error('\n💡 Posibles soluciones:');
    console.error('1. Verifica que el código no haya expirado');
    console.error('2. Asegúrate de copiar el código completo');
    console.error('3. Verifica GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET\n');
    process.exit(1);
  });
