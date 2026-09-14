# Documentación de la API REST - Sistema GT

Todas las respuestas de la API devuelven un formato estructurado estándar:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operación exitosa"
}
```

En caso de error:

```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "La fecha de reserva debe tener al menos 2 días de anticipación"
  }
}
```

---

## 1. Módulo de Autenticación (`/api/auth`)

- `POST /api/auth/login`: Autentica al usuario y entrega token JWT + perfil.
- `POST /api/auth/register`: Registro de estudiante con datos institucionales.
- `POST /api/auth/refresh`: Renovación de token JWT.
- `POST /api/auth/logout`: Invalidación de sesión.

---

## 2. Módulo de Usuarios (`/api/users`)

- `GET /api/users/me`: Perfil del usuario autenticado.
- `PATCH /api/users/me`: Actualización de datos de contacto y observaciones.
- `GET /api/users`: Listado de usuarios con filtros por rol (Solo ADMIN).
- `PATCH /api/users/:id/toggle-active`: Activar o desactivar cuenta de usuario (Solo ADMIN).

---

## 3. Módulo de Asignaturas y Horarios (`/api/subjects`, `/api/schedules`)

- `GET /api/subjects`: Listado de asignaturas activas.
- `POST /api/subjects`: Creación de asignatura (Solo ADMIN).
- `GET /api/schedules`: Franjas horarias del centro de estudio.
- `GET /api/schedules/availability`: Disponibilidad de docentes por asignatura.
- `POST /api/schedules/teacher-slot`: Asignación o activación de disponibilidad docente (TEACHER o ADMIN).
- `GET /api/sections`: Listado de aulas y espacios físicos habilitados.

---

## 4. Módulo de Tutorías (`/api/tutorings`)

- `GET /api/tutorings`: Listado filtrado según el rol (Estudiante ve las suyas y próximas; Docente ve las asignadas; Admin ve todas).
- `POST /api/tutorings`: Crear nueva solicitud de tutoría (Solo STUDENT).
  - *Body:* `{ subject, details, reservDate, scheduleSlotId, subjectCourseId, teacherId, modality, attachmentName? }`
- `GET /api/tutorings/:id`: Detalle completo de una tutoría y sus asistentes.
- `POST /api/tutorings/:id/join`: Estudiante se une a la tutoría como invitado (Solo STUDENT).
- `PATCH /api/tutorings/:id/approve`: Aprobar tutoría asignando aula o enlace virtual (Solo ADMIN).
- `PATCH /api/tutorings/:id/cancel`: Cancelar tutoría especificando motivo (ADMIN o STUDENT).
- `PATCH /api/tutorings/:id/start`: Iniciar tutoría (Solo TEACHER asignado).
- `PATCH /api/tutorings/:id/stop`: Finalizar tutoría (Solo TEACHER asignado).
- `POST /api/tutorings/:id/assistance`: Registrar asistencia de los estudiantes (Solo TEACHER).
- `POST /api/tutorings/:id/rate`: Calificar tutoría finalizada (Solo STUDENT solicitante).
  - *Body:* `{ score: 1..5, comment: string }`

---

## 5. Módulo de Notificaciones (`/api/notifications`)

- `GET /api/notifications`: Obtener notificaciones del usuario en sesión.
- `PATCH /api/notifications/:id/read`: Marcar notificación como leída.
- `PATCH /api/notifications/read-all`: Marcar todas las notificaciones como leídas.

---

## 6. Módulo de Analytics y Reportes (`/api/analytics`)

- `GET /api/analytics/dashboard`: Métricas resumidas y datasets para gráficos según el rol:
  - Frecuencia por asignatura.
  - Frecuencia por período académico.
  - Distribución de calificaciones (1 a 5 estrellas).
  - Tasa de cumplimiento y cancelaciones.
