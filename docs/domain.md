# Modelo de Dominio (Domain Driven Design Ligero)

El diseño del dominio desacopla por completo la lógica empresarial de las tecnologías de persistencia (Prisma/PostgreSQL), librerías de UI o frameworks de transporte HTTP (NestJS/Express).

---

## 1. Entidades Principales del Dominio

### `User` (Entidad Raíz)
- `id`: UniqueIdentifier (UUID)
- `username`: Username (VO)
- `email`: Email (VO)
- `fullName`: string
- `alias`: string
- `phone`: string
- `role`: UserRole (`STUDENT`, `TEACHER`, `ADMIN`)
- `account`: string (Número de cuenta / carnet)
- `campusId`: string
- `careerId`: string
- `birthDate`: Date
- `admissionDate`: Date
- `isActive`: boolean
- `observations`: string | null
- `createdAt`: Date
- `updatedAt`: Date

### `Tutoring` (Entidad de Agregado Principal)
- `id`: string
- `subject`: string
- `details`: string
- `reservDate`: string (YYYY-MM-DD)
- `requestDate`: Date
- `modality`: TutoringModality (`PRESENCIAL`, `VIRTUAL`)
- `status`: TutoringStatus (`PENDING`, `APPROVED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`)
- `space`: string (Aula física o URL virtual)
- `subjectCourseId`: string
- `teacherId`: string
- `petitionerStudentId`: string
- `scheduleSlotId`: string
- `approvedById`: string | null
- `startTime`: string | null
- `finishTime`: string | null
- `score`: number (0 a 5)
- `studentComment`: string | null
- `teacherComment`: string | null
- `attachmentUrl`: string | null
- `assistants`: TutoringAssistant[]

### `TutoringAssistant`
- `id`: string
- `tutoringId`: string
- `studentId`: string
- `studentName`: string
- `hasAttended`: boolean
- `isPetitioner`: boolean
- `joinedAt`: Date

### `SubjectCourse`
- `id`: string
- `name`: string
- `code`: string
- `careerId`: string
- `isActive`: boolean

### `ScheduleSlot`
- `id`: string
- `startTime`: string (HH:mm)
- `finishTime`: string (HH:mm)
- `isActive`: boolean

### `TeacherAvailability`
- `id`: string
- `teacherId`: string
- `scheduleSlotId`: string
- `subjectCourseId`: string
- `isAvailable`: boolean

### `SectionClassroom`
- `id`: string
- `name`: string (e.g., "Laboratorio 1", "Aula Magna")
- `isAvailable`: boolean

### `Notification`
- `id`: string
- `recipientUserId`: string
- `subject`: string
- `content`: string
- `isRead`: boolean
- `createdAt`: Date

### `BinnacleEntry` (Audit Log)
- `id`: string
- `typeEvent`: string
- `description`: string
- `username`: string
- `ipAddress`: string
- `createdAt`: Date

---

## 2. Value Objects

- **`TutoringStatus`**:
  - `PENDING = -1`
  - `IN_PROGRESS = 0`
  - `APPROVED = 1`
  - `COMPLETED = 2`
  - `CANCELLED = 3`
- **`TutoringModality`**:
  - `PRESENCIAL = 0`
  - `VIRTUAL = 1`
- **`UserRole`**:
  - `STUDENT = 'STUDENT'`
  - `TEACHER = 'TEACHER'`
  - `ADMIN = 'ADMIN'`

---

## 3. Servicios de Dominio (Domain Services)

- **`ScheduleConflictService`**:
  Verifica si un docente o un aula física se encuentran colisionados en un rango de fecha y bloque horario determinado.
- **`TutoringStateMachineService`**:
  Controla de forma estricta las transiciones de estado permitidas del ciclo de vida de la tutoría.
- **`TutoringEligibilityService`**:
  Valida que el estudiante cumpla la regla de solicitud con mínimo 2 días de antelación y pertenezca a la carrera o materia adecuada.
