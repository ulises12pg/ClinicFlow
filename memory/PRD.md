# MedConsulta — PRD & Estado del Proyecto

## Descripción
Sistema de gestión para consultorio médico familiar. Permite expedir recetas médicas, llevar historial de pacientes, controlar inventario de medicamentos, gestionar la agenda de citas, y administrar múltiples usuarios con roles.

## Arquitectura
- **Backend:** FastAPI + MongoDB (Motor async) + JWT auth (httpOnly cookies)
- **Frontend:** React + TailwindCSS + shadcn/ui + react-day-picker
- **Auth:** JWT con roles: admin, doctor, enfermero/a
- **Storage:** Emergent Object Storage (logos)

## Credenciales de prueba
- Email: admin@medconsulta.com
- Password: Admin123!
- Rol: admin

## Implementado

### Módulos principales
- [x] Autenticación — Login/logout JWT, múltiples roles
- [x] Dashboard — Estadísticas + widget "Citas de Hoy"
- [x] Pacientes — CRUD, búsqueda, historial clínico, **email + teléfono**
- [x] Recetas Médicas — Creación dinámica, impresión/PDF, **autocomplete desde inventario + descuento atómico de stock al dispensar**
- [x] Inventario — CRUD, indicadores de stock bajo/crítico
- [x] Agenda / Citas Médicas — Calendario mensual, vista por día, CRUD, tipos, estados, contadores

- [x] Usuarios — Gestión con roles (solo admin)
- [x] Configuración — Nombre/logo/dirección del consultorio
- [x] Subida de logo — Drag & drop (Emergent Object Storage)
- [x] Tema Claro/Oscuro

### UX Features
- Interfaz 100% en Español (mx)
- Diseño responsivo desktop + mobile
- Calendar react-day-picker en español

## Schema de DB
- `users`: {email, password_hash, role, name, specialization}
- `patients`: {name, age, phone, **email**, background, blood_type, allergies, chronic_conditions}
- `prescriptions`: {patient_id, medications, diagnosis, date, status}
- `inventory`: {name, generic_name, quantity, min_stock, expiration}
- `settings`: {clinic_name, clinic_specialty, clinic_address, clinic_phone, clinic_logo_path}
- `appointments`: {patient_id, patient_name, doctor_id, doctor_name, date, time, duration, type, status, notes}

## Endpoints clave
- POST `/api/auth/login`, POST `/api/auth/logout`
- GET/POST/PUT/DELETE `/api/patients`
- GET/POST/PUT/DELETE `/api/prescriptions`
- GET/POST/PUT/DELETE `/api/inventory`
- GET/POST/PUT/DELETE `/api/appointments` (filtros: `?date=YYYY-MM-DD` o `?month=YYYY-MM`)

- GET/POST `/api/settings`, POST `/api/upload/logo`, GET `/api/logo`
- GET `/api/dashboard/stats`

## Variables de entorno relevantes (.env backend)
- `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `CORS_ORIGINS`, `FRONTEND_URL`, `EMERGENT_LLM_KEY`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — bootstrap del admin


## Testing
- Backend: 37/37 pytest tests pasan (`/app/backend/tests/test_medconsulta.py`)
- Frontend: 100% flujos validados con Playwright
- Último reporte: `/app/test_reports/iteration_3.json`

## Backlog / Próximos pasos
### P1 (mejoras opcionales)
- [ ] **SMS reminders (Twilio)** — siguiente integración pendiente
- [ ] Reemplazar `<input type="date">` del modal de Agenda con shadcn Calendar
- [ ] Validadores Pydantic estrictos para fecha/hora en `ApptCreate`
- [ ] Devolver 404 en PUT/DELETE `/appointments/{id}` cuando no existe


### P2 (futuro)
- [ ] Buscador global
- [ ] Filtros por fecha en recetas
- [ ] Modularizar `server.py` (~870 líneas) en routers separados por dominio
- [ ] Reportes PDF de agenda diaria


## Integraciones de terceros
- Emergent Object Storage (logos)

