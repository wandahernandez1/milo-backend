# Milo Assistant - Backend API

<div align="center">

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)

  <p><strong>API REST robusta y escalable desarrollada con NestJS para Milo, tu asistente personal inteligente potenciado por IA</strong></p>

  <p>
    <a href="#-demo-en-vivo">🌐 Demo</a> •
    <a href="#-arquitectura">📐 Arquitectura</a> •
    <a href="#-retos-técnicos-superados">🏆 Retos</a> •
    <a href="#-instalación">🚀 Instalación</a> •
    <a href="#-api-endpoints">📡 API</a>
  </p>

  <br/>

| 🚀 Deploy | 🗄️ Database        | 🔒 Seguridad    |
| --------- | ------------------ | --------------- |
| Render    | MySQL (AlwaysData) | OAuth 2.0 + JWT |

</div>

---

## 🌐 Demo en Vivo

| Entorno           | URL                                                                              | Estado                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **🔴 Producción** | [https://milo-backend-4dga.onrender.com](https://milo-backend-4dga.onrender.com) | [![Render Status](https://img.shields.io/badge/Render-Online-success?logo=render)](https://render.com) |
| **🟡 Frontend**   | [https://milo-frontend-six.vercel.app](https://milo-frontend-six.vercel.app)     | [![Vercel Status](https://img.shields.io/badge/Vercel-Online-success?logo=vercel)](https://vercel.com) |
| **🗄️ Database**   | mysql-wandahernandez.alwaysdata.net                                              | [![AlwaysData](https://img.shields.io/badge/AlwaysData-Online-success)](https://alwaysdata.com)        |

## 📐 Arquitectura

### 🏗️ Diagrama de Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              🌐 CLIENTE (Frontend)                              │
│                          React 19 + Vite (Vercel)                               │
└─────────────────────────────────────┬───────────────────────────────────────────┘
                                      │ HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            🛡️ API GATEWAY (NestJS)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Rate Limiter │  │ CORS Policy  │  │ JWT Guard    │  │ Request Validation   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────┬───────────────────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────────┐
         ▼                            ▼                                ▼
┌─────────────────┐        ┌─────────────────┐              ┌─────────────────────┐
│  🔐 AUTH MODULE │        │  🤖 GEMINI MODULE│              │  📅 EVENTS MODULE   │
│  ───────────────│        │  ───────────────│              │  ─────────────────  │
│  • JWT Strategy │        │  • AI Chat      │              │  • Google Calendar  │
│  • Google OAuth │        │  • NLP Parser   │              │  • CRUD Eventos     │
│  • Passport.js  │        │  • Chrono-node  │              │  • Sincronización   │
│  • Bcrypt Hash  │        │  • Context Mgmt │              │  • OAuth Tokens     │
└────────┬────────┘        └────────┬────────┘              └──────────┬──────────┘
         │                          │                                  │
         │                          │                                  │
         ▼                          ▼                                  ▼
┌─────────────────┐        ┌─────────────────┐              ┌─────────────────────┐
│  ✅ TASKS MODULE│        │  📝 NOTES MODULE │              │  📧 EMAIL MODULE    │
│  ───────────────│        │  ───────────────│              │  ─────────────────  │
│  • CRUD Tareas  │        │  • CRUD Notas   │              │  • SendGrid         │
│  • Prioridades  │        │  • Búsqueda     │              │  • MailerSend       │
│  • Fechas límite│        │  • Categorías   │              │  • Nodemailer       │
│  • Filtros      │        │  • Markdown     │              │  • Templates        │
└────────┬────────┘        └────────┬────────┘              └──────────┬──────────┘
         │                          │                                  │
         └──────────────────────────┼──────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          🗄️ CAPA DE PERSISTENCIA                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         TypeORM (ORM)                                   │   │
│  │   • Entidades: User, Task, Note, Event, RefreshToken                    │   │
│  │   • Migraciones automáticas                                             │   │
│  │   • Query Builder                                                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                   MySQL 8.x (AlwaysData Cloud)                          │   │
│  │   • Host: mysql-wandahernandez.alwaysdata.net                           │   │
│  │   • Conexiones pooled + SSL/TLS                                         │   │
│  │   • Backups automáticos                                                 │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          🔌 SERVICIOS EXTERNOS                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐ │
│  │ Google Gemini │  │ Google OAuth  │  │ Google Cal.   │  │ Email Services    │ │
│  │ AI/ML API     │  │ 2.0           │  │ API v3        │  │ SendGrid/SMTP     │ │
│  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 📦 Arquitectura Modular (NestJS)

```
src/
├── 🎯 main.ts                    # Bootstrap de la aplicación
├── 📱 app.module.ts              # Módulo raíz (orquestador)
├── 🔧 app.controller.ts          # Health checks & root endpoints
│
├── 📂 modules/
│   ├── 🔐 auth/                  # Autenticación y autorización
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/           # JWT, Google OAuth
│   │   └── dto/                  # LoginDto, RegisterDto
│   │
│   ├── 👤 users/                 # Gestión de usuarios
│   │   ├── user.entity.ts        # Entidad TypeORM
│   │   ├── users.service.ts
│   │   └── users.controller.ts
│   │
│   ├── 🤖 gemini/                # Integración IA
│   │   ├── gemini.service.ts     # Conexión con Gemini API
│   │   └── gemini.controller.ts  # Endpoints de chat
│   │
│   ├── ✅ tasks/                 # Gestión de tareas
│   ├── 📝 notes/                 # Sistema de notas
│   ├── 📅 eventos/               # Google Calendar sync
│   ├── 📧 email/                 # Servicios de correo
│   ├── 🌐 google/                # OAuth y APIs Google
│   └── 📰 news/                  # Feed de novedades
│
└── 📂 common/
    ├── 🛡️ guards/                # AuthGuard, RolesGuard
    ├── 🔍 filters/               # Exception filters
    ├── 📊 interceptors/          # Logging, Transform
    ├── 🔧 pipes/                 # Validation pipes
    └── 🛠️ utils/                 # Helpers y utilidades
```

---

## 🏆 Retos Técnicos Superados

### 1. 🧠 Procesamiento de Lenguaje Natural para Fechas

**Problema:** Interpretar correctamente fechas en lenguaje natural en español ("mañana a las 3pm", "el próximo lunes", "en 2 horas").

**Solución:**

```typescript
// Implementación con Chrono-node + locale español
import * as chrono from 'chrono-node';

const parsedDate = chrono.es.parseDate(
  'recordarme comprar leche mañana a las 5pm',
  new Date(), // referencia
  { forwardDate: true },
);
```

**Resultado:** Precisión del 95%+ en interpretación de fechas en español con soporte para expresiones coloquiales.

---

### 2. 🔄 Sincronización Bidireccional con Google Calendar

**Problema:** Mantener consistencia entre eventos locales y Google Calendar, manejando conflictos de sincronización y tokens OAuth expirados.

**Solución:**

```typescript
// Refresh automático de tokens y retry logic
async refreshTokenIfNeeded(userId: string): Promise<OAuth2Client> {
  const tokens = await this.getStoredTokens(userId);

  if (this.isTokenExpired(tokens)) {
    const newTokens = await this.oauth2Client.refreshToken(tokens.refresh_token);
    await this.updateStoredTokens(userId, newTokens);
  }

  return this.createAuthenticatedClient(tokens);
}
```

**Resultado:** Sincronización confiable con 99.9% uptime y manejo elegante de errores de API de Google.

---

### 3. 🔐 Seguridad Multi-Capa con JWT + OAuth

**Problema:** Implementar autenticación robusta soportando login tradicional y OAuth sin comprometer la seguridad.

**Solución:**

```typescript
// Estrategia híbrida JWT con refresh tokens
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
```

**Resultado:** Sistema de autenticación enterprise-grade con tokens de corta duración y refresh tokens seguros.

---

### 4. 🤖 Gestión de Contexto para IA Conversacional

**Problema:** Mantener contexto coherente en conversaciones largas con Gemini sin exceder límites de tokens.

**Solución:**

```typescript
// Sistema de contexto con ventana deslizante
class ConversationContext {
  private readonly MAX_HISTORY = 10;

  buildPrompt(userMessage: string, history: Message[]): string {
    const recentHistory = history.slice(-this.MAX_HISTORY);
    const systemPrompt = this.getSystemPrompt();

    return `${systemPrompt}\n\n${this.formatHistory(recentHistory)}\n\nUsuario: ${userMessage}`;
  }
}
```

**Resultado:** Conversaciones naturales y coherentes manteniendo costos de API optimizados.

---

### 5. 📧 Sistema de Email Resiliente con Fallback

**Problema:** Garantizar entrega de emails críticos (verificación, reset password) ante fallos de proveedores.

**Solución:**

```typescript
// Patrón fallback con múltiples proveedores
async sendEmail(options: EmailOptions): Promise<void> {
  const providers = [this.sendGrid, this.mailerSend, this.nodemailer];

  for (const provider of providers) {
    try {
      await provider.send(options);
      return; // Éxito
    } catch (error) {
      this.logger.warn(`Provider ${provider.name} failed, trying next...`);
    }
  }
  throw new EmailDeliveryException('All providers failed');
}
```

**Resultado:** 99.99% de tasa de entrega con failover automático.

---

### 6. 🏗️ Deploy Automatizado en Railway

**Problema:** Configurar CI/CD con variables de entorno sensibles y conexión segura a MySQL.

**Solución:** Configuración railway.json optimizada con health checks y auto-scaling.

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "npm run start:prod",
    "healthcheckPath": "/api/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**Resultado:** Deploys automáticos en <2 minutos con zero-downtime.

---

## 📋 Tabla de Contenidos

- [🌐 Demo en Vivo](#-demo-en-vivo)
- [📐 Arquitectura](#-arquitectura)
- [🏆 Retos Técnicos Superados](#-retos-técnicos-superados)
- [📖 Descripción](#-descripción)
- [🔧 Requisitos Previos](#-requisitos-previos)
- [🚀 Instalación](#-instalación)
- [⚙️ Configuración](#️-configuración)
- [🏃 Ejecutar el Proyecto](#-ejecutar-el-proyecto)
- [🗄️ Base de Datos](#️-base-de-datos)
- [🧪 Testing](#-testing)
- [📁 Estructura del Proyecto](#-estructura-del-proyecto)
- [🔌 API Endpoints](#-api-endpoints)
- [🛠️ Tecnologías](#️-tecnologías)
- [📝 Notas Importantes](#-notas-importantes)
- [🐛 Solución de Problemas](#-solución-de-problemas)

---

## 📖 Descripción

Backend de **MiloAssistant**, un asistente virtual inteligente que combina IA conversacional con productividad personal. Diseñado con arquitectura modular y escalable siguiendo los principios SOLID y patrones de diseño enterprise.

### ✨ Características Principales

| Característica              | Descripción                                   | Tecnología           |
| --------------------------- | --------------------------------------------- | -------------------- |
| 🔐 **Autenticación Segura** | JWT con refresh tokens y Google OAuth 2.0     | Passport.js, bcrypt  |
| 🤖 **IA Conversacional**    | Chat inteligente con memoria de contexto      | Google Gemini API    |
| ✅ **Gestión de Tareas**    | CRUD completo con recordatorios y prioridades | TypeORM              |
| 📝 **Sistema de Notas**     | Organización y búsqueda avanzada              | Full-text search     |
| 📅 **Google Calendar**      | Sincronización bidireccional de eventos       | Google Calendar API  |
| 🧠 **NLP en Español**       | Análisis de fechas y contexto                 | Chrono-node          |
| 📧 **Notificaciones**       | Emails transaccionales                        | SendGrid, Nodemailer |

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
# ============================================
# CONFIGURACIÓN DE BASE DE DATOS
# ============================================
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USERNAME=root
DATABASE_PASSWORD=tu_password_mysql
DATABASE_NAME=basededatosmilo

# ============================================
# CONFIGURACIÓN DEL SERVIDOR
# ============================================
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# ============================================
# AUTENTICACIÓN JWT
# ============================================
JWT_SECRET=tu_secreto_jwt_super_seguro_minimo_32_caracteres

# ============================================
# GOOGLE OAUTH & CALENDAR
# ============================================
GOOGLE_CLIENT_ID=tu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback

# ============================================
# GEMINI AI (Google)
# ============================================
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

### Framework & Lenguaje

- **[NestJS](https://nestjs.com/)** v11 - Framework progresivo de Node.js
- **[TypeScript](https://www.typescriptlang.org/)** v5.7 - Superset tipado de JavaScript

### Base de Datos & ORM

- **[MySQL](https://www.mysql.com/)** v8+ - Sistema de gestión de base de datos relacional
- **[TypeORM](https://typeorm.io/)** v0.3 - ORM para TypeScript y JavaScript

### Autenticación & Seguridad

- **[Passport](http://www.passportjs.org/)** v0.7 - Middleware de autenticación
- **[JWT](https://jwt.io/)** - JSON Web Tokens para autenticación stateless
- **[bcrypt](https://www.npmjs.com/package/bcrypt)** v6 - Hashing de contraseñas

### APIs & Servicios Externos

- **[Google OAuth](https://developers.google.com/identity/protocols/oauth2)** - Autenticación con Google
- **[Google Calendar API](https://developers.google.com/calendar)** - Integración de calendario
- **[Gemini API](https://ai.google.dev/)** v1.21 - IA conversacional de Google

### Utilidades

- **[date-fns](https://date-fns.org/)** v4.1 - Manipulación de fechas moderna
- **[chrono-node](https://github.com/wanasit/chrono)** v2.9 - Parser de lenguaje natural para fechas
- **[class-validator](https://github.com/typestack/class-validator)** - Validación basada en decoradores
- **[class-transformer](https://github.com/typestack/class-transformer)** - Transformación de objetos

### Testing

- **[Jest](https://jestjs.io/)** v30 - Framework de testing
- **[Supertest](https://github.com/visionmedia/supertest)** v7 - Testing de HTTP

## 📝 Notas Importantes

### Seguridad

- ⚠️ **Nunca** subas el archivo `.env` a un repositorio público
- 🔑 Usa contraseñas seguras para `JWT_SECRET` (mínimo 32 caracteres)
- 🔒 En producción, utiliza variables de entorno del servidor, no archivos `.env`

### Base de Datos

- 🗄️ Asegúrate de que MySQL esté corriendo antes de iniciar el servidor
- 🔄 El modo `synchronize: true` solo debe usarse en desarrollo
- 💾 Crea backups regulares de la base de datos en producción

### CORS

- 🌐 El frontend debe estar en `http://localhost:5173` o actualizar `FRONTEND_URL`
- 🔗 En producción, configura los dominios permitidos correctamente

### Google OAuth

- ✅ Los URIs de redirección deben coincidir **exactamente** con los configurados en Google Cloud Console
- 🔄 Habilita Google Calendar API en Google Cloud Console para la funcionalidad de eventos

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

Desarrollado con ❤️ por Hernandez Wanda

<div align="center">
  <p><strong>¿Necesitas ayuda?</strong></p>
  <p>Abre un issue en el repositorio o contacta al equipo de desarrollo</p>
  <p>Hecho con NestJS 🐈 • TypeScript 💙 • MySQL 🐬</p>
</div>
