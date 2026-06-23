# MedConsulta — PRD & Estado del Proyecto

## Descripción
Sistema de gestión para consultorio médico familiar. Permite expedir recetas médicas, llevar historial de pacientes, controlar inventario de medicamentos, gestionar la agenda de citas con recordatorios automáticos por email, y administrar múltiples usuarios con roles.

## Arquitectura
- **Backend:** FastAPI + MongoDB (Motor async) + JWT auth (httpOnly cookies) + APScheduler
- **Frontend:** React + TailwindCSS + shadcn/ui + react-day-picker
- **Auth:** JWT con roles: admin, doctor, enfermero/a
- **Storage:** Emergent Object Storage (logos)
- **Email:** Resend (transactional)

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
- [x] **Recordatorios de citas por Email** (Feb 2026):
  - Automático: APScheduler corre todos los días a las 20:00 (America/Mexico_City) y envía recordatorios para citas del día siguiente
  - Manual: botón Mail/MailCheck en cada cita (icono cambia a verde tras envío exitoso)
  - Endpoint admin de prueba: `POST /api/appointments/run-daily-reminders-now`
  - Plantilla HTML responsive en español con datos del consultorio
  - Persistencia: `email_reminder_sent`, `email_reminder_sent_at`, `email_reminder_to`, `email_reminder_id`
  - Restricción de rol: solo admin/doctor pueden enviar
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
- `appointments`: {patient_id, patient_name, doctor_id, doctor_name, date, time, duration, type, status, notes, email_reminder_sent, email_reminder_sent_at, email_reminder_to, email_reminder_id}

## Endpoints clave
- POST `/api/auth/login`, POST `/api/auth/logout`
- GET/POST/PUT/DELETE `/api/patients`
- GET/POST/PUT/DELETE `/api/prescriptions`
- GET/POST/PUT/DELETE `/api/inventory`
- GET/POST/PUT/DELETE `/api/appointments` (filtros: `?date=YYYY-MM-DD` o `?month=YYYY-MM`)
- POST `/api/appointments/{id}/send-reminder` (admin/doctor)
- POST `/api/appointments/run-daily-reminders-now` (admin)
- GET/POST `/api/settings`, POST `/api/upload/logo`, GET `/api/logo`
- GET `/api/dashboard/stats`

## Variables de entorno relevantes (.env backend)
- `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `CORS_ORIGINS`, `FRONTEND_URL`, `EMERGENT_LLM_KEY`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — bootstrap del admin
- `RESEND_API_KEY`, `SENDER_EMAIL`, `SENDER_NAME` — para envío de emails
- `REMINDER_HOUR` (default 20), `TIMEZONE` (default America/Mexico_City)

## Testing
- Backend: 32/32 pytest tests pasan (`/app/backend/tests/test_medconsulta.py`)
- Frontend: 100% flujos validados con Playwright
- Último reporte: `/app/test_reports/iteration_3.json`

## Backlog / Próximos pasos
### P1 (mejoras opcionales)
- [ ] **SMS reminders (Twilio)** — siguiente integración pendiente
- [ ] Verificar dominio propio en Resend para enviar a cualquier paciente (actualmente sandbox solo manda a la cuenta owner)
- [ ] Reemplazar `<input type="date">` del modal de Agenda con shadcn Calendar
- [ ] Validadores Pydantic estrictos para fecha/hora en `ApptCreate`
- [ ] Devolver 404 en PUT/DELETE `/appointments/{id}` cuando no existe
- [ ] Estructurar el reason del job como código (`NO_EMAIL`) en vez de matching de string

### P2 (futuro)
- [ ] Buscador global
- [ ] Filtros por fecha en recetas
- [ ] Modularizar `server.py` (~870 líneas) en routers separados por dominio
- [ ] Reportes PDF de agenda diaria
- [ ] Confirmación/cancelación de cita por parte del paciente vía link en email

## Integraciones de terceros
- Emergent Object Storage (logos)
- **Resend** (email transactional, sandbox key activa)
- APScheduler (cron interno, no externo)
