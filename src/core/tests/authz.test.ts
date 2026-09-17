/**
 * Pruebas de autorización: el alta de docentes es exclusiva del administrador
 * (endpoint protegido) y no puede iniciarse desde el formulario público.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../infrastructure/security/auth-security';
import { UserRole } from '../types';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
}

function makeRes() {
  const res: any = { statusCode: 200, body: undefined };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload: any) => {
    res.body = payload;
    return res;
  };
  return res as Response & { statusCode: number; body: any };
}

function callMiddleware(
  handler: (req: any, res: any, next: NextFunction) => void,
  req: any
): { nextCalled: boolean; res: ReturnType<typeof makeRes> } {
  const res = makeRes();
  let nextCalled = false;
  handler(req, res, (() => {
    nextCalled = true;
  }) as NextFunction);
  return { nextCalled, res };
}

export function runAuthzTests(): { total: number; passed: number; results: TestResult[] } {
  const results: TestResult[] = [];

  const test = (name: string, fn: () => void) => {
    try {
      fn();
      results.push({ name, success: true, message: 'PASS' });
    } catch (err: any) {
      results.push({ name, success: false, message: err?.message || String(err) });
    }
  };

  test('requireAuth: sin usuario responde 401', () => {
    const { nextCalled, res } = callMiddleware(requireAuth, {});
    if (nextCalled) throw new Error('No debe llamar a next() sin autenticación');
    if (res.statusCode !== 401) throw new Error(`Esperaba 401, recibió ${res.statusCode}`);
  });

  test('requireAuth: con usuario autenticado llama a next()', () => {
    const { nextCalled } = callMiddleware(requireAuth, { user: { role: UserRole.STUDENT } });
    if (!nextCalled) throw new Error('Debe llamar a next() con usuario autenticado');
  });

  test('requireRole(ADMIN): estudiante autenticado recibe 403', () => {
    const { nextCalled, res } = callMiddleware(requireRole(UserRole.ADMIN), {
      user: { role: UserRole.STUDENT }
    });
    if (nextCalled) throw new Error('Un estudiante no debe pasar requireRole(ADMIN)');
    if (res.statusCode !== 403) throw new Error(`Esperaba 403, recibió ${res.statusCode}`);
    if (res.body?.error?.code !== 'FORBIDDEN') throw new Error('Esperaba código FORBIDDEN');
  });

  test('requireRole(ADMIN): administrador llama a next()', () => {
    const { nextCalled } = callMiddleware(requireRole(UserRole.ADMIN), {
      user: { role: UserRole.ADMIN }
    });
    if (!nextCalled) throw new Error('El administrador debe pasar requireRole(ADMIN)');
  });

  test('server.ts: /api/auth/register-teacher exige requireAuth y requireRole(ADMIN)', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
    const routeLine = source
      .split('\n')
      .find((line) => line.includes("'/api/auth/register-teacher'"));
    if (!routeLine) throw new Error('No se encontró la ruta /api/auth/register-teacher');
    if (!routeLine.includes('requireAuth')) throw new Error('La ruta no exige requireAuth');
    if (!routeLine.includes('requireRole(UserRole.ADMIN)')) {
      throw new Error('La ruta no exige requireRole(UserRole.ADMIN)');
    }
  });

  test('AuthView.tsx: el formulario público ya no permite registrar docentes', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/AuthView.tsx'),
      'utf8'
    );
    if (source.includes('registerTeacher')) throw new Error('AuthView aún llama a registerTeacher');
    if (source.includes('registerRole')) {
      throw new Error('AuthView aún expone la selección del rol docente');
    }
  });

  return { total: results.length, passed: results.filter((r) => r.success).length, results };
}
