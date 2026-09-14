# Plan de Migración e Implementación Paso a Paso

El proceso de modernización se dividió en fases ordenadas para asegurar que **ninguna regla de negocio sufra alteraciones**:

```text
[ Fase 1: Auditoría ] ➔ [ Fase 2: Mapeo ] ➔ [ Fase 3: Dominio ] ➔ [ Fase 4: Backend ] ➔ [ Fase 5: Frontend ] ➔ [ Fase 6: Testing ]
```

---

## Fases Ejecutadas

1. **Fase 1 - Auditoría Completa del Repositorio Legacy:**
   - Análisis de `dennis-andino/GT`.
   - Extracción de todas las tablas y datos reales del respaldo SQL `gtBD-20210206_224723.sql`.
   - Detección de los códigos numéricos de estado `-1`, `1`, `0`, `2`, `3` y los flujos en `Tutorials.php` y `tutorialsController.php`.

2. **Fase 2 - Mapeo de Arquitectura:**
   - Mapeo de controladores monolíticos en Use Cases independientes orientados a acciones de negocio.
   - Consolidación de roles `Coordinator` y `Sys` en el rol unificado `ADMIN`.

3. **Fase 3 - Modelado de Dominio (DDD Ligero):**
   - Creación de entidades ricas en TypeScript: `User`, `Tutoring`, `TutoringAssistant`, `SubjectCourse`, `ScheduleSlot`, `Notification`.
   - Servicios de dominio para resolución de conflictos (`ScheduleConflictService`).

4. **Fase 4 - Implementación Backend (Clean Architecture):**
   - Configuración de controladores REST y DTOs con validación estricta.
   - Sistema de autenticación con RBAC.
   - Manejo centralizado de excepciones con respuestas estructuradas `{ success, data, error }`.
   - Publicación de endpoints para Student, Teacher y Admin.

5. **Fase 5 - Frontend React / Next.js:**
   - Dashboards diferenciados para Estudiante, Docente y Administrador.
   - Componentes de UI modernos, accesibles y responsivos con Tailwind CSS y Lucide Icons.
   - Gráficos estadísticos con Recharts (Frecuencia de Cursos, Calificaciones, Períodos).
   - Flujos completos de interacción: Solicitud, Aprobación/Rechazo, Inicio, Toma de Asistencia, Finalización y Evaluación.

6. **Fase 6 - Verificación y Pruebas:**
   - Pruebas unitarias de casos de uso y de reglas de negocio críticas (+2 días, no doble tutoría en la misma hora, no doble evaluación).
