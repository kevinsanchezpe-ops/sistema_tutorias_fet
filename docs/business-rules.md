# Reglas de Negocio Oficiales: Sistema GT

Este documento formaliza todas las invariantes y reglas de negocio del Sistema de Gestión de Tutorías (GT), asegurando una fidelidad del 100% respecto a la lógica original.

---

## 1. Identidades y Roles

1. **`STUDENT` (Estudiante):**
   - Único rol que puede solicitar tutorías.
   - Único rol que puede unirse como invitado (`join`) a tutorías programadas de su carrera o materias transversales.
   - Único rol que puede emitir calificaciones (`score` 1-5 y `stucomment`) una vez finalizada la tutoría.

2. **`TEACHER` (Docente / Tutor):**
   - Imparte las tutorías asignadas según sus horarios configurados.
   - Es el único con autorización para presionar **Iniciar tutoría** (`start`) y **Finalizar tutoría** (`stop`).
   - Registra la lista de asistencia de los estudiantes (`members_assistance`).
   - Configura su disponibilidad activa/inactiva por asignatura.

3. **`ADMIN` (Administrador):**
   - Posee control global del sistema (unifica las facultades de Coordinación y Administración de Sistemas del software original).
   - Valida solicitudes en estado Pendiente (`-1`), asigna aula física o enlace virtual, o cancela con motivo.
   - Supervisa franjas horarias, asignaturas, estudiantes, docentes y bitácora.

---

## 2. Ciclo de Vida y Máquina de Estados de una Tutoría

Una tutoría transita exclusivamente por los siguientes estados:

```text
[ -1: PENDING ] (Estudiante crea solicitud con horario de docente)
      │
      ├──> [ 1: APPROVED / PROGRAMADA ] (Admin asigna aula física o link virtual)
      │          │
      │          └──> [ 0: IN_PROGRESS ] (Docente presiona Iniciar tutoría)
      │                     │
      │                     └──> [ 2: COMPLETED ] (Docente presiona Finalizar tutoría)
      │                                │
      │                                └──> [ Calificada por Estudiante ]
      │
      └──> [ 3: CANCELLED ] (Cancelada por Admin o Estudiante con motivo)
```

### Reglas de Transición:
- De `-1` a `1`: Solo cuando el Administrador valida la disponibilidad del aula (o link) y no hay colisión horaria.
- De `-1` a `3`: Cancelación/Denegación por parte del Administrador especificando la razón, o cancelación preventiva del solicitante.
- De `1` a `0`: Solo el Docente asignado el día programado.
- De `0` a `2`: Solo el Docente asignado al concluir la sesión. Se registra la hora exacta de culminación.
- No se permiten transiciones inversas (por ejemplo, de `2` a `1` o de `3` a `0`).

---

## 3. Reglas de Validación de Solicitudes y Horarios

1. **Regla de Anticipación Temporal (+2 Días):**
   - La fecha de la tutoría (`reservdate`) no puede ser en el mismo día ni al día siguiente; debe programarse con al menos **2 días calendario de antelación**.
   ```typescript
   const minDate = new Date();
   minDate.setDate(minDate.getDate() + 2);
   ```

2. **Regla de No Colisión de Docente:**
   - Un docente no puede tener dos tutorías aprobadas o pendientes para la misma fecha y bloque horario.
   ```typescript
   if (existingTutoringForTeacherAndSlot(teacherId, reservDate, scheduleSlotId)) {
     throw new BusinessRuleException('El docente ya tiene una tutoría programada en ese horario.');
   }
   ```

3. **Regla de Disponibilidad de Aula / Sección:**
   - Para modalidad Presencial (`modality === 0`), dos tutorías presenciales distintas no pueden compartir la misma aula física (`space`) en la misma fecha y franja horaria.
   ```typescript
   if (modality === Modality.PRESENCIAL && isSectionOccupied(space, reservDate, scheduleSlotId)) {
     throw new BusinessRuleException('El aula seleccionada ya está ocupada en ese horario.');
   }
   ```

4. **Regla de Modalidad Virtual:**
   - Para modalidad Virtual (`modality === 1`), el administrador debe suministrar una URL válida de sala virtual (Zoom, Google Meet, Teams, etc.).

---

## 4. Participación de Estudiantes Invitados (`join`)

1. Al crear una solicitud, el estudiante elige si será individual o grupal. Las individuales no admiten invitados; las grupales aparecen en **Tutorías disponibles**.
2. Al aprobar una tutoría grupal, el docente o administrador confirma el cupo máximo, incluyendo al solicitante. El cupo no puede exceder la capacidad del aula o el límite virtual configurado.
3. Solo estudiantes que cumplan los requisitos de carrera y semestre pueden unirse a tutorías grupales aprobadas mientras haya cupo.
4. Un estudiante no puede unirse como invitado a su propia tutoría ni inscribirse dos veces.
5. Un participante invitado puede retirarse mientras la tutoría esté pendiente o aprobada, siempre antes de que el docente la inicie. El retiro no cancela la sesión y queda registrado en la bitácora; el docente recibe una notificación.
6. Al unirse, se crea un registro en `tutoring_assistants` con asistencia pendiente.

---

## 5. Asistencia y Conclusión

1. Durante o al finalizar la tutoría (estados `IN_PROGRESS` o `COMPLETED`), el docente marca la presencia individual de los alumnos participantes.
2. Los alumnos confirmados reciben `assistance = 1`.

---

## 6. Calificaciones y Evaluaciones

1. Solo el estudiante que solicitó originalmente la tutoría puede calificarla.
2. La tutoría debe estar en estado `COMPLETED` (`status === 2`).
3. El estudiante puede otorgar entre 1 y 5 estrellas (`score`) y redactar un comentario cualitativo (`stucomment`).
4. Una tutoría ya calificada (`score > 0`) no puede ser re-evaluada para preservar la integridad estadística.

---

## 7. Notificaciones

1. Todo cambio de estado crítico emite una notificación persistente con asunto, mensaje legible y fecha/hora:
   - **Solicitud Aprobada**: Notificación al estudiante con fecha, hora y ubicación/enlace.
   - **Solicitud Asignada**: Notificación al docente con detalles del solicitante y tema.
   - **Solicitud Cancelada**: Notificación al estudiante con el motivo de rechazo.
   - **Nuevo Participante**: Notificación al docente informando que un alumno se ha sumado como invitado.
