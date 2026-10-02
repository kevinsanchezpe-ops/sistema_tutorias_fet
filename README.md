# Sistema de Gestión de Tutorías - Fundación Escuela Tecnológica (FET) 2026

[![Estado de Pruebas](https://img.shields.io/badge/Pruebas-21%2F21%20PASADAS-brightgreen)](./docs/analisis_sistema_lanzamiento.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-8.23-336791)](https://www.postgresql.org/)
[![Seguridad](https://img.shields.io/badge/Seguridad-Bcrypt%20%2B%20JWT%20%2B%20RateLimit-orange)](#-seguridad-y-ciberseguridad)

Sistema Web de Gestión Integral de Tutorías Académicas para la **Fundación Escuela Tecnológica de Neiva (FET)**. Diseñado bajo principios de **Clean Architecture**, **Domain-Driven Design (DDD) Ligero**, **TypeScript**, **PostgreSQL** y **React**, optimizado para el control institucional, la prevención de deserción académica y el seguimiento continuo del aprendizaje.

---

## Características Principales

- **Gestión Multirrol (RBAC)**: Paneles independientes y especializados para **Estudiantes**, **Docentes** y **Administradores**.
- **Vista Calendario Interactivo**: Visualización por **Mes** y por **Semana** con codificación por colores institucionales de acuerdo con el estado de cada tutoría.
- **Visualizador de Archivos Adjuntos en 2do Plano**: Soporte directo para anexar documentos (PDF, DOC/DOCX e imágenes) en las solicitudes, con visor embebido superpuesto (`<iframe>` interactivo).
- **Control Académico Estricto**:
  - Regla de antelación mínima de **48 horas (+2 Días)** para reservas.
  - Sincronización del **pénsum oficial FET de 365 asignaturas** en las 5 carreras de la institución.
  - Validación automatizada para evitar colisiones de horarios en docentes y choques de aulas físicas/virtuales.
  - Control de capacidad máxima de aulas y registro de asistencia en tiempo real por parte del tutor.
- **Seguridad Institucional**: Cifrado de contraseñas con `bcryptjs` (10 rondas), tokens `JWT` de 12h, protección contra fuerza bruta con `express-rate-limit` y cambio de clave obligatorio para nuevos docentes.
- **Métricas e Informes Visuales**: Dashboard analítico interactivo con gráficos dinámicos de distribución de materias, rendimiento y bitácora de auditoría inmutable.

---

## Roles y Funcionalidades del Sistema

### 1. Estudiante (`STUDENT`)

- **Solicitar Tutorías**: Agendar tutorías (Presenciales o Virtuales) seleccionando carrera, materia, docente y horario disponible con +2 días de anticipación.
- **Adjuntar Documentos**: Anexar archivos PDF, Word o imágenes con sus consultas académicas.
- **Modo Lista y Calendario**: Alternar la visualización del historial entre tabla tradicional y calendario mensual/semanal. Al hacer clic en un día libre del calendario, se preselecciona la fecha de reserva.
- **Inscripción a Tutorías (`Join`)**: Unirse como participante a tutorías grupales de su carrera o asignaturas transversales.
- **Evaluación y Retroalimentación**: Calificar las tutorías completadas (1 a 5 estrellas) y redactar observaciones cualitativas.

### 2. Docente (`TEACHER`)

- **Catálogo Propio de Asignaturas**: Seleccionar libremente las materias que imparte en la institución.
- **Gestión de Disponibilidad Horaria**: Configurar franjas horarias semanales de atención por asignatura.
- **Ejecución en Tiempo Real**: Botón **Iniciar Tutoría** y **Finalizar Tutoría** registrando las horas exactas de inicio y término.
- **Toma de Asistencia**: Marcar asistencia individual de los estudiantes participantes.
- **Visualizador de Adjuntos**: Revisar en segundo plano los archivos PDF/Word/imágenes subidos por los alumnos sin abandonar su panel.

### 3. Administrador (`ADMIN`)

- **Aprobación y Asignación**: Revisar solicitudes pendientes, asignar aulas físicas (laboratorios/salones) o enlaces de videoconferencia (Meet), o denegar con motivo justificado.
- **Alta Segura de Docentes**: Registro exclusivo de tutores asignando contraseñas temporales que obligan al cambio en el primer ingreso.
- **Gestión Institucional**: Control de usuarios, carreras, asignaturas del pénsum, franjas horarias y aulas.
- **Bitácora de Auditoría (Binnacle)**: Trazabilidad de todas las acciones críticas del sistema.
- **Analítica Gráfica**: Gráficos dinámicos con `Recharts` sobre tutorías por estado, carrera, modalidad y nivel de satisfacción.

---

## Stack Tecnológico

| Capa              | Tecnología                                                   | Descripción                                                                          |
| :---------------- | :----------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| **Frontend**      | React 19, TypeScript, Tailwind CSS 4, Lucide Icons, Recharts | Interfaz responsive, moderna, corporativa y minimalista.                             |
| **Backend**       | Node.js, Express, Clean Architecture, REST API               | Servidor rápido con capas separadas y controladores orientados a casos de uso.       |
| **Seguridad**     | BcryptJS, JSON Web Tokens (JWT), Express-Rate-Limit, Helmet  | Cifrado seguro de credenciales, autenticación por token y protección contra botnets. |
| **Base de Datos** | PostgreSQL 16+ (`pg`), Consultas Parametrizadas              | Motor relacional robusto con 100% de consultas inmunes a SQL Injection.              |
| **Emails**        | Nodemailer, Adaptador EmailService                           | Notificaciones automáticas con plantillas HTML institucionales FET.                  |

---

## Instalación y Ejecución Local

### Prerequisitos

- Node.js v18+ y npm v9+
- PostgreSQL v14+ activo (o servidor en la nube ej. Neon, Supabase, Render)

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone https://github.com/kevinsanchezpe-ops/sistema-gestion-tutorias-fet.git
cd sistema-gestion-tutorias-fet
npm install
```

### 2. Configurar Variables de Entorno (`.env`)

Crea un archivo `.env` en la raíz del proyecto basado en el siguiente formato:

```ini
# Servidor HTTP
PORT=3000

# Base de Datos PostgreSQL
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=tu_contrasena_postgres
PGDATABASE=gt_db

# Clave Secreta para Firmar Tokens JWT
JWT_SECRET=desarrollo_jwt_secret_fet_2026_muy_seguro_12345

# Configuración de Correo SMTP (Opcional en desarrollo)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notificaciones@fet.edu.co
SMTP_PASS=tu_password_smtp
```

### 3. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`. La base de datos PostgreSQL creará automáticamente las tablas y cargará el pénsum oficial de 365 asignaturas de la FET al arrancar.

---

## Pruebas Automatizadas

El proyecto cuenta con una suite completa de pruebas ejecutadas directamente sobre PostgreSQL que validan reglas de negocio, autorizaciones y máquina de estados.

```bash
npm test
```

### Cobertura de Pruebas:

```text
PG: Regla +2 Días — createTutoring rechaza fecha de hoy
PG: Conflicto Docente — misma fecha y franja rechazada
PG: Conflicto de Aula — misma aula, fecha y franja rechazada al aprobar
PG: Cancelación — solo solicitante/admin/docente titular
PG: Estado — no se inicia una tutoría PENDING
PG: Estado — solo el docente titular puede iniciar
PG: Flujo completo PENDING → APPROVED → IN_PROGRESS → COMPLETED + calificación
PG: Disponibilidad — solo se agenda dentro de la disponibilidad activa del docente
PG: Cupo — no se supera la capacidad del aula al unirse
PG: Contraseña temporal — docente debe cambiarla en su primer ingreso
requireAuth: sin usuario responde 401
requireAuth: con usuario autenticado llama a next()
requireRole(ADMIN): estudiante autenticado recibe 403
requireRole(ADMIN): administrador llama a next()
requireAuth: usuario con contraseña temporal recibe 403 PASSWORD_CHANGE_REQUIRED
requireRole(ADMIN): bloquea aunque el rol sea correcto si debe cambiar la contraseña
server.ts: /api/auth/change-password no exige requireAuth
server.ts: /api/auth/register-teacher devuelve contraseña temporal
server.ts: /api/auth/register-teacher exige requireAuth y requireRole(ADMIN)
AuthView.tsx: el formulario público ya no permite registrar docentes
AuthView.tsx: ya no expone la contraseña por defecto admin/password123

Resultado: 21/21 Pruebas pasadas exitosamente (1.6s)
```

---

## Directorio de Documentación (`docs/`)

La carpeta [`docs/`](./docs) contiene la documentación técnica oficial del proyecto:

- [`docs/analisis_sistema_lanzamiento.md`](./docs/analisis_sistema_lanzamiento.md): **Informe Técnico de Evaluación, Seguridad y Despliegue**.
- [`docs/DOCUMENTO_RUP.md`](./docs/DOCUMENTO_RUP.md): **Especificación Formal RUP (Rational Unified Process)** para la FET.
- [`docs/GUIA_DESPLIEGUE_PRODUCCION.md`](./docs/GUIA_DESPLIEGUE_PRODUCCION.md): **Guía de Operación en Producción (PM2, Nginx, SSL)**.
- [`docs/architecture.md`](./docs/architecture.md): **Arquitectura Clean y Estructura Monolito Modular**.
- [`docs/business-rules.md`](./docs/business-rules.md): **Especificación de Reglas de Negocio Institucionales**.
- [`docs/api.md`](./docs/api.md): **Documentación del Contrato de API REST**.
- [`docs/domain.md`](./docs/domain.md): **Modelo de Dominio e Identidades DDD**.

---

## Licencia

Este proyecto fue desarrollado para la **Fundación Escuela Tecnológica de Neiva (FET)**. Todos los derechos reservados.
