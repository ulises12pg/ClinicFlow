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
- ✉️ **Recordatorios por email** automáticos (cron 8 PM diario) + envío manual con un clic
- ⚙️ **Configuración del consultorio** con subida directa de logo (drag & drop)
- 🌓 **Modo Claro / Oscuro** con persistencia
- 📱 **Responsive** desktop + mobile, interfaz 100% en español

---

## 🛠️ Stack tecnológico

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- [MongoDB](https://www.mongodb.com/) con [Motor](https://motor.readthedocs.io/) (async driver)
- [APScheduler](https://apscheduler.readthedocs.io/) para tareas programadas
- [Resend](https://resend.com) para emails transaccionales
- JWT (PyJWT) + bcrypt para autenticación

**Frontend**
- [React 19](https://react.dev/) + [React Router 7](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [react-day-picker](https://react-day-picker.js.org/) para el calendario
- [Axios](https://axios-http.com/), [Lucide React](https://lucide.dev/)

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

# Resend (email reminders) — opcional, los recordatorios no enviarán sin esto
RESEND_API_KEY="re_tu_api_key"
SENDER_EMAIL="onboarding@resend.dev"
SENDER_NAME="Consultorio Médico"
REMINDER_HOUR="20"
TIMEZONE="America/Mexico_City"

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
- **Email:** `admin@medconsulta.com`
- **Password:** `Admin123!`

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
| `FRONTEND_URL` | URL del frontend (para cookies seguras) | `http://localhost:3000` |
| `RESEND_API_KEY` | API key de [Resend](https://resend.com) | `re_xxx` |
| `SENDER_EMAIL` | Remitente de los emails | `onboarding@resend.dev` |
| `SENDER_NAME` | Nombre que aparece como remitente | `Consultorio Médico` |
| `REMINDER_HOUR` | Hora del cron diario (0–23) | `20` |
| `TIMEZONE` | Zona horaria del cron | `America/Mexico_City` |
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
| POST | `/api/appointments/{id}/send-reminder` | Enviar recordatorio manual |
| POST | `/api/appointments/run-daily-reminders-now` | Ejecutar el cron ahora (admin) |
| GET/POST | `/api/settings` | Configuración del consultorio |
| POST | `/api/upload/logo` | Subir logo |
| GET | `/api/logo` | Servir el logo |
| GET | `/api/dashboard/stats` | Estadísticas |
| GET/POST/PUT/DELETE | `/api/users[/{id}]` | Usuarios (admin) |

Documentación interactiva (Swagger): `http://localhost:8001/docs`

---

## ✉️ Configurar Resend (recordatorios por email)

1. Crea cuenta gratis en [resend.com](https://resend.com) (3,000 emails/mes en plan free).
2. **Settings → API Keys → Create API Key** → copia la key (`re_...`) y pégala en `RESEND_API_KEY`.
3. **Modo sandbox**: por defecto solo puedes enviar emails a la dirección con la que registraste tu cuenta de Resend. Para enviar a cualquier paciente debes verificar un dominio propio en **Settings → Domains**.
4. Una vez verificado tu dominio, cambia `SENDER_EMAIL` en `.env` (ej. `citas@miconsultorio.com`).

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

**Los emails no llegan**
> 1) Revisa que `RESEND_API_KEY` esté configurada. 2) En sandbox solo se envía al email del owner de la cuenta Resend. 3) Revisa la carpeta de spam.

**El cron no se dispara a la hora esperada**
> Verifica `REMINDER_HOUR` y `TIMEZONE` en `.env`. El scheduler usa la zona horaria configurada (default: `America/Mexico_City`).

---

## 📄 Licencia

MIT — siéntete libre de adaptarlo a tu consultorio o proyecto.

---

## 🙏 Créditos

Construido con [Emergent](https://emergent.sh) — la plataforma full-stack para crear apps con IA.
