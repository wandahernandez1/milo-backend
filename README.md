# 🤖 Milo Assistant - Backend

API REST desarrollada con NestJS para Milo, tu asistente personal inteligente.

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecutar el Proyecto](#ejecutar-el-proyecto)
- [Base de Datos](#base-de-datos)
- [Testing](#testing)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [API Endpoints](#api-endpoints)
- [Tecnologías](#tecnologías)

## 📖 Descripción

Backend de MiloAssistant, un asistente virtual inteligente que integra:

- 🔐 Autenticación con JWT y Google OAuth
- 🤖 IA conversacional con Gemini API
- ✅ Gestión de tareas y notas
- 📅 Integración con Google Calendar
- 🌤️ Consulta de clima con OpenWeatherMap
- 📰 Noticias actualizadas con NewsAPI

## 🔧 Requisitos Previos

Asegúrate de tener instalado:

- **Node.js** >= 18.x
- **npm** >= 9.x
- **MySQL** >= 8.x

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd milo-backend
```

### 2. Instalar dependencias

```bash
npm install
```

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# === BASE DE DATOS ===
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USERNAME=root
DATABASE_PASSWORD=tu_password
DATABASE_NAME=basededatosmilo

# === SERVIDOR ===
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# === JWT ===
JWT_SECRET=tu_secreto_jwt_super_seguro_aqui

# === GOOGLE OAUTH ===
GOOGLE_CLIENT_ID=tu_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback

# === GEMINI API ===
GEMINI_API_KEY=tu_gemini_api_key
```

### Obtener las API Keys

#### **Google OAuth (Obligatorio para login con Google)**

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google Calendar
4. Ve a "Credenciales" → "Crear credenciales" → "ID de cliente OAuth 2.0"
5. Configura los URIs autorizados:
   - **Orígenes autorizados**: `http://localhost:5173`, `http://localhost:3000`
   - **URIs de redirección**: `http://localhost:3000/api/google/callback`
6. Copia el `Client ID` y `Client Secret`

#### **Gemini API (Obligatorio para IA conversacional)**

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crea una nueva API Key
3. Copia la clave generada

## 🏃 Ejecutar el Proyecto

### Modo Desarrollo (con hot-reload)

```bash
npm run start:dev
```

El servidor estará disponible en `http://localhost:3000/api`

### Modo Producción

```bash
# Compilar el proyecto
npm run build

# Ejecutar en producción
npm run start:prod
```

### Otros comandos disponibles

```bash
# Desarrollo normal
npm run start

# Modo debug
npm run start:debug

# Compilar y ejecutar
npm run build:start

# Formatear código
npm run format

# Linter
npm run lint
```

## 🗄️ Base de Datos

### Crear la Base de Datos

Conecta a MySQL y ejecuta:

```sql
CREATE DATABASE basededatosmilo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Migraciones Automáticas

El proyecto está configurado con `synchronize: true` en desarrollo, por lo que las tablas se crearán automáticamente al iniciar el servidor.

**⚠️ IMPORTANTE**: En producción, `synchronize` se desactiva automáticamente. Deberás usar migraciones manuales.

### Estructura de las Tablas

El ORM TypeORM creará automáticamente las siguientes tablas:

- **users**: Usuarios del sistema
- **tasks**: Tareas de los usuarios
- **notes**: Notas de los usuarios
- **google_tokens**: Tokens de autenticación de Google Calendar

### Seed de Datos (Opcional)

Si deseas agregar datos de prueba, puedes crear usuarios manualmente o usar el endpoint de registro:

```bash
# POST /api/auth/register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Usuario Test",
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

## 🧪 Testing

### Ejecutar todos los tests

```bash
npm run test
```

### Tests con coverage

```bash
npm run test:cov
```

### Tests E2E (End-to-End)

```bash
npm run test:e2e
```

### Tests en modo watch

```bash
npm run test:watch
```

## 📁 Estructura del Proyecto

```
milo-backend/
├── src/
│   ├── common/              # Utilidades compartidas
│   │   ├── filters/         # Filtros de excepciones
│   │   ├── guards/          # Guards de autenticación
│   │   ├── pipes/           # Pipes de validación
│   │   └── strategies/      # Estrategias de autenticación (JWT)
│   ├── modules/             # Módulos de la aplicación
│   │   ├── auth/            # Autenticación (Login, Register, Google OAuth)
│   │   ├── users/           # Gestión de usuarios
│   │   ├── tasks/           # Gestión de tareas
│   │   ├── notes/           # Gestión de notas
│   │   ├── eventos/         # Eventos de Google Calendar
│   │   ├── gemini/          # Integración con Gemini AI
│   │   └── google/          # Integración con Google APIs
│   ├── app.module.ts        # Módulo principal
│   └── main.ts              # Punto de entrada
├── test/                    # Tests E2E
├── coverage/                # Reportes de cobertura
├── .env                     # Variables de entorno (no incluido en git)
├── package.json
└── README.md
```

## 🔌 API Endpoints

### Autenticación

- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/google` - Login con Google
- `GET /api/auth/profile` - Obtener perfil (requiere JWT)

### Usuarios

- `GET /api/users/profile` - Obtener perfil del usuario autenticado
- `PUT /api/users/profile` - Actualizar perfil

### Tareas

- `GET /api/tasks` - Listar todas las tareas
- `POST /api/tasks` - Crear nueva tarea
- `PUT /api/tasks/:id` - Actualizar tarea
- `DELETE /api/tasks/:id` - Eliminar tarea

### Notas

- `GET /api/notes` - Listar todas las notas
- `POST /api/notes` - Crear nueva nota
- `PUT /api/notes/:id` - Actualizar nota
- `DELETE /api/notes/:id` - Eliminar nota

### Google Calendar

- `GET /api/google/auth` - Iniciar autenticación con Google
- `GET /api/google/callback` - Callback de OAuth
- `GET /api/google/events` - Obtener eventos del calendario

### Gemini AI

- `POST /api/gemini/chat` - Enviar mensaje al asistente AI

## 🛠️ Tecnologías

- **[NestJS](https://nestjs.com/)** - Framework Node.js
- **[TypeScript](https://www.typescriptlang.org/)** - Lenguaje tipado
- **[TypeORM](https://typeorm.io/)** - ORM para base de datos
- **[MySQL](https://www.mysql.com/)** - Base de datos
- **[JWT](https://jwt.io/)** - Autenticación con tokens
- **[Passport](http://www.passportjs.org/)** - Estrategias de autenticación
- **[Google APIs](https://developers.google.com/)** - OAuth y Calendar
- **[Gemini API](https://ai.google.dev/)** - IA conversacional
- **[Jest](https://jestjs.io/)** - Testing framework

## 📝 Notas Importantes

1. **Seguridad**: Nunca subas el archivo `.env` a un repositorio público
2. **Base de Datos**: Asegúrate de que MySQL esté corriendo antes de iniciar el servidor
3. **CORS**: El frontend debe estar en `http://localhost:5173` o actualizar la variable `FRONTEND_URL`
4. **Google OAuth**: Los URIs de redirección deben coincidir exactamente con los configurados en Google Cloud Console

## 🐛 Solución de Problemas

### Error de conexión a la base de datos

```bash
# Verifica que MySQL esté corriendo
mysql --version
mysql -u root -p

# Verifica las credenciales en .env
```

### Error "Cannot find module"

```bash
# Reinstala las dependencias
rm -rf node_modules package-lock.json
npm install
```

### Puerto 3000 ya en uso

```bash
# Cambia el puerto en .env
PORT=3001
```

## 📄 Licencia

Este proyecto es privado y de uso interno.

## 👥 Autor

Desarrollado por el equipo de MiloAssistant

---

**¿Necesitas ayuda?** Abre un issue en el repositorio o contacta al equipo de desarrollo.
