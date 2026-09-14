# Mapa de Migración: De Legacy a Clean Architecture Modular

Este documento mapea minuciosamente cada controlador, modelo y flujo del sistema legacy PHP (`GT`) a la arquitectura moderna construida bajo Clean Architecture, Domain-Driven Design ligero y TypeScript.

---

## 1. Mapeo de Roles y Autenticación

| Sistema Original (PHP) | Sistema Modernizado (Clean Architecture) |
|---|---|
| `roles.id = 1 (Student)` | `UserRole.STUDENT` con `StudentProfile` |
| `roles.id = 2 (Tutor)` | `UserRole.TEACHER` con `TeacherProfile` |
| `roles.id = 3 (Coordinator)` | `UserRole.ADMIN` (unificado) |
| `roles.id = 4 (Sys)` | `UserRole.ADMIN` (unificado) |
| `usersController::login()` | `AuthModule` -> `LoginUseCase`, JWT + Refresh Token |
| `usersController::save()` (registro estudiante) | `AuthModule` -> `RegisterStudentUseCase` |
| `usersController::changeState()` | `UsersModule` -> `ToggleUserActiveUseCase` |
| `usersController::updateInfo()` | `UsersModule` -> `UpdateUserProfileUseCase` |

---

## 2. Mapeo del Módulo de Tutorías

| Componente Original (Legacy) | Componente Moderno (Clean Architecture) | Capa / Ubicación |
|---|---|---|
| `tutorialsController::save()` | `CreateTutoringUseCase` | `application/use-cases/create-tutoring.use-case.ts` |
| `tutorialsController::approve()` | `ApproveTutoringUseCase` / `CancelTutoringUseCase` | `application/use-cases/approve-tutoring.use-case.ts` |
| `tutorialsController::start()` | `StartTutoringUseCase` | `application/use-cases/start-tutoring.use-case.ts` |
| `tutorialsController::stop()` | `FinishTutoringUseCase` | `application/use-cases/finish-tutoring.use-case.ts` |
| `tutorialsController::join()` | `JoinTutoringUseCase` | `application/use-cases/join-tutoring.use-case.ts` |
| `tutorialsController::SaveAssistance()` | `RecordAssistanceUseCase` | `application/use-cases/record-assistance.use-case.ts` |
| `tutorialsController::setScore()` | `RateTutoringUseCase` | `application/use-cases/rate-tutoring.use-case.ts` |
| `tutorialsController::reconfigure()` | `ReconfigureTutoringUseCase` | `application/use-cases/reconfigure-tutoring.use-case.ts` |
| `tutorialsController::delete()` | `DeleteTutoringUseCase` | `application/use-cases/delete-tutoring.use-case.ts` |
| `Tutorials::validateSectionState()` | `ScheduleConflictService.validateSectionAvailability()` | `domain/services/schedule-conflict.service.ts` |
| `Tutorials::exists()` | `ScheduleConflictService.validateTeacherAvailability()` | `domain/services/schedule-conflict.service.ts` |

---

## 3. Mapeo de Horarios y Disponibilidad

| Componente Original (Legacy) | Componente Moderno (Clean Architecture) |
|---|---|
| `schedulesController::index()` | `SchedulesModule` -> `GetSchedulesUseCase` |
| `schedulesController::save()` | `SchedulesModule` -> `CreateScheduleSlotUseCase` |
| `schedulesController::assignTutor()` | `SchedulesModule` -> `AssignTeacherScheduleUseCase` |
| `Schedules::getSchedByCourse()` | `SchedulesModule` -> `GetAvailableSchedulesBySubjectUseCase` |
| `Schedules::activateScheduleByTut()` | `SchedulesModule` -> `ToggleTeacherScheduleAvailabilityUseCase` |

---

## 4. Mapeo de Notificaciones y Eventos

| Evento Original en Stored Procedure / PHP | Evento de Dominio Moderno | Handler Desacoplado |
|---|---|---|
| Aprobación de tutoría | `TutoringApprovedEvent` | `TutoringApprovedNotificationHandler` (Crea notificación a Alumno y Docente) |
| Cancelación de tutoría | `TutoringCancelledEvent` | `TutoringCancelledNotificationHandler` (Notifica al Alumno con razón) |
| Nueva tutoría solicitada | `TutoringCreatedEvent` | `TutoringCreatedNotificationHandler` (Notifica a Administrador) |
| Alumno se une a tutoría | `StudentJoinedEvent` | `StudentJoinedNotificationHandler` (Notifica a Docente) |
| `notificationController::watch()` | `GetMyNotificationsUseCase` + `MarkNotificationReadUseCase` |

---

## 5. Mapeo de Reportes y Estadísticas

| Procedimiento / Método Original | Caso de Uso Moderno |
|---|---|
| `tutorialsController::statistic()` | `AnalyticsModule` -> `GetAdminAnalyticsUseCase` |
| `tutorialsController::tutorEvaluations()` | `AnalyticsModule` -> `GetTeacherAnalyticsUseCase` |
| `Tutorials::getHistorialStu()` | `AnalyticsModule` -> `GetStudentHistoryUseCase` |
| `Tutorials::getFrecuencyCourses()` | `AnalyticsModule` -> `GetCourseFrequencyReportUseCase` |
| `Tutorials::getFrecuencybyPeriod()` | `AnalyticsModule` -> `GetPeriodFrequencyReportUseCase` |
| `Tutorials::getEvaluation()` | `AnalyticsModule` -> `GetEvaluationDistributionUseCase` |

---

## 6. Mapeo de Vistas Frontend

| Vista PHP Legacy | Ruta Frontend Moderna | Componente / Dashboard |
|---|---|---|
| `views/login.php` | `/(auth)/login` | Formulario de autenticación JWT moderno |
| `views/Student/student_register.php` | `/(auth)/register` | Formulario de registro estudiantil validado |
| `views/Student/mainStudent.php` | `/student/dashboard` | Dashboard estudiante + Solicitud de tutoría + Próximas tutorías |
| `views/Student/historialStudent.php` | `/student/history` | Historial de solicitudes, tutorías como invitado y modal de evaluación |
| `views/Tutor/mainTutor.php` | `/teacher/dashboard` & `/teacher/tutorings` | Panel de tutorías asignadas, Iniciar, Finalizar, Asistencia de miembros |
| `views/Tutor/scheduleTutor.php` | `/teacher/schedule` | Configuración de disponibilidad docente por materia y franja horaria |
| `views/Tutor/evaluationsTutor.php` | `/teacher/evaluations` | Histórico de valoraciones, gráficos y comentarios recibidos |
| `views/Coordinator/mainCoordinator.php` | `/admin/tutorings` | Supervisión de solicitudes, Aprobación con asignación de aula/link, Cancelación |
| `views/Coordinator/usersModuleInk.php` | `/admin/users` | Gestión de Estudiantes y Docentes, activación/desactivación |
| `views/Coordinator/schedulesModule.php` | `/admin/schedules` | Gestión de franjas horarias y secciones/aulas físicas |
| `views/Coordinator/statistiCoordinator.php` | `/admin/reports` | Reportes estadísticos interactivos con Recharts |
| `views/layouts/miInstitution.php` | `/admin/institution` | Configuración de identidad institucional |
| `views/layouts/binnacleSys.php` | `/admin/binnacle` | Visor de bitácora y auditoría del sistema |
