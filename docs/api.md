# API REST actual

El servidor Express expone rutas bajo `/api`. La sesión usa cookie `gt_token` (`HttpOnly`, `SameSite=Lax`, `Secure` en producción). Las solicitudes con sesión deben enviar credenciales; no se devuelve el JWT en JSON.

Respuestas habituales:

```json
{"success":true,"data":{},"message":"Operación exitosa"}
```

Errores:

```json
{"success":false,"error":{"code":"FORBIDDEN","message":"No tienes permisos."}}
```

## Autenticación

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/health` | Público, estado del backend y la conexión a PostgreSQL |
| POST | `/api/auth/login` | Público, con límite de intentos |
| POST | `/api/auth/register` | Público; registro de estudiante, dominio institucional permitido, contraseña de 10–100 caracteres y confirmación |
| POST | `/api/auth/register-teacher` | Administrador |
| POST | `/api/admin/students` | Administrador; entrega contraseña temporal que se debe cambiar al ingresar |
| POST | `/api/auth/change-password` | Sesión válida; exige confirmación |
| GET | `/api/auth/me` | Sesión válida |
| POST | `/api/auth/refresh` | Sesión válida |
| POST | `/api/auth/logout` | Público; limpia cookie y revoca sesiones actuales |
| POST | `/api/auth/forgot-password` | Público; respuesta genérica para no revelar cuentas |
| POST | `/api/auth/reset-password` | Público con token aleatorio de un uso y expiración |

## Tutorías

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/tutorings` | Sesión válida; admin ve todas, docente ve las asignadas, estudiante ve las propias/participadas y las aprobadas de su cohorte |
| POST | `/api/tutorings` | Estudiante |
| PATCH | `/api/tutorings/:id/approve` | Administrador o docente asignado |
| PATCH | `/api/tutorings/:id/cancel` | Solicitante, administrador o docente asignado |
| PATCH | `/api/tutorings/:id/start` | Docente asignado |
| PATCH | `/api/tutorings/:id/stop` | Docente asignado |
| POST | `/api/tutorings/:id/join` | Estudiante; tutoría grupal pendiente o aprobada sin iniciar |
| DELETE | `/api/tutorings/:id/participants/me` | Estudiante inscrito; retirarse antes de que inicie la tutoría |
| POST | `/api/tutorings/:id/assistance` | Docente asignado |
| POST | `/api/tutorings/:id/rate` | Participante estudiante, tutoría finalizada |

## Catálogos y disponibilidad

- `GET /api/subjects`, `GET /api/careers`, `GET /api/schedules`, `GET /api/sections`: lectura de catálogos.
- `POST/PATCH/DELETE /api/subjects...` y `POST/PUT/PATCH/DELETE /api/careers...`: administrador.
- `GET /api/availability`: sesión válida.
- `POST /api/availability` y `/batch`: docente dueño de la disponibilidad.
- `PATCH /api/availability/:id/toggle`, `DELETE /api/availability/:id`: docente dueño o administrador.
- `GET /api/teachers/:id/subjects`: sesión válida; docente propio o administrador.
- `PUT /api/teachers/:id/subjects`: docente propio o administrador.

## Usuarios, notificaciones y administración

- `GET /api/users`: administrador recibe cuentas; docente recibe su perfil y estudiantes relacionados con tutorías; estudiante recibe su perfil y docentes activos.
- `PUT /api/users/:id/profile`: usuario propio o administrador; solo foto de perfil y alias.
- `PATCH /api/users/:id/toggle`, `DELETE /api/users/:id`: administrador.
- `/api/notifications/:userId`: usuario dueño o administrador. Leer una notificación valida destinatario; marcar todas valida usuario dueño o administrador.
- `GET /api/binnacle`, `GET /api/analytics`: administrador.
- `GET /api/institution`: lectura pública; `PUT /api/institution`: administrador.
- `GET /api/tests`: desarrollo; en producción solo administrador.
- `GET /uploads/:filename`: usuario autenticado que sea administrador o participante de la tutoría correspondiente.

Todas las mutaciones validan la identidad desde la sesión del servidor; valores de identidad enviados por el cliente no otorgan permisos.
