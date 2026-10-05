import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { initPostgres } from './src/core/infrastructure/database/pg-init';
import { pgRepo } from './src/core/infrastructure/database/pg-repository';
import { runBusinessRulesTests } from './src/core/tests/business-rules.test';
import { runPostgresBusinessRulesTests } from './src/core/tests/postgres-business-rules.test';
import { runAuthzTests } from './src/core/tests/authz.test';
import { UserRole } from './src/core/types';
import {
  generateAuthToken,
  verifyTokenMiddleware,
  requireAuth,
  requireRole,
  AuthenticatedRequest,
  AUTH_COOKIE_MAX_AGE
} from './src/core/infrastructure/security/auth-security';
import { emailService } from './src/core/infrastructure/email/email-service';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Validación dura de secretos en producción
  if (process.env.NODE_ENV === 'production') {
    const jwt = process.env.JWT_SECRET || '';
    const db = process.env.DATABASE_URL || '';
    if (jwt.length < 32 || /secret|change|example|test/i.test(jwt)) {
      throw new Error('JWT_SECRET inseguro o ausente en producción. Genera uno de 32+ caracteres.');
    }
    if (!db) throw new Error('DATABASE_URL es obligatoria en producción.');
    const dbUrl = new URL(db);
    if (['localhost', '127.0.0.1'].includes(dbUrl.hostname)) throw new Error('DATABASE_URL no puede apuntar a localhost en producción.');
    if (dbUrl.hostname !== 'postgres' && dbUrl.searchParams.get('sslmode') !== 'verify-full') {
      throw new Error('La conexión PostgreSQL remota debe usar sslmode=verify-full.');
    }
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP_HOST, SMTP_USER y SMTP_PASS son obligatorios en producción para recuperación y notificaciones.');
    }
  }

  // 0. Trust proxy (Render/Railway/Nginx) para IP real y rate-limit correcto
  app.set('trust proxy', 1);

  // Adjuntos en disco (no base64 en PG): carpeta pública /uploads
  const uploadsDir = path.join(process.cwd(), 'uploads');
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch {}
  const saveAttachmentToDisk = (originalName: string, dataUrl: string): string => {
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const buf = Buffer.from(base64, 'base64');
    if (buf.length > 8 * 1024 * 1024) throw new Error('El archivo no debe exceder los 8 MB.');
    const ext = originalName.trim().toLowerCase().split('.').pop() || 'bin';
    const fname = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(uploadsDir, fname), buf);
    return `/uploads/${fname}`;
  };

  // 1. Security Headers with Helmet (CSP activa en producción)
  const isProd = process.env.NODE_ENV === 'production';
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'blob:'],
              connectSrc: ["'self'"],
              frameSrc: ["'self'", 'https://meet.google.com'],
              objectSrc: ["'none'"],
              baseUri: ["'self'"]
            }
          }
        : false,
      crossOriginEmbedderPolicy: false
    })
  );

  // 2. CORS restringido por origen + cookies
  const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean) as string[];
  if (process.env.NODE_ENV !== 'production') allowedOrigins.push('http://localhost:3000', 'http://localhost:5173');
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true); // curl / mismo origen / healthchecks
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('CORS_BLOCKED'));
      },
      credentials: true
    })
  );

  // 3. Body parser (límite para adjuntos base64 de hasta 8MB + overhead)
  app.use(express.json({ limit: '10mb' }));

  // 4. Rate Limiting: auth estricto + global API anti-abuso
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
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Demasiadas peticiones. Intenta de nuevo en unos minutos.' }
    }
  });
  app.use('/api/', apiLimiter);

  // Helpers: cookies HttpOnly (sin dependencia extra) + validación de borde
  const setAuthCookie = (res: express.Response, token: string) => {
    const secure = process.env.NODE_ENV === 'production';
    res.appendHeader(
      'Set-Cookie',
      `gt_token=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax${secure ? '; Secure' : ''}`
    );
  };
  // Anti-fuerza-bruta en reset-password: 5 fallos por usuario => bloqueo 15 min
  const resetAttempts = new Map<string, { count: number; until: number }>();
  const RESET_MAX_FAILS = 5;
  const RESET_LOCK_MS = 15 * 60 * 1000;
  const clearAuthCookie = (res: express.Response) => {
    const secure = process.env.NODE_ENV === 'production';
    res.appendHeader(
      'Set-Cookie',
      `gt_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure ? '; Secure' : ''}`
    );
  };
  const isValidEmail = (v: unknown): v is string =>
    typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) && v.trim().length <= 160;
  const cleanStr = (v: unknown, max = 500): string =>
    typeof v === 'string' ? v.trim().slice(0, max) : '';
  const publicError = (err: any): string => {
    if (typeof err?.code === 'string' && /^[0-9A-Z]{5}$/.test(err.code)) {
      return 'No se pudo completar la operación. Verifica los datos e inténtalo de nuevo.';
    }
    return typeof err?.message === 'string' ? err.message : 'Error interno del servidor.';
  };
  const ALLOWED_ATTACHMENT_MIMES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp'
  ];
  const ALLOWED_ATTACHMENT_EXTS = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
  function validateAttachment(name: unknown, dataUrl: unknown): string | null {
    if (!name && !dataUrl) return null; // opcional
    if (typeof name !== 'string' || typeof dataUrl !== 'string' || !name.trim() || !dataUrl.trim()) {
      return 'Adjunto inválido.';
    }
    const ext = name.trim().toLowerCase().split('.').pop() || '';
    if (!ALLOWED_ATTACHMENT_EXTS.includes(ext)) return 'Tipo de archivo no permitido.';
    const m = dataUrl.match(/^data:([^;,]+)(;base64)?,/);
    if (!m || !ALLOWED_ATTACHMENT_MIMES.includes(m[1])) return 'Tipo de archivo no permitido.';
    const approxBytes = Math.floor((dataUrl.length * 3) / 4);
    if (approxBytes > 8 * 1024 * 1024) return 'El archivo no debe exceder los 8 MB.';
    return null;
  }

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

  if (isDbConnected) {
    let expiryJobRunning = false;
    const expireStaleTutorings = async () => {
      if (expiryJobRunning) return;
      expiryJobRunning = true;
      try {
        const expiredCount = await pgRepo.expireStaleTutorings();
        if (expiredCount > 0) console.info(`[Tutorías] ${expiredCount} tutoría(s) cerrada(s) por vencimiento.`);
      } catch (error: any) {
        console.error('[Tutorías] No se pudieron revisar vencimientos:', error?.message || error);
      } finally {
        expiryJobRunning = false;
      }
    };
    void expireStaleTutorings();
    const expiryTimer = setInterval(() => void expireStaleTutorings(), 15 * 60 * 1000);
    expiryTimer.unref();
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

  // Revalida cuenta y rol en cada petición autenticada para revocar acceso al desactivar/cambiar rol.
  app.use((req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.user || !isDbConnected) return next();
    pgRepo.getUserById(req.user.userId).then((user) => {
      if (!user || !user.isActive || Number(user.sessionVersion || 0) !== Number(req.user!.sessionVersion || 0)) {
        clearAuthCookie(res);
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'La sesión ya no es válida.' } });
      }
      req.user = {
        ...req.user!, username: user.username, email: user.email, fullName: user.fullName,
        role: user.role, mustChangePassword: user.mustChangePassword === true,
        sessionVersion: Number(user.sessionVersion || 0)
      };
      next();
    }).catch(next);
  });

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
      error: dbInitError ? 'No fue posible establecer conexión con PostgreSQL.' : null,
      timestamp: new Date().toISOString()
    });
  });

  // Los documentos de tutoría nunca se publican estáticamente: cada descarga valida al participante.
  app.get('/uploads/:filename', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const filename = req.params.filename;
      if (!filename || path.basename(filename) !== filename || filename.includes('..')) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_FILE', message: 'Archivo inválido.' } });
      }
      const actor = await pgRepo.getUserById(req.user!.userId);
      if (!actor || !(await pgRepo.canAccessAttachment(filename, actor))) {
        return res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'Archivo no encontrado.' } });
      }
      const filePath = path.join(uploadsDir, filename);
      if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'Archivo no encontrado.' } });
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.sendFile(filePath, { headers: { 'Content-Disposition': `inline; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"` } });
    } catch {
      res.status(500).json({ success: false, error: { code: 'FILE_ERROR', message: 'No se pudo obtener el archivo.' } });
    }
  });

  // --- AUTH ---
  app.post('/api/auth/login', authLimiter, requireDb, async (req: AuthenticatedRequest, res) => {
    try {
      const { username, password, role } = req.body;
      if (typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 80) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Usuario inválido.' } });
      }
      if (typeof password !== 'string' || password.length < 6 || password.length > 100) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Credenciales inválidas.' } });
      }
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
        fullName: user.fullName,
        mustChangePassword: user.mustChangePassword === true,
        sessionVersion: Number(user.sessionVersion || 0)
      });

      await pgRepo.logBinnacle('Inicio de Sesión', `Usuario ${user.fullName} (${user.role}) inició sesión con JWT`, user.username);
      setAuthCookie(res, token);
      // Sesión solo-cookie: el token ya no se expone en el cuerpo JSON
      res.json({
        success: true,
        data: user,
        message: `Bienvenido de vuelta, ${user.fullName}`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'LOGIN_ERROR', message: publicError(err) } });
    }
  });

  app.post('/api/auth/register', authLimiter, requireDb, async (req, res) => {
    try {
      const b = req.body || {};
      if (!isValidEmail(b.email)) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Correo institucional inválido.' } });
      }
      if (typeof b.username !== 'string' || b.username.trim().length < 3 || b.username.trim().length > 40) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Nombre de usuario inválido.' } });
      }
      if (typeof b.fullName !== 'string' || b.fullName.trim().length < 5 || b.fullName.trim().length > 120) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Nombre completo inválido.' } });
      }
      const allowedDomains = (process.env.INSTITUTIONAL_EMAIL_DOMAINS || 'fet.edu.co')
        .split(',').map((domain) => domain.trim().toLowerCase()).filter(Boolean);
      if (!allowedDomains.includes(b.email.trim().toLowerCase().split('@').pop() || '')) {
        return res.status(400).json({ success: false, error: { code: 'INSTITUTIONAL_EMAIL_REQUIRED', message: 'Debes registrarte con un correo institucional autorizado.' } });
      }
      if (typeof b.password !== 'string' || b.password.length < 10 || b.password.length > 100) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'La contraseña debe tener entre 10 y 100 caracteres.' } });
      }
      if (b.confirmPassword !== b.password) {
        return res.status(400).json({ success: false, error: { code: 'PASSWORD_MISMATCH', message: 'Las contraseñas no coinciden.' } });
      }
      const user = await pgRepo.registerStudent(req.body);
      const token = generateAuthToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        sessionVersion: Number(user.sessionVersion || 0)
      });
      setAuthCookie(res, token);
      // Sesión solo-cookie: el token ya no se expone en el cuerpo JSON
      res.json({
        success: true,
        data: user,
        message: 'Estudiante registrado exitosamente con credenciales seguras.'
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'REGISTRATION_ERROR', message: publicError(err) } });
    }
  });

  app.post('/api/auth/register-teacher', authLimiter, requireDb, requireAuth, requireRole(UserRole.ADMIN), async (req, res) => {
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

      const temporaryPassword = `Gt-${crypto.randomBytes(12).toString('hex')}`;
      const user = await pgRepo.registerTeacher({ ...body, password: temporaryPassword, initialAvailability });
      res.json({
        success: true,
        data: {
          ...user,
          temporaryPassword
        },
        message: 'Docente registrado. Comparta la contraseña temporal; el docente deberá cambiarla en su primer ingreso.'
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'REGISTRATION_ERROR', message: publicError(err) } });
    }
  });

  app.post('/api/admin/students', requireDb, requireRole(UserRole.ADMIN), async (req, res) => {
    try {
      const body = req.body || {};
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const allowedDomains = (process.env.INSTITUTIONAL_EMAIL_DOMAINS || 'fet.edu.co')
        .split(',').map((domain) => domain.trim().toLowerCase()).filter(Boolean);
      if (!isValidEmail(email) || !allowedDomains.includes(email.split('@').pop() || '')) {
        return res.status(400).json({ success: false, error: { code: 'INSTITUTIONAL_EMAIL_REQUIRED', message: 'Debes usar un correo institucional autorizado.' } });
      }
      const fullName = cleanStr(body.fullName, 120);
      const account = cleanStr(body.account, 50);
      const semester = Number(body.semester);
      if (fullName.length < 10 || account.length < 6 || !body.careerId || !Number.isInteger(semester) || semester < 1 || semester > 20) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Verifica nombre, carnet, carrera y semestre.' } });
      }
      const temporaryPassword = crypto.randomBytes(12).toString('base64url');
      const user = await pgRepo.registerStudent({
        fullName, email, account, username: email, careerId: cleanStr(body.careerId, 100), semester,
        birthDate: cleanStr(body.birthDate, 20), admissionDate: cleanStr(body.admissionDate, 20),
        password: temporaryPassword
      }, true);
      res.status(201).json({
        success: true,
        data: { ...user, temporaryPassword },
        message: 'Cuenta creada. El estudiante deberá cambiar la contraseña al iniciar sesión.'
      });
    } catch {
      res.status(400).json({ success: false, error: { code: 'STUDENT_REGISTRATION_ERROR', message: 'No se pudo registrar el estudiante. Revisa que el correo y el carnet no estén registrados.' } });
    }
  });

  // Cambio de contraseña del usuario autenticado (accesible aunque deba cambiarla)
  app.post('/api/auth/change-password', requireDb, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Se requiere inicio de sesión.' } });
      }
      const { newPassword, confirmPassword } = req.body || {};
      if (typeof newPassword !== 'string' || newPassword.trim().length < 10 || newPassword.length > 100) {
        return res.status(400).json({ success: false, error: { code: 'PASSWORD_TOO_SHORT', message: 'La nueva contraseña debe tener entre 10 y 100 caracteres.' } });
      }
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, error: { code: 'PASSWORD_MISMATCH', message: 'Las contraseñas no coinciden.' } });
      }

      const user = await pgRepo.updatePassword(req.user.userId, String(newPassword).trim());
      const token = generateAuthToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        mustChangePassword: false,
        sessionVersion: Number(user.sessionVersion || 0)
      });
      setAuthCookie(res, token);
      // Sesión solo-cookie: el token ya no se expone en el cuerpo JSON
      res.json({
        success: true,
        data: user,
        message: 'Contraseña actualizada correctamente.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'CHANGE_PASSWORD_ERROR', message: publicError(err) } });
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
      res.status(500).json({ success: false, error: { code: 'AUTH_ERROR', message: publicError(err) } });
    }
  });

  app.post('/api/auth/logout', async (req: AuthenticatedRequest, res) => {
    if (req.user && isDbConnected) {
      try { await pgRepo.revokeSessions(req.user.userId); } catch (err: any) {
        console.error('[Auth] No se pudieron revocar las sesiones:', err?.message || err);
      }
    }
    clearAuthCookie(res);
    res.json({ success: true, message: 'Sesión cerrada.' });
  });

  // Refresh deslizante: con token aún válido se emite uno nuevo de 2h
  app.post('/api/auth/refresh', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await pgRepo.getUserById(req.user!.userId);
      if (!user || !user.isActive) {
        clearAuthCookie(res);
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Sesión no válida.' } });
      }
      const token = generateAuthToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        mustChangePassword: user.mustChangePassword === true,
        sessionVersion: Number(user.sessionVersion || 0)
      });
      setAuthCookie(res, token);
      res.json({ success: true, data: user, message: 'Sesión renovada.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'REFRESH_ERROR', message: publicError(err) } });
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
      if (!user || !user.isActive) {
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
        message: 'Si el correo o usuario corresponde a una cuenta activa, se enviarán instrucciones de recuperación.',
        // En entorno local de desarrollo exponemos una pista para facilitar pruebas si no hay SMTP activo
        debugToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'FORGOT_PASSWORD_ERROR', message: publicError(err) } });
    }
  });

  // Ejecución de cambio de contraseña (Paso 2: Valida token y actualiza hash)
  app.post('/api/auth/reset-password', authLimiter, requireDb, async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      const ipKey = `ip:${req.ip || 'unknown'}`;
      const attempt = resetAttempts.get(ipKey);
      if (attempt && attempt.until > Date.now()) {
        return res.status(429).json({ success: false, error: { code: 'RESET_LOCKED', message: 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.' } });
      }
      if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token.trim())) {
        return res.status(400).json({ success: false, error: { code: 'TOKEN_REQUIRED', message: 'El código de seguridad es requerido.' } });
      }
      if (typeof newPassword !== 'string' || newPassword.trim().length < 10 || newPassword.length > 100) {
        return res.status(400).json({ success: false, error: { code: 'PASSWORD_TOO_SHORT', message: 'La nueva contraseña debe tener entre 10 y 100 caracteres.' } });
      }

      const result = await pgRepo.resetPasswordWithToken(token.trim(), newPassword.trim());
      if (!result.success) {
        const prev = resetAttempts.get(ipKey) || { count: 0, until: 0 };
        const count = prev.count + 1;
        resetAttempts.set(ipKey, count >= RESET_MAX_FAILS
          ? { count, until: Date.now() + RESET_LOCK_MS }
          : { count, until: 0 });
        return res.status(400).json({ success: false, error: { code: 'RESET_FAILED', message: result.message } });
      }

      resetAttempts.delete(ipKey);
      res.json({ success: true, message: result.message });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'RESET_PASSWORD_ERROR', message: publicError(err) } });
    }
  });

  // --- TUTORINGS ---
  app.get('/api/tutorings', requireDb, requireAuth, async (req, res) => {
    try {
      const actor = await pgRepo.getUserById((req as AuthenticatedRequest).user!.userId);
      if (!actor) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Usuario no encontrado.' } });
      const tutorings = await pgRepo.getTutorings(actor);
      if (actor.role === UserRole.STUDENT) {
        for (const tutoring of tutorings) {
          const isParticipant = tutoring.petitionerStudentId === actor.id || tutoring.assistants?.some((a) => a.studentId === actor.id);
          if (!isParticipant) {
            tutoring.petitionerStudentId = '';
            tutoring.petitionerStudentName = 'Estudiante FET';
            tutoring.assistants = [];
            tutoring.ratings = [];
            tutoring.attachmentName = '';
            tutoring.attachmentUrl = '';
            tutoring.studentComment = '';
            tutoring.teacherComment = '';
          }
        }
      }
      res.json({ success: true, data: tutorings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'GET_TUTORINGS_ERROR', message: publicError(err) } });
    }
  });

  app.post('/api/tutorings', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      let dto = req.body;
      const subject = cleanStr(dto?.subject, 70);
      const details = cleanStr(dto?.details, 2000);
      if (!['INDIVIDUAL', 'GROUP'].includes(dto?.type)) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Debe elegir tutoría individual o grupal.' } });
      }
      if (subject.length < 3) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Tema o asunto inválido.' } });
      }
      if (details.length < 5) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Descripción inválida.' } });
      }
      const attachErr = validateAttachment(dto?.attachmentName, dto?.attachmentUrl);
      if (attachErr) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: attachErr } });
      }
      // Persistir adjunto en disco y guardar solo la ruta (compat: data-URLs antiguas siguen visibles)
      if (typeof dto?.attachmentUrl === 'string' && dto.attachmentUrl.startsWith('data:')) {
        try {
          dto = { ...dto, attachmentUrl: saveAttachmentToDisk(String(dto.attachmentName), dto.attachmentUrl) };
        } catch (e: any) {
          return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: e?.message || 'Adjunto inválido.' } });
        }
      }
      const user = await pgRepo.getUserById(req.user!.userId);
      if (!user || user.role !== UserRole.STUDENT) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Usuario estudiante requerido.' } });
      }
      const tutoring = await pgRepo.createTutoring(dto, user);
      res.json({ success: true, data: tutoring, message: 'Solicitud de tutoría creada con éxito.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'CREATE_TUTORING_ERROR', message: publicError(err) } });
    }
  });

  app.patch('/api/tutorings/:id/approve', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { space, block, maxParticipants } = req.body;
      const cleanSpace = cleanStr(space, 200);
      const cleanBlock = cleanStr(block, 50);
      if (!cleanSpace) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Salón o enlace requerido.' } });
      }
      const approver = await pgRepo.getUserById(req.user!.userId);
      if (!approver || (approver.role !== UserRole.ADMIN && approver.role !== UserRole.TEACHER)) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Permiso de administrador o docente requerido.' } });
      }
      const tutoring = await pgRepo.approveTutoring(req.params.id, cleanSpace, approver, cleanBlock, Number(maxParticipants));
      res.json({ success: true, data: tutoring, message: 'Tutoría aprobada y programada correctamente.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'APPROVE_ERROR', message: publicError(err) } });
    }
  });

  app.patch('/api/tutorings/:id/cancel', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { reason } = req.body;
      if (typeof reason !== 'string' || reason.trim().length < 4) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Debe indicar un motivo de cancelación detallado.' } });
      }
      const user = await pgRepo.getUserById(req.user!.userId);
      if (!user) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Usuario no identificado.' } });
      }
      const tutoring = await pgRepo.cancelTutoring(req.params.id, reason, user);
      res.json({ success: true, data: tutoring, message: 'Tutoría cancelada correctamente.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'CANCEL_ERROR', message: publicError(err) } });
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
      res.status(400).json({ success: false, error: { code: 'START_ERROR', message: publicError(err) } });
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
      res.status(400).json({ success: false, error: { code: 'FINISH_ERROR', message: publicError(err) } });
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
      res.status(400).json({ success: false, error: { code: 'JOIN_ERROR', message: publicError(err) } });
    }
  });

  app.delete('/api/tutorings/:id/participants/me', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const student = await pgRepo.getUserById(req.user!.userId);
      if (!student || student.role !== UserRole.STUDENT) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Solo el estudiante inscrito puede retirarse.' } });
      }
      const tutoring = await pgRepo.withdrawFromTutoring(req.params.id, student);
      res.json({ success: true, data: tutoring, message: 'Te retiraste de la tutoría grupal.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'WITHDRAW_ERROR', message: publicError(err) } });
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
      res.status(400).json({ success: false, error: { code: 'ASSISTANCE_ERROR', message: publicError(err) } });
    }
  });

  app.post('/api/tutorings/:id/rate', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { score, studentComment } = req.body;
      if (!Number.isInteger(score) || score < 1 || score > 5) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'La calificación debe estar entre 1 y 5 estrellas.' } });
      }
      if (typeof studentComment !== 'string' || studentComment.trim().length < 5) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Agregue un comentario sobre su experiencia.' } });
      }
      const student = await pgRepo.getUserById(req.user!.userId);
      if (!student) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Estudiante solicitante requerido.' } });
      }
      const tutoring = await pgRepo.rateTutoring({ tutoringId: req.params.id, score, studentComment }, student);
      res.json({ success: true, data: tutoring, message: 'Gracias por calificar la tutoría.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'RATE_ERROR', message: publicError(err) } });
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
      res.status(400).json({ success: false, error: { code: 'CREATE_SUBJECT_ERROR', message: publicError(err) } });
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
      res.status(400).json({ success: false, error: { code: 'TOGGLE_SUBJECT_ERROR', message: publicError(err) } });
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
      res.status(400).json({ success: false, error: { code: 'DELETE_SUBJECT_ERROR', message: publicError(err) } });
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
      res.status(400).json({ success: false, error: { code: 'CREATE_CAREER_ERROR', message: publicError(err) } });
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
      res.status(400).json({ success: false, error: { code: 'UPDATE_CAREER_ERROR', message: publicError(err) } });
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
      res.status(400).json({ success: false, error: { code: 'TOGGLE_CAREER_ERROR', message: publicError(err) } });
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
      res.status(400).json({ success: false, error: { code: 'DELETE_CAREER_ERROR', message: publicError(err) } });
    }
  });

  app.get('/api/schedules', requireDb, asyncHandler(async (req, res) => {
    res.json({ success: true, data: await pgRepo.getScheduleSlots() });
  }));

  app.get('/api/sections', requireDb, asyncHandler(async (req, res) => {
    res.json({ success: true, data: await pgRepo.getSections() });
  }));

  app.get('/api/availability', requireDb, requireAuth, asyncHandler(async (req, res) => {
    res.json({ success: true, data: await pgRepo.getTeacherAvailability() });
  }));

  app.patch('/api/availability/:id/toggle', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const actor = await pgRepo.getUserById(req.user!.userId);
      if (!actor) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Usuario requerido.' } });
      const item = await pgRepo.toggleTeacherAvailability(req.params.id, actor);
      res.json({ success: true, data: item, message: `Disponibilidad ${item.isAvailable ? 'activada' : 'desactivada'}.` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'AVAILABILITY_ERROR', message: publicError(err) } });
    }
  });

  app.post('/api/availability', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { subjectCourseId, scheduleSlotId } = req.body;
      const teacher = await pgRepo.getUserById(req.user!.userId);
      if (!teacher || teacher.role !== UserRole.TEACHER) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Docente requerido.' } });
      }
      const item = await pgRepo.addTeacherAvailability(teacher, subjectCourseId, scheduleSlotId);
      res.json({ success: true, data: item, message: 'Disponibilidad agregada exitosamente.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'AVAILABILITY_ERROR', message: publicError(err) } });
    }
  });

  app.delete('/api/availability/:id', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const teacher = await pgRepo.getUserById(req.user!.userId);
      if (!teacher || (teacher.role !== UserRole.TEACHER && teacher.role !== UserRole.ADMIN)) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Usuario requerido.' } });
      }
      await pgRepo.deleteTeacherAvailability(req.params.id, teacher);
      res.json({ success: true, data: true, message: 'Franja eliminada.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'AVAILABILITY_ERROR', message: publicError(err) } });
    }
  });

  app.post('/api/availability/batch', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { subjectCourseId, scheduleSlotIds } = req.body;
      const teacher = await pgRepo.getUserById(req.user!.userId);
      if (!teacher || teacher.role !== UserRole.TEACHER) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Docente requerido.' } });
      }
      const items = await pgRepo.setTeacherAvailabilityBatch(teacher, subjectCourseId, scheduleSlotIds);
      res.json({ success: true, data: items, message: 'Disponibilidad configurada exitosamente.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'AVAILABILITY_ERROR', message: publicError(err) } });
    }
  });

  // --- TEACHER SUBJECTS (catálogo por docente) ---
  app.get('/api/teachers/:id/subjects', requireDb, requireAuth, async (req, res) => {
    try {
      const subjects = await pgRepo.getTeacherSubjects(req.params.id);
      res.json({ success: true, data: subjects });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'TEACHER_SUBJECTS_ERROR', message: publicError(err) } });
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
      if (!isAdmin && !(isSelf && actor.role === UserRole.TEACHER)) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Permiso insuficiente.' } });
      }
      if (!Array.isArray(subjectIds)) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'subjectIds requerido.' } });
      }
      const subjects = await pgRepo.setTeacherSubjects(req.params.id, subjectIds, actor);
      res.json({ success: true, data: subjects, message: 'Asignaturas del docente actualizadas correctamente.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'TEACHER_SUBJECTS_ERROR', message: publicError(err) } });
    }
  });

  app.put('/api/teachers/:id', requireDb, requireRole(UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
    try {
      const { adminId, fullName, email, careerId, subjectIds } = req.body;
      const admin = await pgRepo.getUserById(req.user!.userId);
      if (!admin || admin.role !== UserRole.ADMIN) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin requerido.' } });
      }
      const user = await pgRepo.updateTeacherProfile(req.params.id, { fullName, email, careerId }, admin);
      if (Array.isArray(subjectIds)) {
        await pgRepo.setTeacherSubjects(req.params.id, subjectIds, admin);
      }
      res.json({ success: true, data: user, message: 'Docente actualizado correctamente.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'UPDATE_TEACHER_ERROR', message: publicError(err) } });
    }
  });

  // --- USERS ---
  app.get('/api/users', requireDb, requireAuth, asyncHandler(async (req, res) => {
    const actor = await pgRepo.getUserById((req as AuthenticatedRequest).user!.userId);
    if (!actor) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Usuario no encontrado.' } });
    res.json({ success: true, data: await pgRepo.getUsersForActor(actor) });
  }));

  app.put('/api/users/:id/profile', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { photoUrl, alias } = req.body;
      if (photoUrl !== undefined && photoUrl !== null && photoUrl !== '') {
        if (typeof photoUrl !== 'string' || photoUrl.length > 1_500_000 || !/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(photoUrl)) {
          return res.status(400).json({ success: false, error: { code: 'INVALID_PHOTO', message: 'La foto debe ser JPG, PNG o WebP y no superar 1 MB.' } });
        }
      }
      if (alias !== undefined && (typeof alias !== 'string' || alias.length > 100)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_PROFILE', message: 'El nombre de perfil no es válido.' } });
      }
      const actor = await pgRepo.getUserById(req.user!.userId);
      if (!actor) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Usuario no autenticado.' } });
      }
      const updatedUser = await pgRepo.updateUserProfile(req.params.id, { photoUrl, alias }, actor);
      res.json({ success: true, data: updatedUser, message: 'Perfil y foto actualizados exitosamente.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'UPDATE_PROFILE_ERROR', message: publicError(err) } });
    }
  });

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
      res.status(400).json({ success: false, error: { code: 'TOGGLE_USER_ERROR', message: publicError(err) } });
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
      res.status(400).json({ success: false, error: { code: 'DELETE_USER_ERROR', message: publicError(err) } });
    }
  });

  // --- NOTIFICATIONS ---
  app.get('/api/notifications/:userId', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user!.userId !== req.params.userId && req.user!.role !== UserRole.ADMIN) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No puedes leer notificaciones de otro usuario.' } });
      }
      const list = await pgRepo.getNotifications(req.params.userId);
      res.json({ success: true, data: list });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'NOTIFICATIONS_ERROR', message: publicError(err) } });
    }
  });

  app.patch('/api/notifications/:id/read', requireDb, requireAuth, async (req, res) => {
    try {
      const actor = await pgRepo.getUserById((req as AuthenticatedRequest).user!.userId);
      if (!actor) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Usuario requerido.' } });
      await pgRepo.markNotificationRead(req.params.id, actor.id, actor.role === UserRole.ADMIN);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'NOTIFICATIONS_ERROR', message: publicError(err) } });
    }
  });

  app.post('/api/notifications/read-all/:userId', requireDb, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user!.userId !== req.params.userId && req.user!.role !== UserRole.ADMIN) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No puedes modificar notificaciones de otro usuario.' } });
      }
      await pgRepo.markAllNotificationsRead(req.params.userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'NOTIFICATIONS_ERROR', message: publicError(err) } });
    }
  });

  // --- BINNACLE ---
  app.get('/api/binnacle', requireDb, requireRole(UserRole.ADMIN), asyncHandler(async (req, res) => {
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
      res.status(400).json({ success: false, error: { code: 'INSTITUTION_ERROR', message: publicError(err) } });
    }
  });

  // --- ANALYTICS ---
  app.get('/api/analytics', requireDb, requireRole(UserRole.ADMIN), async (req, res) => {
    try {
      const data = await pgRepo.getAnalytics();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'ANALYTICS_ERROR', message: publicError(err) } });
    }
  });

  // --- TESTS (protegido en producción: solo ADMIN) ---
  const testsGuard = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (process.env.NODE_ENV === 'production') {
      return (requireRole(UserRole.ADMIN) as any)(req, res, next);
    }
    return next();
  };
  app.get('/api/tests', testsGuard, asyncHandler(async (req, res) => {
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
    const results = [...inMemory.results, ...runAuthzTests().results, ...postgres.results];
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
      error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' }
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
