import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../types';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET no está definido. Configúralo en tu archivo .env antes de iniciar el servidor.');
}
const JWT_EXPIRATION = '12h';

export interface AuthTokenPayload {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
  mustChangePassword?: boolean;
}

// Extender interfaz Request de Express
export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
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
export function verifyTokenMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
      req.user = decoded;
      return next();
    } catch (err: any) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'Sesión expirada o token inválido. Por favor inicia sesión nuevamente.' }
      });
    }
  }

  // Si no viene Authorization header, continúa pero req.user queda indefinido
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
