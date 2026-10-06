import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../../types';

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET no está definido. Configúralo en tu archivo .env antes de iniciar el servidor.');
}
// Sesión corta (2h) + refresh deslizante vía /api/auth/refresh
const JWT_EXPIRATION = '2h';
export const AUTH_COOKIE_MAX_AGE = 2 * 3600;

export interface AuthTokenPayload {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
  mustChangePassword?: boolean;
  sessionVersion?: number;
}

// Extender interfaz Request de Express
export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
  actor?: User;
}

declare global {
  namespace Express {
    interface Request {
      actor?: User;
    }
  }
}

/**
 * Genera un hash seguro para la contraseña del usuario mediante bcrypt.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  if (!plainPassword || plainPassword.trim().length === 0) {
    return '';
  }
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compara una contraseña en texto plano contra su hash bcrypt almacenado.
 * Solo se aceptan hashes bcrypt válidos; no existe fallback a contraseñas
 * por defecto ni a valores en texto plano.
 */
export async function comparePassword(plainPassword: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !storedHash.startsWith('$2')) {
    return false;
  }

  return bcrypt.compare(plainPassword, storedHash);
}

/**
 * Genera un token JWT firmado para el usuario autenticado.
 */
export function generateAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

/**
 * Middleware para verificar la validez del token JWT en encabezados Authorization.
 * Si no hay token pero viene petitionerId / approverId en body (modo transición suave),
 * permite procesarlo y advertir, asegurando retrocompatibilidad total sin romper llamadas existentes.
 */
function getTokenFromCookies(req: Request): string | null {
  const raw = (req.headers as any)?.cookie;
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw.split(';');
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx < 0) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    if (k === 'gt_token' && v) {
      try {
        return decodeURIComponent(v);
      } catch {
        return v;
      }
    }
  }
  return null;
}

const PUBLIC_AUTH_ENTRY_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/logout'
]);

export function isPublicAuthEntryRequest(req: Request): boolean {
  return req.method === 'POST' && PUBLIC_AUTH_ENTRY_PATHS.has(req.path);
}

export function verifyTokenMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const cookieToken = getTokenFromCookies(req);
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : cookieToken;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
      req.user = decoded;
      return next();
    } catch (err: any) {
      // A stale cookie must not prevent a fresh login, registration, logout, or password reset.
      if (isPublicAuthEntryRequest(req)) {
        const secure = process.env.NODE_ENV === 'production';
        res.appendHeader(
          'Set-Cookie',
          `gt_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure ? '; Secure' : ''}`
        );
        return next();
      }
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'Sesión expirada o token inválido. Por favor inicia sesión nuevamente.' }
      });
    }
  }

  // Si no viene token (header ni cookie), continúa pero req.user queda indefinido
  next();
}

/**
 * Middleware que requiere obligatoriamente que el usuario esté autenticado.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Se requiere inicio de sesión para acceder a este recurso.' }
    });
  }
  if (req.user.mustChangePassword) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Debe cambiar su contraseña temporal antes de continuar.'
      }
    });
  }
  next();
}

/**
 * Middleware para exigir roles específicos.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Se requiere inicio de sesión para acceder a este recurso.' }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No tienes los permisos requeridos para ejecutar esta acción.' }
      });
    }
    if (req.user.mustChangePassword) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PASSWORD_CHANGE_REQUIRED',
          message: 'Debe cambiar su contraseña temporal antes de continuar.'
        }
      });
    }
    next();
  };
}
