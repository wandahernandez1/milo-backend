-- Script para limpiar datos huérfanos en la base de datos

-- 1. Ver qué notas tienen userId inválidos
SELECT n.* 
FROM note n 
LEFT JOIN users u ON n.userId = u.id 
WHERE u.id IS NULL;

-- 2. Ver qué tareas tienen userId inválidos
SELECT t.* 
FROM task t 
LEFT JOIN users u ON t.userId = u.id 
WHERE u.id IS NULL;

-- 3. ELIMINAR notas huérfanas 
DELETE n 
FROM note n 
LEFT JOIN users u ON n.userId = u.id 
WHERE u.id IS NULL;

-- 4. ELIMINAR tareas huérfanas 
DELETE t 
FROM task t 
LEFT JOIN users u ON t.userId = u.id 
WHERE u.id IS NULL;
