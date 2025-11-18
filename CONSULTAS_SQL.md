# 📚 Consultas SQL - Milo Assistant

Documentación completa de todas las consultas SQL disponibles para las tablas de la base de datos de Milo Assistant.

---

## 📋 Índice

- [Tabla: `note`](#tabla-note)
- [Tabla: `task`](#tabla-task)
- [Tabla: `user`](#tabla-user)
- [Consultas con JOINS](#consultas-con-joins)
- [Análisis y Estadísticas](#análisis-y-estadísticas)
- [Mantenimiento](#mantenimiento)

---

## 🗒️ Tabla: `note`

### Ver todas las notas

```sql
SELECT * FROM note;
```

### Ver notas de un usuario específico

```sql
SELECT * FROM note WHERE userId = 'ID_DEL_USUARIO';
```

### Buscar nota por ID

```sql
SELECT * FROM note WHERE id = 'ID_DE_LA_NOTA';
```

### Buscar notas por título (búsqueda parcial)

```sql
SELECT * FROM note WHERE title LIKE '%palabra%';
```

### Contar notas por usuario

```sql
SELECT userId, COUNT(*) as total_notas
FROM note
GROUP BY userId;
```

### Crear una nota

```sql
INSERT INTO note (id, title, content, userId)
VALUES (UUID(), 'Título de ejemplo', 'Contenido de la nota', 'ID_DEL_USUARIO');
```

### Actualizar una nota

```sql
UPDATE note
SET title = 'Nuevo título', content = 'Nuevo contenido'
WHERE id = 'ID_DE_LA_NOTA';
```

### Eliminar una nota

```sql
DELETE FROM note WHERE id = 'ID_DE_LA_NOTA';
```

---

## ✅ Tabla: `task`

### Ver todas las tareas

```sql
SELECT * FROM task;
```

### Ver tareas de un usuario específico

```sql
SELECT * FROM task WHERE userId = 'ID_DEL_USUARIO';
```

### Ver tareas completadas

```sql
SELECT * FROM task WHERE completed = 1;
```

### Ver tareas pendientes

```sql
SELECT * FROM task WHERE completed = 0;
```

### Ver tareas ordenadas por ID descendente (más recientes primero)

```sql
SELECT * FROM task
WHERE userId = 'ID_DEL_USUARIO'
ORDER BY id DESC;
```

### Contar tareas por usuario

```sql
SELECT userId,
       COUNT(*) as total_tareas,
       SUM(completed) as completadas,
       COUNT(*) - SUM(completed) as pendientes
FROM task
GROUP BY userId;
```

### Buscar tarea por ID

```sql
SELECT * FROM task WHERE id = 'ID_DE_LA_TAREA';
```

### Crear una tarea

```sql
INSERT INTO task (id, title, description, completed, userId)
VALUES (UUID(), 'Título de la tarea', 'Descripción', 0, 'ID_DEL_USUARIO');
```

### Actualizar una tarea

```sql
UPDATE task
SET title = 'Nuevo título', description = 'Nueva descripción', completed = 1
WHERE id = 'ID_DE_LA_TAREA';
```

### Marcar tarea como completada

```sql
UPDATE task
SET completed = 1
WHERE id = 'ID_DE_LA_TAREA';
```

### Eliminar una tarea

```sql
DELETE FROM task WHERE id = 'ID_DE_LA_TAREA';
```

---

## 👤 Tabla: `user`

### Ver todos los usuarios

```sql
SELECT * FROM user;
```

### Ver usuarios sin mostrar contraseñas

```sql
SELECT id, name, email, googleConnected, googleAvatar, avatarColor,
       fullName, birthDate, googleCalendarTokenExpiryDate
FROM user;
```

### Buscar usuario por email

```sql
SELECT * FROM user WHERE email = 'usuario@ejemplo.com';
```

### Buscar usuario por ID

```sql
SELECT * FROM user WHERE id = 'ID_DEL_USUARIO';
```

### Ver usuarios conectados a Google

```sql
SELECT id, name, email, googleConnected
FROM user
WHERE googleConnected = 1;
```

### Ver usuarios NO conectados a Google

```sql
SELECT id, name, email, googleConnected
FROM user
WHERE googleConnected = 0 OR googleConnected IS NULL;
```

### Ver usuarios con tokens de Google Calendar activos

```sql
SELECT id, name, email, googleCalendarTokenExpiryDate
FROM user
WHERE googleCalendarAccessToken IS NOT NULL
  AND googleCalendarRefreshToken IS NOT NULL;
```

### Ver usuarios con tokens expirados

```sql
SELECT id, name, email, googleCalendarTokenExpiryDate
FROM user
WHERE googleCalendarTokenExpiryDate < NOW();
```

### Crear un usuario

```sql
INSERT INTO user (id, name, email, password, googleConnected, avatarColor)
VALUES (UUID(), 'Nombre Usuario', 'email@ejemplo.com', 'HASH_PASSWORD', 0, '#3B82F6');
```

### Actualizar perfil de usuario

```sql
UPDATE user
SET name = 'Nuevo Nombre', fullName = 'Nombre Completo', birthDate = '1990-01-15'
WHERE id = 'ID_DEL_USUARIO';
```

### Actualizar avatar

```sql
UPDATE user
SET avatar = 'URL_DEL_AVATAR'
WHERE id = 'ID_DEL_USUARIO';
```

### Marcar usuario como conectado a Google

```sql
UPDATE user
SET googleConnected = 1
WHERE id = 'ID_DEL_USUARIO';
```

### Desconectar Google Calendar

```sql
UPDATE user
SET googleConnected = 0,
    googleCalendarAccessToken = NULL,
    googleCalendarRefreshToken = NULL,
    googleCalendarTokenExpiryDate = NULL
WHERE id = 'ID_DEL_USUARIO';
```

### Eliminar un usuario

```sql
DELETE FROM user WHERE id = 'ID_DEL_USUARIO';
```

---

## 🔗 Consultas con JOINS

### Ver todas las notas con información del usuario

```sql
SELECT n.id, n.title, n.content, u.name as usuario, u.email
FROM note n
INNER JOIN user u ON n.userId = u.id;
```

### Ver todas las tareas con información del usuario

```sql
SELECT t.id, t.title, t.description, t.completed, u.name as usuario, u.email
FROM task t
INNER JOIN user u ON t.userId = u.id;
```

### Ver resumen completo de un usuario (notas + tareas)

```sql
SELECT
    u.id,
    u.name,
    u.email,
    COUNT(DISTINCT n.id) as total_notas,
    COUNT(DISTINCT t.id) as total_tareas,
    SUM(CASE WHEN t.completed = 1 THEN 1 ELSE 0 END) as tareas_completadas
FROM user u
LEFT JOIN note n ON u.id = n.userId
LEFT JOIN task t ON u.id = t.userId
WHERE u.id = 'ID_DEL_USUARIO'
GROUP BY u.id, u.name, u.email;
```

### Ver usuarios con su cantidad de notas y tareas

```sql
SELECT
    u.id,
    u.name,
    u.email,
    COUNT(DISTINCT n.id) as total_notas,
    COUNT(DISTINCT t.id) as total_tareas
FROM user u
LEFT JOIN note n ON u.id = n.userId
LEFT JOIN task t ON u.id = t.userId
GROUP BY u.id, u.name, u.email
ORDER BY u.name;
```

---

## 📊 Análisis y Estadísticas

### Estadísticas generales de la aplicación

```sql
SELECT
    (SELECT COUNT(*) FROM user) as total_usuarios,
    (SELECT COUNT(*) FROM note) as total_notas,
    (SELECT COUNT(*) FROM task) as total_tareas,
    (SELECT COUNT(*) FROM task WHERE completed = 1) as tareas_completadas,
    (SELECT COUNT(*) FROM user WHERE googleConnected = 1) as usuarios_con_google;
```

### Top 5 usuarios con más notas

```sql
SELECT u.name, u.email, COUNT(n.id) as cantidad_notas
FROM user u
LEFT JOIN note n ON u.id = n.userId
GROUP BY u.id, u.name, u.email
ORDER BY cantidad_notas DESC
LIMIT 5;
```

### Top 5 usuarios con más tareas

```sql
SELECT u.name, u.email, COUNT(t.id) as cantidad_tareas
FROM user u
LEFT JOIN task t ON u.id = t.userId
GROUP BY u.id, u.name, u.email
ORDER BY cantidad_tareas DESC
LIMIT 5;
```

### Porcentaje de tareas completadas por usuario

```sql
SELECT
    u.name,
    u.email,
    COUNT(t.id) as total_tareas,
    SUM(CASE WHEN t.completed = 1 THEN 1 ELSE 0 END) as completadas,
    ROUND((SUM(CASE WHEN t.completed = 1 THEN 1 ELSE 0 END) * 100.0) / COUNT(t.id), 2) as porcentaje_completado
FROM user u
INNER JOIN task t ON u.id = t.userId
GROUP BY u.id, u.name, u.email
HAVING COUNT(t.id) > 0
ORDER BY porcentaje_completado DESC;
```

### Usuarios sin actividad (sin notas ni tareas)

```sql
SELECT u.id, u.name, u.email
FROM user u
LEFT JOIN note n ON u.id = n.userId
LEFT JOIN task t ON u.id = t.userId
WHERE n.id IS NULL AND t.id IS NULL;
```

---

## 🧹 Mantenimiento

### Ver estructura de la tabla `note`

```sql
DESCRIBE note;
```

### Ver estructura de la tabla `task`

```sql
DESCRIBE task;
```

### Ver estructura de la tabla `user`

```sql
DESCRIBE user;
```

### Ver todas las tablas de la base de datos

```sql
SHOW TABLES;
```

### Limpiar todas las notas de un usuario

```sql
DELETE FROM note WHERE userId = 'ID_DEL_USUARIO';
```

### Limpiar todas las tareas de un usuario

```sql
DELETE FROM task WHERE userId = 'ID_DEL_USUARIO';
```

### Ver tamaño de las tablas

```sql
SELECT
    table_name AS "Tabla",
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS "Tamaño (MB)"
FROM information_schema.TABLES
WHERE table_schema = DATABASE()
ORDER BY (data_length + index_length) DESC;
```

---

## 💡 Tips para usar en MySQL Workbench

### 1. Reemplazar placeholders

Cambia los siguientes valores por datos reales:

- `'ID_DEL_USUARIO'` → ID real del usuario
- `'ID_DE_LA_NOTA'` → ID real de la nota
- `'ID_DE_LA_TAREA'` → ID real de la tarea

### 2. Generar UUIDs

MySQL genera IDs únicos automáticamente con:

```sql
UUID()
```

### 3. Usar transacciones seguras

Antes de ejecutar DELETE o UPDATE masivos:

```sql
START TRANSACTION;
-- Tu consulta aquí
-- Verifica los resultados
ROLLBACK; -- Para deshacer si algo sale mal
-- o
COMMIT; -- Para confirmar los cambios
```

### 4. Limitar resultados

Para evitar sobrecargar la interfaz:

```sql
SELECT * FROM note LIMIT 10;
```

### 5. Buscar por fecha actual

```sql
-- Tareas creadas hoy
SELECT * FROM task WHERE DATE(created_at) = CURDATE();

-- Usuarios creados en los últimos 7 días
SELECT * FROM user WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY);
```

---

## 📈 Resumen de Operaciones por Tabla

| Tabla    | CREATE | READ                  | UPDATE         | DELETE |
| -------- | ------ | --------------------- | -------------- | ------ |
| **note** | ✅     | ✅ (1 + ALL)          | ✅             | ✅     |
| **task** | ✅     | ✅ (1 + ALL)          | ✅             | ✅     |
| **user** | ✅     | ✅ (by ID + by email) | ✅ (múltiples) | ✅     |

---

## 🔐 Notas de Seguridad

- **Nunca** ejecutes `SELECT * FROM user` en producción sin filtrar contraseñas
- **Siempre** usa transacciones para operaciones DELETE masivas
- **Verifica** los WHERE clauses antes de ejecutar UPDATE o DELETE
- **Haz backups** antes de operaciones de mantenimiento importantes

---

**Última actualización:** 12 de noviembre de 2025  
**Versión:** 1.0  
**Proyecto:** Milo Assistant Backend
