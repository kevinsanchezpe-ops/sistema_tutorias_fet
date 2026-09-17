import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { initPostgres } from './src/core/infrastructure/database/pg-init';
import { pgRepo } from './src/core/infrastructure/database/pg-repository';
import { runBusinessRulesTests } from './src/core/tests/business-rules.test';
import { runPostgresBusinessRulesTests } from './src/core/tests/postgres-business-rules.test';
import { UserRole } from './src/core/types';
import {
  generateAuthToken,
  verifyTokenMiddleware,
  requireAuth,
  requireRole,
  AuthenticatedRequest
} from './src/core/infrastructure/security/auth-security';
import { emailService } from './src/core/infrastructure/email/email-service';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // 1. Security Headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Permitir Vite scripts e inline styles en dev/preview
      crossOriginEmbedderPolicy: false
    })
  );

  // 2. CORS configuration
  app.use(cors());

  // 3. Body parser
  app.use(express.json({ limit: '10mb' }));

  // 4. Rate Limiting for Auth Endpoints (Prevents brute force attacks)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 50, // máximo 50 intentos por ventana por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Demasiados intentos de acceso desde esta dirección IP. Intenta de nuevo en 15 minutos.'
      }
    }
  });

  // 5. JWT token decoder middleware
  app.use(verifyTokenMiddleware as any);

  // Initialize PostgreSQL
  let isDbConnected = false;
  let dbInitError = '';

  try {
    const initResult = await initPostgres();
    if (initResult.success) {
      isDbConnected = true;
      console.log('✅ [PostgreSQL] Conexión establecida y esquema validado.');
    } else {
      dbInitError = initResult.message;
      console.warn('⚠️ [PostgreSQL] No se pudo conectar a PostgreSQL:', dbInitError);
    }
  } catch (err: any) {
    dbInitError = err.message;
    console.warn('⚠️ [PostgreSQL] Error de conexión:', dbInitError);
    console.warn('💡 Asegúrate de configurar tu contraseña en el archivo .env (PGPASSWORD o DATABASE_URL).');
  }

  // Middleware to check DB connection for data routes
  const requireDb = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!isDbConnected) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'DATABASE_NOT_CONNECTED',
          message:
            'PostgreSQL no está conectado todavía. Por favor ingresa tu contraseña de PostgreSQL en el archivo .env (variable PGPASSWORD o DATABASE_URL) y reinicia el servidor.'
        }
      });
    }
    next();
  };

  // Wrapper para manejar errores en handlers async (Express 4 no captura rechazos async)
  const asyncHandler =
    (fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<unknown>) =>
    (req, res, next) => {
      fn(req, res, next).catch(next);
    };

  // --- HEALTH & STATUS ---
  app.get('/api/health', (req, res) => {
    res.json({
      status: isDbConnected ? 'ok' : 'db_disconnected',
      service: 'Agendamientos Tutorias FET',
      database: isDbConnected ? 'PostgreSQL (Activo)' : 'Desconectado',
      error: dbInitError || null,
      timestamp: new Date().toISOString()
    });
  });

  // --- AUTH ---
  app.post('/api/auth/login', authLimiter, requireDb, async (req: AuthenticatedRequest, res) => {
    try {
      const { username, password, role } = req.body;
      const user = await pgRepo.login(username, password, role);
      if (!user) {
        return res.status(400).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'Credenciales inválidas o usuario no registrado.' }
        });
      }
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: { code: 'USER_INACTIVE', message: 'Su cuenta se encuentra inactiva. Contacte a Administración.' }
        });
      }

      // Generate JWT
      const token = generateAuthToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName
      });

      await pgRepo.logBinnacle('Inicio de Sesión', `Usuario ${user.fullName} (${user.role}) inició sesión con JWT`, user.username);
      res.json({
        success: true,
        data: {
          ...user,
          token
        },
        message: `Bienvenido de vuelta, ${user.fullName}`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'LOGIN_ERROR', message: err.message } });
    }
  });

  app.post('/api/auth/register', authLimiter, requireDb, async (req, res) => {
    try {
      const user = await pgRepo.registerStudent(req.body);
      const token = generateAuthToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName
      });
      res.json({
        success: true,
        data: {
          ...user,
          token
        },
        message: 'Estudiante registrado exitosamente con credenciales seguras.'
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'REGISTRATION_ERROR', message: err.message } });
    }
  });

  app.post('/api/auth/register-teacher', authLimiter, requireDb, async (req, res) => {
    try {
      const body = req.body || {};
      let initialAvailability = body.initialAvailability;

      // Traducir el formulario del admin (subjectIds + scheduleSlotIds) a disponibilidad inicial
      const subjectIds: string[] = body.subjectIds || [];
      const scheduleSlotIds: string[] = body.scheduleSlotIds || [];
      if (subjectIds.length > 0 && scheduleSlotIds.length > 0 && !initialAvailability) {
        initialAvailability = subjectIds.flatMap((subjectCourseId: string) =>
          scheduleSlotIds.map((scheduleSlotId: string) => ({ subjectCourseId, scheduleSlotId }))
        );
      }

      const user = await pgRepo.registerTeacher({ ...body, initialAvailability });
      const token = generateAuthToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName
      });
      res.json({
        success: true,
        data: {
          ...user,
          token
        },
        message: 'Docente registrado exitosamente con sus materias, horarios y token de acceso.'
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'REGISTRATION_ERROR', message: err.message } });
    }
  });

  app.get('/api/auth/me', requireDb, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } });
      }
      const user = await pgRepo.getUserById(req.user.userId);
      if (!user) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' } });
      }
      res.json({ success: true, data: user });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'AUTH_ERROR', message: err.message } });
    }
  });

  // Solicitud de restablecimiento de contraseña (Paso 1: Genera token y envía correo)
  app.post('/api/auth/forgot-password', authLimiter, requireDb, async (req, res) => {
    try {
      const { identity } = req.body;
      if (!identity || !identity.trim()) {
        return res.status(400).json({ success: false, error: { code: 'IDENTITY_REQUIRED', message: 'Ingresa tu correo o usuario institucional.' } });
      }

      const user = await pgRepo.getUserByEmailOrUsername(identity.trim());
      if (!user) {
        // Por seguridad, retornamos éxito genérico para no filtrar si el usuario existe o no
        return res.json({
          success: true,
          message: 'Si el correo o usuario coincide con una cuenta activa, se ha enviado un código de recuperación.'
        });
      }

      const resetToken = await pgRepo.createPasswordResetToken(user.id);
      await emailService.sendPasswordResetEmail(user.email, user.fullName, resetToken);

      res.json({
        success: true,
        message: `Se ha enviado un código de recuperación a ${user.email}. Por favor revisa tu bandeja de entrada o spam.`,
        // En entorno local de desarrollo exponemos una pista para facilitar pruebas si no hay SMTP activo
        debugToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'FORGOT_PASSWORD_ERROR', message: err.message } });
    }
  });

  // Ejecución de cambio de contraseña (Paso 2: Valida token y actualiza hash)
  app.post('/api/auth/reset-password', authLimiter, requireDb, async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !token.trim()) {
        return res.status(400).json({ success: false, error: { code: 'TOKEN_REQUIRED', message: 'El código de seguridad es requerido.' } });
      }
      if (!newPassword || newPassword.trim().length < 6) {
        return res.status(400).json({ success: false, error: { code: 'PASSWORD_TOO_SHORT', message: 'La nueva contraseña debe tener al menos 6 caracteres.' } });
      }

      const result = await pgRepo.resetPasswordWithToken(token.trim(), newPassword.trim());
      if (!result.success) {
        return res.status(400).json({ success: false, error: { code: 'RESET_FAILED', message: result.message } });
      }

      res.json({ success: true, message: result.message });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'RESET_PASSWORD_ERROR', message: err.message } });
    }
  });

  // --- TUTORINGS ---
  app.get('/api/tutorings', requireDb, async (req, res) => {
    try {
      const tutorings = await pgRepo.getTutorings();
      res.json({ success: true, data: tutorings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'GET_TUTORINGS_ERROR', message: err.message } });
    }
  });

  app.post('/api/tutorings', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const dto = req.body;
      const user = await pgRepo.getUserById(req.user!.userId);
      if (!user) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Usuario estudiante requerido.' } });
      }
      const tutoring = await pgRepo.createTutoring(dto, user);
      res.json({ success: true, data: tutoring, message: 'Solicitud de tutoría creada con éxito.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'CREATE_TUTORING_ERROR', message: err.message } });
    }
  });

  app.patch('/api/tutorings/:id/approve', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { space } = req.body;
      const approver = await pgRepo.getUserById(req.user!.userId);
      if (!approver || (approver.role !== UserRole.ADMIN && approver.role !== UserRole.TEACHER)) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Permiso de administrador o docente requerido.' } });
      }
      const tutoring = await pgRepo.approveTutoring(req.params.id, space, approver);
      res.json({ success: true, data: tutoring, message: 'Tutoría aprobada y programada correctamente.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'APPROVE_ERROR', message: err.message } });
    }
  });

  app.patch('/api/tutorings/:id/cancel', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { reason } = req.body;
      const user = await pgRepo.getUserById(req.user!.userId);
      if (!user) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Usuario no identificado.' } });
      }
      const tutoring = await pgRepo.cancelTutoring(req.params.id, reason, user);
      res.json({ success: true, data: tutoring, message: 'Tutoría cancelada correctamente.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'CANCEL_ERROR', message: err.message } });
    }
  });

  app.patch('/api/tutorings/:id/start', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const teacher = await pgRepo.getUserById(req.user!.userId);
      if (!teacher) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Docente titular requerido.' } });
      }
      const tutoring = await pgRepo.startTutoring(req.params.id, teacher);
      res.json({ success: true, data: tutoring, message: 'Tutoría iniciada. Sesión en progreso.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'START_ERROR', message: err.message } });
    }
  });

  app.patch('/api/tutorings/:id/stop', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { teacherComment } = req.body;
      const teacher = await pgRepo.getUserById(req.user!.userId);
      if (!teacher) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Docente titular requerido.' } });
      }
      const tutoring = await pgRepo.finishTutoring(req.params.id, teacher, teacherComment);
      res.json({ success: true, data: tutoring, message: 'Tutoría finalizada exitosamente.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'FINISH_ERROR', message: err.message } });
    }
  });

  app.post('/api/tutorings/:id/join', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const student = await pgRepo.getUserById(req.user!.userId);
      if (!student) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Estudiante requerido.' } });
      }
      const tutoring = await pgRepo.joinTutoring(req.params.id, student);
      res.json({ success: true, data: tutoring, message: 'Te has unido exitosamente a la tutoría.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'JOIN_ERROR', message: err.message } });
    }
  });

  app.post('/api/tutorings/:id/assistance', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { records } = req.body;
      const teacher = await pgRepo.getUserById(req.user!.userId);
      if (!teacher) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Docente titular requerido.' } });
      }
      const tutoring = await pgRepo.recordAssistance(req.params.id, records, teacher);
      res.json({ success: true, data: tutoring, message: 'Asistencia actualizada correctamente.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'ASSISTANCE_ERROR', message: err.message } });
    }
  });

  app.post('/api/tutorings/:id/rate', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { score, studentComment } = req.body;
      const student = await pgRepo.getUserById(req.user!.userId);
      if (!student) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Estudiante solicitante requerido.' } });
      }
      const tutoring = await pgRepo.rateTutoring({ tutoringId: req.params.id, score, studentComment }, student);
      res.json({ success: true, data: tutoring, message: 'Gracias por calificar la tutoría.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'RATE_ERROR', message: err.message } });
    }
  });

  // --- CATALOGS ---
  app.get('/api/subjects', requireDb, asyncHandler(async (req, res) => {
    res.json({ success: true, data: await pgRepo.getSubjects() });
  }));

  app.post('/api/subjects', requireDb, requireRole(UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
    try {
      const { adminId, ...dto } = req.body;
      const admin = await pgRepo.getUserById(req.user!.userId);
      if (!admin || admin.role !== UserRole.ADMIN) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin requerido.' } });
      }
      const subject = await pgRepo.createSubject(dto, admin);
      res.json({ success: true, data: subject, message: `Asignatura "${subject.name}" creada con éxito.` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'CREATE_SUBJECT_ERROR', message: err.message } });
    }
  });

  app.patch('/api/subjects/:id/toggle', requireDb, requireRole(UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
    try {
      const { adminId } = req.body;
      const admin = await pgRepo.getUserById(req.user!.userId);
      if (!admin || admin.role !== UserRole.ADMIN) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin requerido.' } });
      }
      const subject = await pgRepo.toggleSubjectActive(req.params.id, admin);
      res.json({ success: true, data: subject, message: `Asignatura ${subject.isActive ? 'activada' : 'inhabilitada'}.` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'TOGGLE_SUBJECT_ERROR', message: err.message } });
    }
  });

  app.delete('/api/subjects/:id', requireDb, requireRole(UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
    try {
      const { adminId } = req.body;
      const admin = await pgRepo.getUserById(req.user!.userId);
      if (!admin || admin.role !== UserRole.ADMIN) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin requerido.' } });
      }
      const subject = await pgRepo.deleteSubject(req.params.id, admin);
      res.json({ success: true, data: subject, message: `Asignatura "${subject.name}" eliminada permanentemente.` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'DELETE_SUBJECT_ERROR', message: err.message } });
    }
  });

  // --- CAREERS ---
  app.get('/api/careers', requireDb, asyncHandler(async (req, res) => {
    res.json({ success: true, data: await pgRepo.getCareers() });
  }));

  app.post('/api/careers', requireDb, requireRole(UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
    try {
      const { adminId, ...dto } = req.body;
      const admin = await pgRepo.getUserById(req.user!.userId);
      if (!admin || admin.role !== UserRole.ADMIN) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin requerido.' } });
      }
      const career = await pgRepo.createCareer(dto, admin);
      res.json({ success: true, data: career, message: `Carrera "${career.name}" creada con éxito.` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'CREATE_CAREER_ERROR', message: err.message } });
    }
  });

  app.put('/api/careers/:id', requireDb, requireRole(UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
    try {
      const { adminId, ...dto } = req.body;
      const admin = await pgRepo.getUserById(req.user!.userId);
      if (!admin || admin.role !== UserRole.ADMIN) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin requerido.' } });
      }
      const career = await pgRepo.updateCareer(req.params.id, dto, admin);
      res.json({ success: true, data: career, message: `Carrera "${career.name}" actualizada con éxito.` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'UPDATE_CAREER_ERROR', message: err.message } });
    }
  });

  app.patch('/api/careers/:id/toggle', requireDb, requireRole(UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
    try {
      const { adminId } = req.body;
      const admin = await pgRepo.getUserById(req.user!.userId);
      if (!admin || admin.role !== UserRole.ADMIN) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin requerido.' } });
      }
      const career = await pgRepo.toggleCareerActive(req.params.id, admin);
      res.json({ success: true, data: career, message: `Carrera ${career.isActive ? 'activada' : 'inhabilitada'}.` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'TOGGLE_CAREER_ERROR', message: err.message } });
    }
  });

  app.delete('/api/careers/:id', requireDb, requireRole(UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
    try {
      const { adminId } = req.body;
      const admin = await pgRepo.getUserById(req.user!.userId);
      if (!admin || admin.role !== UserRole.ADMIN) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin requerido.' } });
      }
      const career = await pgRepo.deleteCareer(req.params.id, admin);
      res.json({ success: true, data: career, message: `Carrera "${career.name}" eliminada permanentemente.` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'DELETE_CAREER_ERROR', message: err.message } });
    }
  });

  app.get('/api/schedules', requireDb, asyncHandler(async (req, res) => {
    res.json({ success: true, data: await pgRepo.getScheduleSlots() });
  }));

  app.get('/api/sections', requireDb, asyncHandler(async (req, res) => {
    res.json({ success: true, data: await pgRepo.getSections() });
  }));

  app.get('/api/availability', requireDb, asyncHandler(async (req, res) => {
    res.json({ success: true, data: await pgRepo.getTeacherAvailability() });
  }));

  app.patch('/api/availability/:id/toggle', requireDb, requireAuth, async (req, res) => {
    try {
      const item = await pgRepo.toggleTeacherAvailability(req.params.id);
      res.json({ success: true, data: item, message: `Disponibilidad ${item.isAvailable ? 'activada' : 'desactivada'}.` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'AVAILABILITY_ERROR', message: err.message } });
    }
  });

  app.post('/api/availability', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { subjectCourseId, scheduleSlotId } = req.body;
      const teacher = await pgRepo.getUserById(req.user!.userId);
      if (!teacher) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Docente requerido.' } });
      }
      const item = await pgRepo.addTeacherAvailability(teacher, subjectCourseId, scheduleSlotId);
      res.json({ success: true, data: item, message: 'Disponibilidad agregada exitosamente.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'AVAILABILITY_ERROR', message: err.message } });
    }
  });

  app.delete('/api/availability/:id', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const teacher = await pgRepo.getUserById(req.user!.userId);
      if (!teacher) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Usuario requerido.' } });
      }
      await pgRepo.deleteTeacherAvailability(req.params.id, teacher);
      res.json({ success: true, data: true, message: 'Franja eliminada.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'AVAILABILITY_ERROR', message: err.message } });
    }
  });

  app.post('/api/availability/batch', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { subjectCourseId, scheduleSlotIds } = req.body;
      const teacher = await pgRepo.getUserById(req.user!.userId);
      if (!teacher) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Docente requerido.' } });
      }
      const items = await pgRepo.setTeacherAvailabilityBatch(teacher, subjectCourseId, scheduleSlotIds);
      res.json({ success: true, data: items, message: 'Disponibilidad configurada exitosamente.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'AVAILABILITY_ERROR', message: err.message } });
    }
  });

  // --- TEACHER SUBJECTS (catálogo por docente) ---
  app.get('/api/teachers/:id/subjects', requireDb, async (req, res) => {
    try {
      const subjects = await pgRepo.getTeacherSubjects(req.params.id);
      res.json({ success: true, data: subjects });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'TEACHER_SUBJECTS_ERROR', message: err.message } });
    }
  });

  app.put('/api/teachers/:id/subjects', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { subjectIds } = req.body;
      const actor = await pgRepo.getUserById(req.user!.userId);
      if (!actor) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Usuario requerido.' } });
      }
      const isAdmin = actor.role === UserRole.ADMIN;
      const isSelf = actor.id === req.params.id;
      if (!isAdmin && !isSelf) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Permiso insuficiente.' } });
      }
      if (!Array.isArray(subjectIds)) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'subjectIds requerido.' } });
      }
      const subjects = await pgRepo.setTeacherSubjects(req.params.id, subjectIds, actor);
      res.json({ success: true, data: subjects, message: 'Asignaturas del docente actualizadas correctamente.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'TEACHER_SUBJECTS_ERROR', message: err.message } });
    }
  });

  app.put('/api/teachers/:id', requireDb, requireRole(UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
    try {
      const { adminId, fullName, phone, email, careerId, subjectIds } = req.body;
      const admin = await pgRepo.getUserById(req.user!.userId);
      if (!admin || admin.role !== UserRole.ADMIN) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin requerido.' } });
      }
      const user = await pgRepo.updateTeacherProfile(req.params.id, { fullName, phone, email, careerId }, admin);
      if (Array.isArray(subjectIds)) {
        await pgRepo.setTeacherSubjects(req.params.id, subjectIds, admin);
      }
      res.json({ success: true, data: user, message: 'Docente actualizado correctamente.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'UPDATE_TEACHER_ERROR', message: err.message } });
    }
  });

  // --- USERS ---
  app.get('/api/users', requireDb, asyncHandler(async (req, res) => {
    res.json({ success: true, data: await pgRepo.getUsers() });
  }));

  app.patch('/api/users/:id/toggle', requireDb, requireRole(UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
    try {
      const { adminId } = req.body;
      const admin = await pgRepo.getUserById(req.user!.userId);
      if (!admin || admin.role !== UserRole.ADMIN) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin requerido.' } });
      }
      const user = await pgRepo.toggleUserActive(req.params.id, admin);
      res.json({ success: true, data: user, message: `Usuario ${user.isActive ? 'activado' : 'desactivado'}.` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'TOGGLE_USER_ERROR', message: err.message } });
    }
  });

  app.delete('/api/users/:id', requireDb, requireRole(UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
    try {
      const { adminId } = req.body;
      const admin = await pgRepo.getUserById(req.user!.userId);
      if (!admin || admin.role !== UserRole.ADMIN) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin requerido.' } });
      }
      const user = await pgRepo.deleteUser(req.params.id, admin);
      res.json({ success: true, data: user, message: `Usuario "${user.fullName}" eliminado permanentemente.` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'DELETE_USER_ERROR', message: err.message } });
    }
  });

  // --- NOTIFICATIONS ---
  app.get('/api/notifications/:userId', requireDb, requireAuth, async (req, res) => {
    try {
      const list = await pgRepo.getNotifications(req.params.userId);
      res.json({ success: true, data: list });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'NOTIFICATIONS_ERROR', message: err.message } });
    }
  });

  app.patch('/api/notifications/:id/read', requireDb, requireAuth, async (req, res) => {
    try {
      await pgRepo.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'NOTIFICATIONS_ERROR', message: err.message } });
    }
  });

  app.post('/api/notifications/read-all/:userId', requireDb, requireAuth, async (req, res) => {
    try {
      await pgRepo.markAllNotificationsRead(req.params.userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'NOTIFICATIONS_ERROR', message: err.message } });
    }
  });

  // --- BINNACLE ---
  app.get('/api/binnacle', requireDb, asyncHandler(async (req, res) => {
    res.json({ success: true, data: await pgRepo.getBinnacle() });
  }));

  // --- INSTITUTION ---
  app.get('/api/institution', requireDb, asyncHandler(async (req, res) => {
    res.json({ success: true, data: await pgRepo.getInstitution() });
  }));

  app.put('/api/institution', requireDb, requireRole(UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
    try {
      const { adminId, ...info } = req.body;
      const admin = await pgRepo.getUserById(req.user!.userId);
      if (!admin || admin.role !== UserRole.ADMIN) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin requerido.' } });
      }
      const updated = await pgRepo.updateInstitution(info, admin);
      res.json({ success: true, data: updated, message: 'Datos institucionales actualizados.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'INSTITUTION_ERROR', message: err.message } });
    }
  });

  // --- ANALYTICS ---
  app.get('/api/analytics', requireDb, async (req, res) => {
    try {
      const data = await pgRepo.getAnalytics();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'ANALYTICS_ERROR', message: err.message } });
    }
  });

  // --- TESTS ---
  app.get('/api/tests', asyncHandler(async (req, res) => {
    const inMemory = runBusinessRulesTests();
    let postgres: { total: number; passed: number; results: { name: string; success: boolean; message: string }[] } = {
      total: 0,
      passed: 0,
      results: [
        {
          name: 'PostgreSQL no conectado',
          success: false,
          message: 'Los tests del camino real requieren PostgreSQL activo.'
        }
      ]
    };
    if (isDbConnected) {
      postgres = await runPostgresBusinessRulesTests();
    }
    const results = [...inMemory.results, ...postgres.results];
    res.json({ total: results.length, passed: results.filter((r) => r.success).length, results });
  }));

  // --- API 404 JSON (evita que rutas /api desconocidas devuelvan HTML o vacío) ---
  app.use('/api', (req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` }
    });
  });

  // --- Error handler global (captura rechazos async enviados con next(err)) ---
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(`[GT-API] Error en ${req.method} ${req.originalUrl}:`, err?.message || err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err?.message || 'Error interno del servidor.' }
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GT Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
