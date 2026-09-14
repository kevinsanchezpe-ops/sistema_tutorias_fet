# Auditoría y Análisis del Sistema Original: GT (Gestión de Tutorías)

**Repositorio de Referencia:** `https://github.com/dennis-andino/GT`  
**Autor Original:** Dennis M. Andino  
**Propósito Original:** Sistema web para la gestión integral de tutorías de reforzamiento académico en centros de estudio de cualquier nivel educativo.

---

## 1. Arquitectura Tecnológica Original

- **Lenguaje / Backend:** PHP 7.x (Procedural / MVC ligero con PDO/MySQLi).
- **Base de Datos:** MySQL / MariaDB (Dump analizado: `assets/backup_bd/gtBD-20210206_224723.sql`).
- **Frontend Legacy:** PHP Views con motor de plantillas manual, HTML5, Bootstrap 4, AdminLTE 3, jQuery 3.5.1, DataTables, SweetAlert / AlertifyJS, Highcharts.
- **Seguridad Legacy:** `password_hash($pass, PASSWORD_BCRYPT, ['cost' => 4])`, sesiones PHP nativas (`$_SESSION`).

---

## 2. Estructura de Base de Datos y Entidades Originales

Del análisis directo del volcado SQL oficial (`gtBD-20210206_224723.sql`), se extraen las siguientes 16 tablas y sus esquemas:

1. **`logins` (Usuarios del sistema):**
   - `id`: INT (PK Auto-increment)
   - `username`: VARCHAR(25) NOT NULL
   - `pass`: VARCHAR(200) NOT NULL (bcrypt)
   - `userRole`: INT(11) NOT NULL (FK a `roles.id`)
   - `createOn`, `lastUpdate`: VARCHAR(20)
   - `fullname`: VARCHAR(50), `alias`: VARCHAR(50)
   - `email`: VARCHAR(200), `phone`: VARCHAR(50)
   - `campus`: INT (FK `campus.id`), `career`: INT (FK `careers.id`)
   - `account`: VARCHAR(20) (Número de cuenta institucional)
   - `birthDate`: VARCHAR(20), `admissionDate`: VARCHAR(25)
   - `photo`: VARCHAR(300) DEFAULT 'userdefault.png'
   - `generalPoint`: INT DEFAULT 0
   - `observations`: VARCHAR(500)
   - `tutorCategory`: INT DEFAULT 1 (FK `tutortypes.id`)
   - `availability`: TINYINT(1) DEFAULT 1 (1 = Activo, 0 = Inactivo)

2. **`roles` (Roles del sistema original):**
   - 1: Student (Estudiante)
   - 2: Tutor (Docente / Tutor)
   - 3: Coordinator (Coordinador de tutorías)
   - 4: Sys (Administrador del sistema)
   *(En la modernización, se consolidan estrictamente en `STUDENT`, `TEACHER` y `ADMIN`)*.

3. **`tutorials` (Núcleo del negocio):**
   - `id`: INT (PK)
   - `subject`: VARCHAR(100) (Tema / Asunto de la tutoría)
   - `details`: VARCHAR(500) (Detalle o explicación de la solicitud)
   - `reservdate`: VARCHAR(25) (Fecha reservada para impartir la tutoría)
   - `requestdate`: VARCHAR(25) (Fecha y hora de creación de la solicitud)
   - `filename`: VARCHAR(100) (Adjunto: PDF, DOC, imagen)
   - `status`: INT(11) DEFAULT -1 (**Estados de negocio**)
   - `score`: INT(11) DEFAULT 0 (Calificación 1 a 5 estrellas otorgada por el estudiante)
   - `initialtime`, `finaltime`: VARCHAR(25) (Horas programadas)
   - `starttime`, `finishtime`: VARCHAR(25) (Horas reales de ejecución)
   - `stucomment`: VARCHAR(500) (Comentario de evaluación del estudiante)
   - `tutcomment`: VARCHAR(500) (Comentario/observación del docente)
   - `space`: VARCHAR(500) (Aula física asignada o URL de sesión virtual Zoom/Meet)
   - `period_`: INT (FK `periods.id`)
   - `asignatura`: INT (FK `courses.id`)
   - `approvedby`: INT (FK `logins.id` del aprobador)
   - `tutor`: INT (FK `logins.id` del docente)
   - `petitioner`: INT (FK `logins.id` del estudiante solicitante)
   - `modality`: INT (0 = Presencial, 1 = Virtual)

4. **`schedules` (Bloques horarios estándar):**
   - Ejemplos: "07:30 - 08:30", "09:00 - 10:00", "14:00 - 15:00", etc.
   - `availability`: 1 o 0.

5. **`sch_tut` (Disponibilidad de Docente por Horario y Asignatura):**
   - Relaciona `tutor` + `schedule` + `course` + `availability`.

6. **`sections` (Espacios / Aulas físicas):**
   - Ejemplos: "Laboratorio 1", "Laboratorio 2", "Aula 25-Edificio B2", "Aula Magna".

7. **`courses` (Asignaturas / Materias):**
   - `coursename`, `career`.

8. **`careers` (Carreras universitarias / académicas):**
   - Ejemplos: "Ingeniería en Sistemas", "Administración de Empresas", etc.

9. **`campus` (Sedes / Campus institucionales).**

10. **`members_assistance` (Asistencia y Participantes invitados):**
    - `tutorial`: FK a `tutorials.id`
    - `student`: FK a `logins.id`
    - `assistance`: TINYINT (0 = Ausente, 1 = Presente)

11. **`notifications` (Notificaciones del sistema):**
    - `destinationid`, `subject`, `content`, `status` (0 = no leída, 1 = leída), `date`.

12. **`binnacle` (Bitácora de auditoría):**
    - `typeevent`, `description`, `date_event`, `hour_event`, `username`, `ip_address`.

13. **`institution` (Datos institucionales):**
    - `name`, `vision`, `mision`, `address`, `telefone`, `email`, `logo`.

---

## 3. Estados de las Tutorías y Ciclo de Vida

En el código original (`models/Tutorials.php` y procedimientos almacenados):

| Código Estado | Nombre | Significado de Negocio |
|---|---|---|
| **-1** | `PENDING` (Pendiente) | Solicitud recién creada por el estudiante. En espera de revisión por el Administrador. |
| **1** | `APPROVED` (Aprobada / Programada) | Aprobada por el Administrador, con espacio (aula o URL virtual) asignado y docente confirmado. |
| **0** | `IN_PROGRESS` (En proceso) | El docente inició la sesión (`startTutorial`). Se registra `starttime` exacto. |
| **2** | `COMPLETED` (Finalizada) | El docente finalizó la sesión (`stopTutorial`). Se registra `finishtime` exacto. Lista para calificar. |
| **3** | `CANCELLED` (Cancelada / Rechazada) | Cancelada por el Administrador o por el estudiante con motivo especificado en `space`. |

---

## 4. Reglas de Negocio Extraídas del Código Fuente

1. **Anticipación de la Reserva:**
   - La fecha de reserva (`reservdate`) debe ser como mínimo **2 días posteriores a la fecha actual** (`date('Y-m-d', strtotime('+2 day'))`).
2. **Validación de Conflicto de Docente:**
   - No puede existir otra tutoría en la misma fecha y bloque horario asignada al mismo docente (`new_tutoria->exists()`).
3. **Validación de Conflicto de Espacio / Aula:**
   - En modalidad presencial, al momento de aprobar o reconfigurar una tutoría, se valida que el aula física (`sections`) no esté ocupada en ese mismo horario y fecha (`validateSectionState`).
4. **Modalidad:**
   - Si `modality === 0` (Presencial): se requiere asignación de un aula/sección de las habilitadas.
   - Si `modality === 1` (Virtual): se asigna enlace de videoconferencia (Zoom, Meet, Teams).
5. **Compañeros / Invitados (`joinToTut`):**
   - Otros estudiantes de la misma carrera o asignaturas compartidas pueden unirse a una tutoría en estado pendiente o aprobada como invitados (`members_assistance`).
6. **Ejecución y Asistencia:**
   - Solo el docente asignado puede iniciar la tutoría (`start`) y marcar la asistencia individual de cada estudiante registrado (solicitante e invitados).
   - Solo el docente asignado puede concluirla (`stop`).
7. **Calificación y Evaluación:**
   - Solo el estudiante solicitante de una tutoría finalizada (`status === 2`) puede evaluarla con puntuación (1 a 5) y comentario (`stucomment`). No se permite calificar más de una vez.
8. **Notificaciones Automáticas:**
   - Se despachan notificaciones al estudiante al ser aprobada o cancelada su solicitud.
   - Se despachan notificaciones al docente al serle asignada una nueva tutoría.
