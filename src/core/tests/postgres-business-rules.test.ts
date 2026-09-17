/**
 * Pruebas de integración de las reglas de negocio contra el camino REAL (PostgreSQL).
 * Complementa business-rules.test.ts, que solo cubre los use-cases en memoria.
 * Cada prueba limpia los registros que crea (try/finally).
 */

import { Pool } from 'pg';
import { getPgPool } from '../infrastructure/database/pg-pool';
import { pgRepo } from '../infrastructure/database/pg-repository';
import { TutoringModality, TutoringStatus, User, UserRole } from '../types';

export interface PostgresBusinessRuleTest {
  name: string;
  success: boolean;
  message: string;
}

const RUN_ID = `${Date.now()}`;

function dateInDays(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

async function cleanupTestData(p: Pool): Promise<void> {
  await p.query(`DELETE FROM notifications WHERE tutoring_id IN (SELECT id FROM tutorings WHERE subject LIKE 'PGTEST %');`);
  await p.query(`DELETE FROM tutoring_assistants WHERE tutoring_id IN (SELECT id FROM tutorings WHERE subject LIKE 'PGTEST %');`);
  await p.query(`DELETE FROM tutorings WHERE subject LIKE 'PGTEST %';`);
  await p.query(`DELETE FROM binnacle WHERE description LIKE '%PGTEST%';`);
  await p.query(`DELETE FROM users WHERE username LIKE 'pgtest_teacher_%';`);
}

async function findFreeTeacherSlot(p: Pool, dateStr: string): Promise<{ teacherId: string; slotId: string; subjectCourseId: string }> {
  const res = await p.query(
    `SELECT t.id AS teacher_id, s.id AS slot_id, sub.id AS subject_course_id
     FROM users t
     CROSS JOIN schedule_slots s
     CROSS JOIN subjects sub
     WHERE t.role = 'TEACHER' AND t.is_active = TRUE AND s.is_available = TRUE AND sub.is_active = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM tutorings tut
         WHERE tut.teacher_id = t.id AND tut.schedule_slot_id = s.id
           AND tut.reserv_date = $1 AND tut.status != $2
       )
       AND (
         EXISTS (
           SELECT 1 FROM teacher_availability a
           WHERE a.teacher_id = t.id AND a.schedule_slot_id = s.id
             AND a.subject_course_id = sub.id AND a.is_available = TRUE
         )
          OR NOT EXISTS (SELECT 1 FROM teacher_availability a2 WHERE a2.teacher_id = t.id)
        )
      ORDER BY t.id, s.id, sub.id
      LIMIT 1;`,
    [dateStr, TutoringStatus.CANCELLED]
  );
  if (res.rows.length === 0) throw new Error('No hay combinación docente/franja/asignatura libre para la fecha de prueba.');
  return { teacherId: res.rows[0].teacher_id, slotId: res.rows[0].slot_id, subjectCourseId: res.rows[0].subject_course_id };
}

async function insertTempTeacher(p: Pool): Promise<User> {
  const suffix = `${RUN_ID}-${Math.random().toString(36).slice(2, 6)}`;
  const teacherId = `pgteacher-${suffix}`;
  const username = `pgtest_teacher_${suffix}`;
  await p.query(
    `INSERT INTO users (id, username, password_hash, full_name, alias, email, phone, role, account, campus_id, campus_name, career_id, career_name, birth_date, admission_date, semester, photo_url, observations, is_active, created_at)
     VALUES ($1, $2, '', $3, '', $4, '', 'TEACHER', '', '', '', '', '', '', '', 0, '', '', TRUE, '');`,
    [teacherId, username, `Docente de Prueba ${RUN_ID}`, `${username}@mail.test`]
  );
  const teacher = await pgRepo.getUserById(teacherId);
  if (!teacher) throw new Error('No se pudo cargar el docente temporal.');
  return teacher;
}

async function assertThrowsMessage(regex: RegExp, fn: () => Promise<unknown>): Promise<void> {
  let threw = false;
  let msg = '';
  try {
    await fn();
  } catch (err: any) {
    threw = true;
    msg = err?.message || '';
  }
  if (!threw) {
    throw new Error(`Se esperaba un error que coincidiera con ${regex}, pero no se lanzó ninguno.`);
  }
  if (!regex.test(msg)) {
    throw new Error(`El error no coincide con ${regex}; se obtuvo: ${msg}`);
  }
}

async function cleanupBySubject(p: Pool, subject: string): Promise<void> {
  await p.query(`DELETE FROM notifications WHERE tutoring_id IN (SELECT id FROM tutorings WHERE subject = $1);`, [subject]);
  await p.query(`DELETE FROM tutoring_assistants WHERE tutoring_id IN (SELECT id FROM tutorings WHERE subject = $1);`, [subject]);
  await p.query(`DELETE FROM tutorings WHERE subject = $1;`, [subject]);
}

export async function runPostgresBusinessRulesTests(): Promise<{ total: number; passed: number; results: PostgresBusinessRuleTest[] }> {
  const results: PostgresBusinessRuleTest[] = [];
  const p = await getPgPool();

  async function run(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
      results.push({ name, success: true, message: 'PASS' });
    } catch (err: any) {
      results.push({ name, success: false, message: err?.message || String(err) });
    }
  }

  try {
    const users = await pgRepo.getUsers();
    const admin = users.find((u) => u.role === UserRole.ADMIN)!;
    const students = users.filter((u) => u.role === UserRole.STUDENT);
    const student1 = students[0];
    const student2 = students[1] || student1;
    const subject = (await pgRepo.getSubjects()).find((s) => s.isActive)!;
    const today = dateInDays(0);
    const dateD = dateInDays(5);

    if (!admin || !student1 || !subject) throw new Error('Faltan usuarios de referencia para los tests.');

    // --- 1. Regla +2 días (camino Postgres) ---
    await run('PG: Regla +2 Días — createTutoring rechaza fecha de hoy', async () => {
      const free = await findFreeTeacherSlot(p, today);
      await assertThrowsMessage(/2 días/, async () => {
        await pgRepo.createTutoring(
          {
            subject: `PGTEST ${RUN_ID} hoy`,
            details: 'prueba regla +2 días',
            reservDate: today,
            scheduleSlotId: free.slotId,
            subjectCourseId: free.subjectCourseId,
            teacherId: free.teacherId,
            modality: TutoringModality.VIRTUAL
          },
          student1
        );
      });
    });

    // --- 2. Conflicto de docente (camino Postgres) ---
    await run('PG: Conflicto Docente — misma fecha y franja rechazada', async () => {
      const free = await findFreeTeacherSlot(p, dateD);
      const subjA = `PGTEST ${RUN_ID} conflictA`;
      const subjB = `PGTEST ${RUN_ID} conflictB`;
      try {
        await pgRepo.createTutoring(
          { subject: subjA, details: 'primera', reservDate: dateD, scheduleSlotId: free.slotId, subjectCourseId: free.subjectCourseId, teacherId: free.teacherId, modality: TutoringModality.PRESENCIAL },
          student1
        );
        await assertThrowsMessage(/ya tiene una tutoría/, async () => {
          await pgRepo.createTutoring(
            { subject: subjB, details: 'segunda', reservDate: dateD, scheduleSlotId: free.slotId, subjectCourseId: free.subjectCourseId, teacherId: free.teacherId, modality: TutoringModality.PRESENCIAL },
            student1
          );
        });
      } finally {
        await cleanupBySubject(p, subjA);
        await cleanupBySubject(p, subjB);
      }
    });

    // --- 3. Conflicto de aula al aprobar (camino Postgres) ---
    await run('PG: Conflicto de Aula — misma aula, fecha y franja rechazada al aprobar', async () => {
      const free = await findFreeTeacherSlot(p, dateD);
      const tempTeacher = await insertTempTeacher(p);
      const subjA = `PGTEST ${RUN_ID} aulaA`;
      const subjB = `PGTEST ${RUN_ID} aulaB`;
      try {
        const t1 = await pgRepo.createTutoring(
          { subject: subjA, details: 'presencial 1', reservDate: dateD, scheduleSlotId: free.slotId, subjectCourseId: free.subjectCourseId, teacherId: free.teacherId, modality: TutoringModality.PRESENCIAL },
          student1
        );
        const t2 = await pgRepo.createTutoring(
          { subject: subjB, details: 'presencial 2', reservDate: dateD, scheduleSlotId: free.slotId, subjectCourseId: free.subjectCourseId, teacherId: tempTeacher.id, modality: TutoringModality.PRESENCIAL },
          student1
        );
        await pgRepo.approveTutoring(t1.id, 'Aula PGTEST', admin);
        await assertThrowsMessage(/Conflicto de Aula/, async () => {
          await pgRepo.approveTutoring(t2.id, 'Aula PGTEST', admin);
        });
      } finally {
        await cleanupBySubject(p, subjA);
        await cleanupBySubject(p, subjB);
      }
    });

    // --- 4. Permisos de cancelación (camino Postgres) ---
    await run('PG: Cancelación — solo solicitante/admin/docente titular', async () => {
      const free = await findFreeTeacherSlot(p, dateD);
      const subj = `PGTEST ${RUN_ID} cancel`;
      try {
        const created = await pgRepo.createTutoring(
          { subject: subj, details: 'a cancelar', reservDate: dateD, scheduleSlotId: free.slotId, subjectCourseId: free.subjectCourseId, teacherId: free.teacherId, modality: TutoringModality.VIRTUAL },
          student1
        );
        if (student2 && student2.id !== student1.id) {
          await assertThrowsMessage(/permisos/, async () => {
            await pgRepo.cancelTutoring(created.id, 'intento ajeno', student2);
          });
        }
        const cancelled = await pgRepo.cancelTutoring(created.id, 'decisión propia', student1);
        if (cancelled.status !== TutoringStatus.CANCELLED) throw new Error(`Se esperaba CANCELLED, se obtuvo ${cancelled.status}`);
      } finally {
        await cleanupBySubject(p, subj);
      }
    });

    // --- 5. Máquina de estados: no iniciar tutoría sin aprobar ---
    await run('PG: Estado — no se inicia una tutoría PENDING', async () => {
      const free = await findFreeTeacherSlot(p, dateD);
      const subj = `PGTEST ${RUN_ID} state`;
      try {
        const created = await pgRepo.createTutoring(
          { subject: subj, details: 'para iniciar', reservDate: dateD, scheduleSlotId: free.slotId, subjectCourseId: free.subjectCourseId, teacherId: free.teacherId, modality: TutoringModality.VIRTUAL },
          student1
        );
        const teacher = (await pgRepo.getUserById(free.teacherId))!;
        await assertThrowsMessage(/programadas/, async () => {
          await pgRepo.startTutoring(created.id, teacher);
        });
      } finally {
        await cleanupBySubject(p, subj);
      }
    });

    // --- 6. Solo el docente titular inicia/finaliza ---
    await run('PG: Estado — solo el docente titular puede iniciar', async () => {
      const free = await findFreeTeacherSlot(p, dateD);
      const tempTeacher = await insertTempTeacher(p);
      const subj = `PGTEST ${RUN_ID} owner`;
      try {
        const created = await pgRepo.createTutoring(
          { subject: subj, details: 'titularidad', reservDate: dateD, scheduleSlotId: free.slotId, subjectCourseId: free.subjectCourseId, teacherId: free.teacherId, modality: TutoringModality.VIRTUAL },
          student1
        );
        await assertThrowsMessage(/docente titular/, async () => {
          await pgRepo.startTutoring(created.id, tempTeacher);
        });
      } finally {
        await cleanupBySubject(p, subj);
        await p.query('DELETE FROM users WHERE id = $1;', [tempTeacher.id]);
      }
    });

    // --- 7. Flujo completo en el camino real ---
    await run('PG: Flujo completo PENDING → APPROVED → IN_PROGRESS → COMPLETED + calificación', async () => {
      const free = await findFreeTeacherSlot(p, dateD);
      const teacher = (await pgRepo.getUserById(free.teacherId))!;
      const subj = `PGTEST ${RUN_ID} flujo`;
      try {
        const created = await pgRepo.createTutoring(
          { subject: subj, details: 'flujo completo', reservDate: dateD, scheduleSlotId: free.slotId, subjectCourseId: free.subjectCourseId, teacherId: free.teacherId, modality: TutoringModality.VIRTUAL },
          student1
        );
        if (created.status !== TutoringStatus.PENDING) throw new Error(`Se esperaba PENDING, se obtuvo ${created.status}`);

        const approved = await pgRepo.approveTutoring(created.id, 'Enlace PGTEST', admin);
        if (approved.status !== TutoringStatus.APPROVED) throw new Error('Se esperaba APPROVED tras la aprobación');

        const started = await pgRepo.startTutoring(approved.id, teacher);
        if (started.status !== TutoringStatus.IN_PROGRESS) throw new Error('Se esperaba IN_PROGRESS tras el inicio');

        if (student2 && student2.id !== student1.id) {
          await pgRepo.joinTutoring(started.id, student2);
        }

        const completed = await pgRepo.finishTutoring(started.id, teacher, 'comentario del docente');
        if (completed.status !== TutoringStatus.COMPLETED) throw new Error('Se esperaba COMPLETED tras finalizar');

        const rated = await pgRepo.rateTutoring({ tutoringId: completed.id, score: 5, studentComment: 'excelente' }, student1);
        if (rated.score !== 5) throw new Error(`Se esperaba score 5, se obtuvo ${rated.score}`);

        await assertThrowsMessage(/calificada/, async () => {
          await pgRepo.rateTutoring({ tutoringId: completed.id, score: 3, studentComment: 'segunda vez' }, student1);
        });
      } finally {
        await cleanupBySubject(p, subj);
      }
    });

    // --- 8. Disponibilidad del docente (condicional) ---
    await run('PG: Disponibilidad — solo se agenda dentro de la disponibilidad activa del docente', async () => {
      const teacher = await insertTempTeacher(p);
      const slotRes = await p.query(`SELECT id FROM schedule_slots WHERE is_available = TRUE ORDER BY id LIMIT 1;`);
      const subjRes = await p.query(`SELECT id FROM subjects WHERE is_active = TRUE ORDER BY id LIMIT 2;`);
      const slotId: string = slotRes.rows[0]?.id;
      const subjA: string = subjRes.rows[0]?.id;
      const subjB: string = subjRes.rows[1]?.id;
      if (!slotId || !subjA || !subjB) throw new Error('Faltan franja o asignaturas activas para el test de disponibilidad.');

      const activeId = `pguav-${RUN_ID}-a`;
      const disabledId = `pguav-${RUN_ID}-b`;
      const subjOk = `PGTEST ${RUN_ID} avail-ok`;
      const subjNo = `PGTEST ${RUN_ID} avail-no`;
      try {
        await p.query(
          `INSERT INTO teacher_availability (id, teacher_id, teacher_name, schedule_slot_id, schedule_label, subject_course_id, subject_course_name, is_available)
           VALUES ($1, $2, $3, $4, 'TEST', $5, 'TEST', TRUE), ($6, $7, $8, $9, 'TEST', $10, 'TEST', FALSE);`,
          [activeId, teacher.id, teacher.fullName, slotId, subjA, disabledId, teacher.id, teacher.fullName, slotId, subjB]
        );

        const created = await pgRepo.createTutoring(
          { subject: subjOk, details: 'disponibilidad ok', reservDate: dateD, scheduleSlotId: slotId, subjectCourseId: subjA, teacherId: teacher.id, modality: TutoringModality.VIRTUAL },
          student1
        );
        if (created.status !== TutoringStatus.PENDING) throw new Error('La creación dentro de la disponibilidad debería tener éxito.');

        await assertThrowsMessage(/disponibilidad/, async () => {
          await pgRepo.createTutoring(
            { subject: subjNo, details: 'asignatura sin disponibilidad', reservDate: dateInDays(7), scheduleSlotId: slotId, subjectCourseId: subjB, teacherId: teacher.id, modality: TutoringModality.VIRTUAL },
            student1
          );
        });

        await p.query(`UPDATE teacher_availability SET is_available = FALSE WHERE id = $1;`, [activeId]);
        await assertThrowsMessage(/disponibilidad/, async () => {
          await pgRepo.createTutoring(
            { subject: subjNo, details: 'disponibilidad desactivada', reservDate: dateInDays(8), scheduleSlotId: slotId, subjectCourseId: subjA, teacherId: teacher.id, modality: TutoringModality.VIRTUAL },
            student1
          );
        });
      } finally {
        await cleanupBySubject(p, subjOk);
        await cleanupBySubject(p, subjNo);
        await p.query('DELETE FROM teacher_availability WHERE id = $1 OR id = $2;', [activeId, disabledId]);
        await p.query('DELETE FROM users WHERE id = $1;', [teacher.id]);
      }
    });

    // --- 9. Cupo máximo de la sección (camino Postgres) ---
    await run('PG: Cupo — no se supera la capacidad del aula al unirse', async () => {
      const free = await findFreeTeacherSlot(p, dateD);
      const sectionId = `sec-cupo-${RUN_ID}`;
      const sectionName = `PGTEST Aula Cupo ${RUN_ID}`;
      const subj = `PGTEST ${RUN_ID} cupo`;
      try {
        await p.query(
          `INSERT INTO sections (id, name, is_available, capacity) VALUES ($1, $2, TRUE, 1);`,
          [sectionId, sectionName]
        );
        const created = await pgRepo.createTutoring(
          { subject: subj, details: 'prueba de cupo', reservDate: dateD, scheduleSlotId: free.slotId, subjectCourseId: free.subjectCourseId, teacherId: free.teacherId, modality: TutoringModality.PRESENCIAL },
          student1
        );
        await pgRepo.approveTutoring(created.id, sectionName, admin);
        if (student2 && student2.id !== student1.id) {
          await assertThrowsMessage(/cupo/, async () => {
            await pgRepo.joinTutoring(created.id, student2);
          });
        }
      } finally {
        await cleanupBySubject(p, subj);
        await p.query('DELETE FROM sections WHERE id = $1;', [sectionId]);
      }
    });
  } finally {
    await cleanupTestData(p);
  }

  const passed = results.filter((r) => r.success).length;
  return { total: results.length, passed, results };
}