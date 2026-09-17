import fs from 'fs';
import path from 'path';
import { ensureDatabaseExists, getPgPool } from './pg-pool';
import {
  INITIAL_BINNACLE,
  INITIAL_INSTITUTION,
  INITIAL_SCHEDULE_SLOTS,
  INITIAL_SECTIONS,
  INITIAL_SUBJECTS,
  INITIAL_TEACHER_AVAILABILITY,
  INITIAL_TUTORINGS,
  INITIAL_USERS
} from './initial-data';
import { CAREERS } from './careers-data';

export async function initPostgres(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Ensure target DB exists (or create it)
    await ensureDatabaseExists();

    const pool = await getPgPool();

    // 2. Read and execute DDL schema
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'core', 'infrastructure', 'database', 'pg-schema.sql'),
      typeof __dirname !== 'undefined' ? path.join(__dirname, 'pg-schema.sql') : ''
    ].filter(Boolean);

    let schemaSql = '';
    for (const p of possiblePaths) {
      if (p && fs.existsSync(p)) {
        schemaSql = fs.readFileSync(p, 'utf-8');
        break;
      }
    }

    if (!schemaSql) {
      throw new Error('No se pudo encontrar el archivo pg-schema.sql.');
    }

    await pool.query(schemaSql);
    console.log('[PostgreSQL] Esquema de tablas verificado y actualizado con éxito.');

    // Seed / asegurar el catálogo de carreras (idempotente)
    for (const c of CAREERS) {
      await pool.query(
        `INSERT INTO careers (id, name, code_prefix, number_of_semesters, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (id) DO NOTHING;`,
        [c.id, c.name, c.codePrefix, c.numberOfSemesters]
      );
    }

    // Normalizar career_id inconsistentes de versiones previas (car-1 -> car-fet-software)
    await pool.query(
      `UPDATE users
       SET career_id = 'car-fet-software', career_name = 'Ingeniería de Software (FET)'
       WHERE career_id = 'car-1' OR career_id = '' OR career_id IS NULL;`
    );
    await pool.query(
      `UPDATE subjects
       SET career_id = 'car-fet-software', career_name = 'Ingeniería de Software (FET)'
       WHERE career_id = 'car-1' OR career_id = '' OR career_id IS NULL;`
    );

    // 3. Check if users table is populated
    const countRes = await pool.query('SELECT COUNT(*) as count FROM users;');
    const userCount = parseInt(countRes.rows[0].count, 10);

    if (userCount === 0) {
      console.log('[PostgreSQL] Base de datos vacía. Sembrando datos iniciales...');

      // Seed Users
      for (const u of INITIAL_USERS) {
        await pool.query(
          `INSERT INTO users (id, username, password_hash, full_name, alias, email, phone, role, account, campus_id, campus_name, career_id, career_name, birth_date, admission_date, semester, photo_url, observations, is_active, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
           ON CONFLICT (id) DO NOTHING;`,
          [
            u.id,
            u.username,
            u.passwordHash || '',
            u.fullName,
            u.alias,
            u.email,
            u.phone,
            u.role,
            u.account,
            u.campusId,
            u.campusName,
            u.careerId,
            u.careerName,
            u.birthDate,
            u.admissionDate,
            u.semester || 0,
            u.photoUrl || '',
            u.observations || '',
            u.isActive,
            u.createdAt
          ]
        );
      }

      // Seed Subjects
      for (const s of INITIAL_SUBJECTS) {
        await pool.query(
          `INSERT INTO subjects (id, name, code, credits, career_id, career_name, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING;`,
          [s.id, s.name, s.code || '', s.credits || 0, s.careerId, s.careerName, s.isActive]
        );
      }

      // Seed Schedule Slots
      for (const sl of INITIAL_SCHEDULE_SLOTS) {
        await pool.query(
          `INSERT INTO schedule_slots (id, start_time, finish_time, label, is_available)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING;`,
          [sl.id, sl.startTime, sl.finishTime, sl.label, sl.isAvailable]
        );
      }

      // Seed Sections
      for (const sec of INITIAL_SECTIONS) {
        await pool.query(
          `INSERT INTO sections (id, name, is_available)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO NOTHING;`,
          [sec.id, sec.name, sec.isAvailable]
        );
      }

      // Seed Teacher Availability
      for (const a of INITIAL_TEACHER_AVAILABILITY) {
        await pool.query(
          `INSERT INTO teacher_availability (id, teacher_id, teacher_name, schedule_slot_id, schedule_label, subject_course_id, subject_course_name, is_available)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING;`,
          [
            a.id,
            a.teacherId,
            a.teacherName,
            a.scheduleSlotId,
            a.scheduleLabel,
            a.subjectCourseId,
            a.subjectCourseName,
            a.isAvailable
          ]
        );
      }

      // Seed Tutorings
      for (const t of INITIAL_TUTORINGS) {
        await pool.query(
          `INSERT INTO tutorings (id, code, subject, details, reserv_date, request_date, modality, status, space, subject_course_id, subject_course_name, teacher_id, teacher_name, petitioner_student_id, petitioner_student_name, schedule_slot_id, schedule_label, approved_by_id, approved_by_name, start_time, finish_time, score, student_comment, teacher_comment, attachment_name, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
           ON CONFLICT (id) DO NOTHING;`,
          [
            t.id,
            t.code,
            t.subject,
            t.details,
            t.reservDate,
            t.requestDate,
            t.modality,
            t.status,
            t.space,
            t.subjectCourseId,
            t.subjectCourseName,
            t.teacherId,
            t.teacherName,
            t.petitionerStudentId,
            t.petitionerStudentName,
            t.scheduleSlotId,
            t.scheduleLabel,
            t.approvedById || null,
            t.approvedByName || null,
            t.startTime || null,
            t.finishTime || null,
            t.score || 0,
            t.studentComment || null,
            t.teacherComment || null,
            t.attachmentName || null,
            t.createdAt
          ]
        );

        // Seed assistants for each tutoring
        if (t.assistants && t.assistants.length > 0) {
          for (const asst of t.assistants) {
            await pool.query(
              `INSERT INTO tutoring_assistants (id, tutoring_id, student_id, student_name, student_account, student_phone, student_email, is_petitioner, has_attended, joined_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
               ON CONFLICT (id) DO NOTHING;`,
              [
                asst.id,
                asst.tutoringId,
                asst.studentId,
                asst.studentName,
                asst.studentAccount,
                asst.studentPhone,
                asst.studentEmail,
                asst.isPetitioner,
                asst.hasAttended,
                asst.joinedAt
              ]
            );
          }
        }
      }

      // Seed Notifications
      await pool.query(
        `INSERT INTO notifications (id, destination_user_id, subject, content, is_read, created_at)
         VALUES
         ('notif-1', 'usr-student-1', 'Solicitud Aprobada', 'Su tutoría sobre Polimorfismo (#14) fue aprobada para la fecha programada. Enlace virtual asignado.', false, '2026-09-01 12:00'),
         ('notif-2', 'usr-teacher-1', 'Solicitud Asignada', 'Se le ha asignado la tutoría #14 con Dennis M. Andino para el horario 14:00 - 15:00.', false, '2026-09-01 12:00')
         ON CONFLICT (id) DO NOTHING;`
      );

      // Seed Binnacle
      for (const b of INITIAL_BINNACLE) {
        await pool.query(
          `INSERT INTO binnacle (id, type_event, description, username, ip_address, date_event, hour_event)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING;`,
          [b.id, b.typeEvent, b.description, b.username, b.ipAddress, b.dateEvent, b.hourEvent]
        );
      }

      // Seed Institution
      await pool.query(
        `INSERT INTO institution (id, name, vision, mission, address, phone, email, logo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING;`,
        [
          INITIAL_INSTITUTION.id,
          INITIAL_INSTITUTION.name,
          INITIAL_INSTITUTION.vision,
          INITIAL_INSTITUTION.mission,
          INITIAL_INSTITUTION.address,
          INITIAL_INSTITUTION.phone,
          INITIAL_INSTITUTION.email,
          INITIAL_INSTITUTION.logo
        ]
      );

      console.log('[PostgreSQL] Datos iniciales sembrados con éxito.');
    } else {
      console.log(`[PostgreSQL] Base de datos activa con ${userCount} usuarios registrados.`);
    }

    // Sincronizar siempre el catálogo de asignaturas con el Pénsum Oficial FET (5 carreras)
    const { seedCurriculums } = await import('./seed-fet-subjects');
    await seedCurriculums();

    // Adoptar catálogo de asignaturas por docente (teacher_subjects) desde la disponibilidad existente
    await pool.query(
      `INSERT INTO teacher_subjects (teacher_id, subject_id)
       SELECT DISTINCT teacher_id, subject_course_id
       FROM teacher_availability
       ON CONFLICT DO NOTHING;`
    );

    return {
      success: true,
      message: 'PostgreSQL conectado e inicializado correctamente.'
    };
  } catch (error: any) {
    console.error('[PostgreSQL] Error al inicializar:', error.message);
    return {
      success: false,
      message: error.message
    };
  }
}
