/**
 * Script para limpiar datos huérfanos de la base de datos
 * Ejecuta: node scripts/clean-db.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function cleanDatabase() {
  console.log('\n🧹 Limpiando base de datos...\n');

  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || 3306,
    user: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || '123456',
    database: process.env.DATABASE_NAME || 'basededatosmilo',
  });

  try {
    console.log('✅ Conectado a la base de datos\n');

    // 1. Ver datos huérfanos
    console.log('📊 Verificando datos huérfanos...\n');

    const [orphanNotes] = await connection.execute(`
      SELECT n.* 
      FROM note n 
      LEFT JOIN users u ON n.userId = u.id 
      WHERE u.id IS NULL
    `);

    const [orphanTasks] = await connection.execute(`
      SELECT t.* 
      FROM task t 
      LEFT JOIN users u ON t.userId = u.id 
      WHERE u.id IS NULL
    `);

    console.log(`📝 Notas huérfanas encontradas: ${orphanNotes.length}`);
    console.log(`📋 Tareas huérfanas encontradas: ${orphanTasks.length}\n`);

    if (orphanNotes.length === 0 && orphanTasks.length === 0) {
      console.log('✨ No hay datos huérfanos. La base de datos está limpia.\n');
      await connection.end();
      return;
    }

    // 2. Eliminar datos huérfanos
    console.log('🗑️  Eliminando datos huérfanos...\n');

    if (orphanNotes.length > 0) {
      const [resultNotes] = await connection.execute(`
        DELETE n 
        FROM note n 
        LEFT JOIN users u ON n.userId = u.id 
        WHERE u.id IS NULL
      `);
      console.log(`✅ ${resultNotes.affectedRows} notas eliminadas`);
    }

    if (orphanTasks.length > 0) {
      const [resultTasks] = await connection.execute(`
        DELETE t 
        FROM task t 
        LEFT JOIN users u ON t.userId = u.id 
        WHERE u.id IS NULL
      `);
      console.log(`✅ ${resultTasks.affectedRows} tareas eliminadas`);
    }

    console.log('\n🎉 ¡Base de datos limpiada exitosamente!');
    console.log('🚀 Ahora puedes reiniciar tu servidor NestJS\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Verifica que:');
    console.error('   - MySQL esté corriendo');
    console.error('   - Las credenciales en .env sean correctas');
    console.error('   - La base de datos exista\n');
  } finally {
    await connection.end();
  }
}

cleanDatabase();
