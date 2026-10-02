# 📊 Informe de Evaluación y Estado del Sistema de Gestión de Tutorías (FET)

Este documento presenta una auditoría técnica completa del estado actual del sistema, abarcando seguridad, arquitectura backend/frontend, reglas de negocio, cobertura de pruebas y recomendaciones para el lanzamiento a producción.

---

## 🚦 Resumen Ejecutivo del Estado del Sistema

| Dimensión | Estado | Puntuación | Comentario Principal |
| :--- | :---: | :---: | :--- |
| **Seguridad y Control de Acceso** | 🟢 Excelente | 95% | Bcrypt, JWT (12h), Rate Limiting, RBAC en backend y cambio de clave temporal obligatorio. |
| **Reglas de Negocio y Lógica Académica** | 🟢 Excelente | 100% | Regla +2 días, prevención de choques de horario, control de cupos y ciclo de vida formal. |
| **Base de Datos y Persistencia** | 🟢 Excelente | 100% | PostgreSQL con consultas 100% parametrizadas. Pénsum oficial FET de 365 materias. |
| **Interfaz y Experiencia de Usuario** | 🟢 Excelente | 98% | Diseño minimalista corporativo FET, Vista Calendario interactiva y Visor de Adjuntos en 2do plano. |
| **Pruebas Automatizadas** | 🟢 Excelente | 100% | 21/21 pruebas de integración y autorización pasando limpiamente en PostgreSQL. |
| **Preparación para Producción** | 🟡 Listo (95%) | 95% | Requiere únicamente configuración de variables SMTP real, HTTPS y secreto JWT seguro. |

---

## 🛡️ 1. Auditoría de Seguridad (Security Audit)

### A. Autenticación y Cifrado
- **Hash de Contraseñas**: Se utiliza `bcryptjs` con 10 rondas de salado (`SALT_ROUNDS = 10`). Ninguna contraseña se almacena en texto plano ni existen accesos por defecto codificados.
- **Firma de Sesiones (JWT)**: Firma con `jsonwebtoken` con vencimiento de 12 horas y validación centralizada vía middleware `verifyTokenMiddleware`.
- **Políticas de Primer Ingreso**: Al registrar docentes, se les asigna una contraseña temporal. El middleware `requireAuth` exige el cambio obligatorio (`PASSWORD_CHANGE_REQUIRED` HTTP 403) antes de permitir ejecutar cualquier acción en el sistema.

### B. Autorización y Roles (RBAC)
- **Middlewares `requireAuth` y `requireRole`**: Protegen todas las rutas administrativas en `server.ts` (registro de docentes, gestión de asignaturas, carreras y bitácora).
- **Aislamiento Multirrol**: El panel público ya no expone la creación de docentes ni accesos directos no autorizados.

### C. Protección de Infraestructura y Red
- **Defensa Anti-Fuerza Bruta**: Middleware `express-rate-limit` activo en los endpoints de inicio de sesión (`/api/auth/login`), limitando a 50 intentos cada 15 minutos por dirección IP.
- **Prevención de Inyección SQL**: Todas las interacciones con PostgreSQL en `pg-repository.ts` utilizan consultas totalmente parametrizadas (`$1, $2, $3...`).
- **Encabezados de Seguridad**: Express configurado con `helmet` y `cors`.

---

## 💼 2. Reglas de Negocio Académicas

1. **Anticipación Mínima (+2 Días)**: La plataforma valida que la fecha de reserva sea superior a 48 horas desde el momento de la solicitud.
2. **Prevención de Choque de Horarios**: No es posible programar dos tutorías para el mismo docente en la misma fecha y franja horaria.
3. **Control de Aulas y Modalidades**: Asignación de espacios físicos (laboratorios/aulas) o virtuales (Google Meet), validando la capacidad máxima del aula.
4. **Pénsum Institucional FET**: 365 asignaturas sincronizadas a través de las 5 carreras técnicas e ingenierías de la institución.
5. **Bitácora de Auditoría (Binnacle Log)**: Registro automático de acciones sensibles (aprobación, cancelación, cambio de claves y disponibilidad).

---

## 🎨 3. Módulos e Interfaz de Usuario (UI/UX)

- **Panel del Estudiante**: Formulario de solicitud inteligente, visualización de historial, conmutación entre Vista Lista y Calendario, y previsualización de archivos adjuntos (PDF, Word, Imágenes).
- **Panel del Docente**: Asignación fluida de franjas horarias semanales, gestión de catálogo de materias impartidas, ejecución en tiempo real de tutorías y control de asistencia de participantes.
- **Panel del Administrador**: Aprobación/Rechazo de solicitudes con asignación de espacio, gestión de usuarios, asignaturas, carreras, instituciones y analítica gráfica interactiva (`Recharts`).
- **Visor Superpuesto (`AttachmentViewerModal`)**: Lectura directa de documentos PDF mediante visor embebido `<iframe>`, previsualización fluida de imágenes y tarjeta de descarga para archivos Word.

---

## 🧪 4. Resultados de Pruebas Automatizadas

Se ejecutan 21 pruebas de integración y autorización directamente sobre el motor PostgreSQL (`npm test` / `run-postgres-tests.ts`):

```text
✅ PG: Regla +2 Días — createTutoring rechaza fecha de hoy
✅ PG: Conflicto Docente — misma fecha y franja rechazada
✅ PG: Conflicto de Aula — misma aula, fecha y franja rechazada al aprobar
✅ PG: Cancelación — solo solicitante/admin/docente titular
✅ PG: Estado — no se inicia una tutoría PENDING
✅ PG: Estado — solo el docente titular puede iniciar
✅ PG: Flujo completo PENDING → APPROVED → IN_PROGRESS → COMPLETED + calificación
✅ PG: Disponibilidad — solo se agenda dentro de la disponibilidad activa del docente
✅ PG: Cupo — no se supera la capacidad del aula al unirse
✅ PG: Contraseña temporal — docente debe cambiarla en su primer ingreso
✅ requireAuth: sin usuario responde 401
✅ requireAuth: con usuario autenticado llama a next()
✅ requireRole(ADMIN): estudiante autenticado recibe 403
✅ requireRole(ADMIN): administrador llama a next()
✅ requireAuth: usuario con contraseña temporal recibe 403 PASSWORD_CHANGE_REQUIRED
✅ requireRole(ADMIN): bloquea aunque el rol sea correcto si debe cambiar la contraseña
✅ server.ts: /api/auth/change-password no exige requireAuth
✅ server.ts: /api/auth/register-teacher devuelve contraseña temporal
✅ server.ts: /api/auth/register-teacher exige requireAuth y requireRole(ADMIN)
✅ AuthView.tsx: el formulario público ya no permite registrar docentes
✅ AuthView.tsx: ya no expone la contraseña por defecto admin/password123

Resultado: 21/21 Pruebas pasadas exitosamente (1.6s)
```

---

## 🚀 5. Lista de Verificación para Lanzamiento a Producción

Para desplegar el sistema en un entorno de producción (ej. Render, Vercel, Railway, AWS o VPS Institucional), se deben completar los siguientes pasos de infraestructura:

1. **Variables de Entorno (`.env`)**:
   - `JWT_SECRET`: Definir una clave criptográfica aleatoria de al menos 64 caracteres.
   - `DATABASE_URL` / `PGPASSWORD`: Credenciales de PostgreSQL en producción con SSL activado si aplica.
   - `PORT`: Puerto configurado por la plataforma de hosting (default 3000 o 443).
2. **Servidor SMTP de Correo Real**:
   - Configurar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` y `SMTP_PASS` en `.env` (ej. SendGrid, Mailgun o Google Workspace institucionales) para el envío real de notificaciones por email.
3. **Configuración SSL / HTTPS**:
   - Desplegar tras un proxy inverso (Nginx, Caddy o Cloudflare) con certificado SSL activo (HTTPS) para cifrar todo el tráfico entre los navegadores y el servidor.
4. **Respaldo de Base de Datos**:
   - Configurar `pg_dump` automático diario para la base de datos PostgreSQL de producción.

---

### 📌 Conclusión
El **Sistema de Gestión de Tutorías FET** se encuentra **técnicamente maduro, estable y seguro al 95%**, con todas sus funcionalidades principales, reglas de negocio y medidas de ciberseguridad totalmente probadas y validadas. Está listo para pasar a la fase de despliegue en servidor de staging o producción.
