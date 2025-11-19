-- Migración para consolidar tabla 'user' a 'users' en producción Railway
-- Ejecutar este script MANUALMENTE en Railway MySQL

-- Crear tabla temporal para backup 
CREATE TABLE IF NOT EXISTS user_backup AS SELECT * FROM user;

-- Migrar datos de 'user' a 'users' si no existen
INSERT IGNORE INTO users (
    id, name, fullName, birthDate, email, password, 
    avatar, avatarColor, googleAvatar, 
    googleCalendarAccessToken, googleCalendarRefreshToken, 
    googleCalendarTokenExpiryDate, googleConnected,
    resetPasswordToken, resetPasswordExpires
)
SELECT 
    id, name, fullName, birthDate, email, password, 
    avatar, avatarColor, googleAvatar, 
    googleCalendarAccessToken, googleCalendarRefreshToken, 
    googleCalendarTokenExpiryDate, googleConnected,
    resetPasswordToken, resetPasswordExpires
FROM user
WHERE id NOT IN (SELECT id FROM users);

-- Paso 2: Actualizar referencias en note y task
-- Asegurar que todos los userId apunten a registros existentes en 'users'
UPDATE note n
SET n.userId = (SELECT u.id FROM users u WHERE u.id = n.userId LIMIT 1)
WHERE n.userId IN (SELECT id FROM user);

UPDATE task t
SET t.userId = (SELECT u.id FROM users u WHERE u.id = t.userId LIMIT 1)
WHERE t.userId IN (SELECT id FROM user);

