# Sistema de Gestión de Tutorías (GT) - Modernizado

Sistema integral de gestión de tutorías académicas modernizado a partir del proyecto original [`dennis-andino/GT`](https://github.com/dennis-andino/GT), implementado con **Clean Architecture**, **Domain-Driven Design Ligero**, **TypeScript**, **Tailwind CSS** y **Recharts**.

---

## 🌟 Principio Rector

> **La lógica de negocio original se conserva al 100%.**
> Se mantienen los estados de tutoría (`PENDING = -1`, `IN_PROGRESS = 0`, `APPROVED = 1`, `COMPLETED = 2`, `CANCELLED = 3`), la regla de antelación mínima de 2 días (+2 días), la validación de no colisión de docentes y aulas, la inscripción de estudiantes invitados (`join`), la toma de asistencia por docente y el sistema de evaluación cualitativa y cuantitativa (1-5 estrellas).

---

## 👥 Roles del Sistema

1. **`STUDENT` (Estudiante):**
   - Explorar cursos, docentes y horarios disponibles.
   - Solicitar tutorías (presenciales o virtuales) con al menos 2 días de anticipación.
   - Unirse como invitado a tutorías de su carrera.
   - Calificar y comentar tutorías finalizadas.
   - Consultar historial y estadísticas personales.
2. **`TEACHER` (Docente / Tutor):**
   - Visualizar tutorías asignadas para el día y próximas fechas.
   - Iniciar tutoría en tiempo real.
   - Registrar la asistencia de los participantes.
   - Finalizar tutoría y consultar evaluaciones recibidas.
   - Configurar franjas de disponibilidad.
3. **`ADMIN` (Administrador):**
   - Supervisar solicitudes pendientes.
   - Aprobar tutorías asignando aula física o enlace virtual.
   - Cancelar solicitudes con motivo justificado.
   - Gestionar usuarios (estudiantes y docentes, activar/desactivar).
   - Administrar asignaturas, horarios y aulas.
   - Consultar métricas globales, gráficos y bitácora de auditoría.

---

## 🚀 Tecnologías

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Motion.
- **Backend:** Node.js, Express, Clean Architecture, REST API, JWT RBAC.
- **Arquitectura:** Domain Entities, Use Cases, Repository Pattern, Domain Services.
- **Infraestructura:** Docker, Docker Compose, PostgreSQL ready.

---

## 🛠️ Ejecución Local con Docker

```bash
# Iniciar servicios con Docker Compose
docker compose up --build
```

La aplicación estará disponible en `http://localhost:3000`.

---

## 📁 Documentación de Arquitectura y Migración

- `docs/migration/original-system-analysis.md`: Análisis exhaustivo del sistema legacy original.
- `docs/migration/mapping.md`: Mapeo de controladores, métodos y rutas.
- `docs/business-rules.md`: Detalle de todas las invariantes y reglas de negocio.
- `docs/domain.md`: Entidades de dominio, Value Objects y Servicios.
- `docs/architecture.md`: Estructura Clean Architecture y capas.
- `docs/api.md`: Contratos de endpoints REST.
- `docs/migration-plan.md`: Metodología de ejecución y testing.
