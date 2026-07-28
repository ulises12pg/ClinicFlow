# 🏥 MedConsulta

Sistema de gestión integral para consultorio médico familiar. Permite expedir recetas médicas, llevar el historial de pacientes, controlar el inventario de medicamentos, gestionar la agenda de citas con recordatorios automáticos por email, y administrar múltiples usuarios con roles.

> Desarrollado en [Emergent](https://emergent.sh) — exportable y autoejecutable localmente.

---

## ✨ Características

- 🔐 **Autenticación JWT** con cookies httpOnly y roles (admin / doctor / enfermero/a)
- 👥 **Gestión de pacientes** con historial clínico, alergias, condiciones crónicas
- 💊 **Recetas médicas** dinámicas con impresión / PDF y membrete personalizable
- 📦 **Inventario de medicamentos** con alertas de stock bajo y caducidad
- 📅 **Agenda / Citas médicas** con calendario mensual, vista por día, tipos y estados
- ⚙️ **Configuración del consultorio** con subida directa de logo (drag & drop)
- 🌓 **Modo Claro / Oscuro** con persistencia
- 📱 **Responsive** desktop + mobile, interfaz 100% en español

---

## 🛠️ Stack tecnológico

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+) - Framework web asíncrono y de alto rendimiento.
- [MongoDB](https://www.mongodb.com/) con [Motor](https://motor.readthedocs.io/) - Driver asíncrono oficial para almacenamiento NoSQL.
- [Uvicorn](https://www.uvicorn.org/) - Servidor ASGI para producción y desarrollo.
- JWT (PyJWT) + bcrypt (`passlib`) para autenticación y encriptación.

**Frontend**
- [React 19](https://react.dev/) + [React Router 7](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [react-day-picker](https://react-day-picker.js.org/) para el calendario
- [Axios](https://axios-http.com/), [Lucide React](https://lucide.dev/)

---

## ⚙️ Arquitectura y Funcionamiento del Backend

### 1. 🐍 Framework y Servidor ASGI
- **FastAPI + Uvicorn**: El backend está implementado completamente en Python 3.11+ sobre **FastAPI**. Utiliza **Uvicorn** como servidor ASGI (`uvicorn server:app --host 0.0.0.0 --port $PORT`).
- **Documentación Interactiva**: FastAPI genera de forma automática la documentación OpenAPI / Swagger en la ruta `/docs`.

### 2. ☁️ Plataforma de Hosting y Despliegue
- **Render.com**: Incluye la plantilla de infraestructura como código [`backend/render.yaml`](file:///c:/Users/ELITE%20DESK/Documents/GitHub/ClinicFlow/backend/render.yaml) lista para despliegue en **Render** como un *Web Service*.
- **Compatibilidad PaaS / VPS**: Puede alojarse sin modificaciones en cualquier servidor Linux (Ubuntu/Debian), contenedor Docker, o servicios como Railway, Fly.io, AWS EC2 / App Runner.

### 3. 🍃 Base de Datos MongoDB
- **Driver Asíncrono (Motor)**: Utiliza `AsyncIOMotorClient` para operaciones de lectura/escritura totalmente no bloqueantes.
- **Conexión Flexible**: Se conecta vía `MONGO_URL` a una instancia local de MongoDB (`mongodb://localhost:27017`) o a un cluster en la nube (**MongoDB Atlas**).
- **Colecciones**: Almacena de forma estructurada documentos BSON para `users`, `patients`, `prescriptions`, `inventory`, `appointments` y `settings`.

### 4. 🔐 Seguridad y Autenticación
- **Tokens JWT**: Emite tokens de acceso (`access_token`, expira en 8h) y refresco (`refresh_token`, expira en 7 días) firmados con algoritmos HMAC-SHA256 (`HS256`).
- **Cookies Seguras**: Soporta transmisión de tokens a través de cookies HTTP-Only (`access_token`) así como mediante el encabezado estándar `Authorization: Bearer <token>`.
- **Hashing de Claves**: Las contraseñas de usuario se almacenan usando **bcrypt** con salt aleatorio.
- **Protección Anti-ataques**:
  - **Rate Limiting**: Control en memoria por dirección IP para prevenir ataques de fuerza bruta en el inicio de sesión.
  - **Sanitización Regex**: Prevención de ataques ReDoS en búsquedas de pacientes/medicamentos.

### 5. ⚡ Middlewares y Servicios Adicionales
- **CORS Middleware**: Restricción de orígenes cruzados configurables mediante `CORS_ORIGINS` y `FRONTEND_URL`.
- **Compresión GZip**: Optimización de carga útil en respuestas JSON voluminosas.
- **Gestión de Archivos**: Almacenamiento local (`uploads/`) u Object Storage remoto para la personalización de logos del consultorio.

---

## 📁 Estructura del proyecto

```
medconsulta/
├── backend/
│   ├── server.py              # FastAPI app: rutas, modelos, scheduler
│   ├── requirements.txt       # Dependencias Python
│   ├── tests/                 # Pytest end-to-end
│   └── .env                   # Variables (NO commitear)
├── frontend/
│   ├── src/
│   │   ├── App.js             # Routing + Providers
│   │   ├── contexts/          # AuthContext, ThemeContext, SettingsContext
│   │   ├── pages/             # Login, Dashboard, Patients, Prescriptions,
│   │   │                      # Inventory, Agenda, Users, Settings
│   │   └── components/
│   │       ├── Layout.jsx     # Sidebar + topbar
│   │       └── ui/            # Componentes shadcn
│   ├── package.json
│   └── .env                   # REACT_APP_BACKEND_URL (NO commitear)
└── README.md
```

---

## 🚀 Instalación local

### Requisitos previos
- **Python 3.11+**
- **Node.js 18+** y **Yarn**
- **MongoDB** local o cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (gratis)

### 1. Clonar el repositorio
```bash
git clone https://github.com/<tu-usuario>/<tu-repo>.git
cd <tu-repo>
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Crea el archivo `backend/.env`:

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="medconsulta"
CORS_ORIGINS="http://localhost:3000"
JWT_SECRET="cambia-esto-por-una-cadena-aleatoria-larga"
ADMIN_EMAIL="admin@medconsulta.com"
ADMIN_PASSWORD="Admin123!"
FRONTEND_URL="http://localhost:3000"


# Object Storage (logos) — opcional, requiere clave de Emergent
EMERGENT_LLM_KEY=""
```

Inicia el backend:
```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

> El primer arranque crea automáticamente el usuario admin con las credenciales del `.env`.

### 3. Frontend

```bash
cd ../frontend
yarn install
```

Crea el archivo `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=3000
```

Inicia el frontend:
```bash
yarn start
```

Abre [http://localhost:3000](http://localhost:3000) y entra con:
- **Administrador (Acceso Total):**
  - **Email:** `admin@medconsulta.com`
  - **Password:** `Admin123!`
- **Usuario Demo (Acceso Restringido - Sin Administración de Usuarios):**
  - **Email:** `demo@medconsulta.com`
  - **Password:** `Demo123!`

---

## 🔑 Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `MONGO_URL` | Cadena de conexión MongoDB | `mongodb://localhost:27017` |
| `DB_NAME` | Nombre de la base de datos | `medconsulta` |
| `CORS_ORIGINS` | Orígenes permitidos (coma-separado) | `http://localhost:3000` |
| `JWT_SECRET` | Secreto JWT (genera uno único) | `openssl rand -hex 32` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bootstrap del admin | `admin@medconsulta.com` / `Admin123!` |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | Bootstrap del usuario demo (restringido) | `demo@medconsulta.com` / `Demo123!` |
| `FRONTEND_URL` | URL del frontend (para cookies seguras) | `http://localhost:3000` |

| `EMERGENT_LLM_KEY` | Para Object Storage de logos (opcional) | `sk-emergent-xxx` |

### Frontend (`frontend/.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `REACT_APP_BACKEND_URL` | URL del backend | `http://localhost:8001` |
| `WDS_SOCKET_PORT` | Puerto WS de webpack-dev-server | `3000` |

---

## 📡 Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Login (devuelve cookies) |
| POST | `/api/auth/logout` | Cerrar sesión |
| GET | `/api/auth/me` | Usuario actual |
| GET/POST/PUT/DELETE | `/api/patients[/{id}]` | CRUD de pacientes |
| GET/POST/PUT/DELETE | `/api/prescriptions[/{id}]` | CRUD de recetas |
| GET/POST/PUT/DELETE | `/api/inventory[/{id}]` | CRUD de inventario |
| GET/POST/PUT/DELETE | `/api/appointments[/{id}]` | CRUD de citas (filtros: `?date=YYYY-MM-DD` o `?month=YYYY-MM`) |

| GET/POST | `/api/settings` | Configuración del consultorio |
| POST | `/api/upload/logo` | Subir logo |
| GET | `/api/logo` | Servir el logo |
| GET | `/api/dashboard/stats` | Estadísticas |
| GET/POST/PUT/DELETE | `/api/users[/{id}]` | Usuarios (admin) |

Documentación interactiva (Swagger): `http://localhost:8001/docs`



---

## 🧪 Testing

Pytest (backend):
```bash
cd backend
pytest tests/ -v
```

---

## 🐛 Troubleshooting

**El admin no se crea al iniciar el backend**
> Asegúrate de que MongoDB esté corriendo y `MONGO_URL` apunte al lugar correcto.

**Las cookies no se guardan en producción**
> Si tu frontend está en HTTPS, las cookies se marcan automáticamente como `Secure`. Asegúrate de que `FRONTEND_URL` empiece con `https://` en producción.


---

## 📄 Licencia

MIT — siéntete libre de adaptarlo a tu consultorio o proyecto.

---

## 🙏 Créditos

Construido con [Emergent](https://emergent.sh) — la plataforma full-stack para crear apps con IA.
