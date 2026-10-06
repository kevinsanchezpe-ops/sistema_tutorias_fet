import { randomUUID } from 'node:crypto';
import { getPgPool } from './pg-pool';
import {
  ApiResponse,
  BinnacleEntry,
  Career,
  InstitutionInfo,
  Notification,
  ScheduleSlot,
  SectionClassroom,
  SubjectCourse,
  TeacherAvailability,
  Tutoring,
  TutoringAssistant,
  TutoringModality,
  TutoringStatus,
  User,
  UserRole
} from '../../types';
import { RegisterStudentDto } from '../../application/use-cases/register-student.use-case';
import { RegisterTeacherDto } from '../../application/use-cases/register-teacher.use-case';
import { CreateTutoringDto } from '../../application/use-cases/create-tutoring.use-case';
import { CreateSubjectDto } from '../../application/use-cases/create-subject.use-case';
import { AssistanceRecordItem } from '../../application/use-cases/record-assistance.use-case';
import { RateTutoringDto } from '../../application/use-cases/rate-tutoring.use-case';
import { hashPassword, comparePassword } from '../security/auth-security';
import { getCareerById, getDefaultCareer } from './careers-data';

export class PgRepository {
  private static instance: PgRepository;

  public static getInstance(): PgRepository {
    if (!PgRepository.instance) {
      PgRepository.instance = new PgRepository();
    }
    return PgRepository.instance;
  }

  private resolveCareer(careerId?: string): Career {
    if (!careerId) return getDefaultCareer();
    const career = getCareerById(careerId);
    if (!career) {
      throw new Error('La carrera seleccionada no es válida.');
    }
    return career;
  }

  // --- BITÁCORA ---
  public async logBinnacle(
    typeEvent: string,
    description: string,
    username: string,
    ipAddress: string = '127.0.0.1'
  ): Promise<void> {
    try {
      const pool = await getPgPool();
      const now = new Date();
      const dateEvent = now.toISOString().split('T')[0];
      const hourEvent = now.toTimeString().split(' ')[0].substring(0, 5);
      const id = `bin-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      await pool.query(
        `INSERT INTO binnacle (id, type_event, description, username, ip_address, date_event, hour_event)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [id, typeEvent, description, username, ipAddress, dateEvent, hourEvent]
      );
    } catch (e: any) {
      console.error('[PostgreSQL] Error al registrar bitácora:', e.message);
    }
  }

  public async getBinnacle(): Promise<BinnacleEntry[]> {
    const pool = await getPgPool();
    const res = await pool.query(
      `SELECT id, type_event as "typeEvent", description, username, ip_address as "ipAddress",
              date_event as "dateEvent", hour_event as "hourEvent"
       FROM binnacle ORDER BY date_event DESC, hour_event DESC LIMIT 100;`
    );
    return res.rows;
  }

  public async expireStaleTutorings(): Promise<number> {
    const pool = await getPgPool();
    const pendingHoursValue = Number.parseInt(process.env.PENDING_TUTORING_EXPIRY_HOURS || '48', 10);
    const noShowHoursValue = Number.parseInt(process.env.APPROVED_TUTORING_NO_SHOW_GRACE_HOURS || '24', 10);
    const pendingHours = Number.isFinite(pendingHoursValue) && pendingHoursValue > 0 ? pendingHoursValue : 48;
    const noShowHours = Number.isFinite(noShowHoursValue) && noShowHoursValue > 0 ? noShowHoursValue : 24;
    const client = await pool.connect();
    let expired: Array<{ id: string; code: string; teacher_id: string; petitioner_student_id: string; cancel_reason: string }> = [];
    try {
      await client.query('BEGIN');
      const pending = await client.query(
        `UPDATE tutorings
         SET status = $1, cancel_reason = 'Solicitud vencida: no fue atendida dentro del plazo establecido.'
         WHERE status = $2 AND created_at::timestamp <= NOW() - ($3::int * INTERVAL '1 hour')
         RETURNING id, code, teacher_id, petitioner_student_id, cancel_reason;`,
        [TutoringStatus.CANCELLED, TutoringStatus.PENDING, pendingHours]
      );
      const missed = await client.query(
        `UPDATE tutorings t
         SET status = $1, cancel_reason = 'Tutoría no realizada: no se inició dentro del plazo de tolerancia.'
         FROM schedule_slots s
         WHERE t.schedule_slot_id = s.id
           AND t.status = $2
           AND (t.reserv_date::date + s.finish_time::time + ($3::int * INTERVAL '1 hour')) < NOW()
         RETURNING t.id, t.code, t.teacher_id, t.petitioner_student_id, t.cancel_reason;`,
        [TutoringStatus.CANCELLED, TutoringStatus.APPROVED, noShowHours]
      );
      expired = [...pending.rows, ...missed.rows];
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    for (const tutoring of expired) {
      const recipients = new Set([tutoring.teacher_id, tutoring.petitioner_student_id]);
      const assistants = await pool.query(
        'SELECT student_id FROM tutoring_assistants WHERE tutoring_id = $1;',
        [tutoring.id]
      );
      assistants.rows.forEach((assistant: { student_id: string }) => recipients.add(assistant.student_id));
      await Promise.all([...recipients].map((userId) =>
        this.addNotification(userId, 'Tutoría cerrada', `La tutoría ${tutoring.code} se cerró automáticamente. ${tutoring.cancel_reason}`, tutoring.id)
      ));
      await this.logBinnacle('Cierre automático de tutoría', `Tutoría ${tutoring.code} cerrada por vencimiento. ${tutoring.cancel_reason}`, 'sistema');
    }
    return expired.length;
  }

  // --- NOTIFICACIONES ---
  public async addNotification(destinationUserId: string, subject: string, content: string, tutoringId?: string): Promise<void> {
    try {
      const pool = await getPgPool();
      const id = `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const createdAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
      await pool.query(
        `INSERT INTO notifications (id, destination_user_id, subject, content, tutoring_id, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, false, $6);`,
        [id, destinationUserId, subject, content, tutoringId || null, createdAt]
      );
    } catch (e: any) {
      console.error('[PostgreSQL] Error al crear notificación:', e.message);
    }
  }

  public async getNotifications(userId: string): Promise<Notification[]> {
    const pool = await getPgPool();
    const res = await pool.query(
      `SELECT id, destination_user_id as "destinationUserId", subject, content,
              tutoring_id as "tutoringId", is_read as "isRead", created_at as "createdAt"
       FROM notifications
       WHERE destination_user_id = $1
       ORDER BY created_at DESC;`,
      [userId]
    );
    return res.rows;
  }

  public async markNotificationRead(id: string, userId: string, isAdmin = false): Promise<void> {
    const pool = await getPgPool();
    if (isAdmin) {
      await pool.query('UPDATE notifications SET is_read = true WHERE id = $1;', [id]);
      return;
    }
    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND destination_user_id = $2;',
      [id, userId]
    );
    if (result.rowCount === 0) throw new Error('Notificación no encontrada.');
  }

  public async markAllNotificationsRead(userId: string): Promise<void> {
    const pool = await getPgPool();
    await pool.query('UPDATE notifications SET is_read = true WHERE destination_user_id = $1;', [userId]);
  }

  // --- USERS ---
  public async getUsers(): Promise<User[]> {
    const pool = await getPgPool();
    const res = await pool.query(
      `SELECT id, username, full_name as "fullName", alias, email, role, account,
              campus_id as "campusId", campus_name as "campusName", career_id as "careerId",
              career_name as "careerName", birth_date as "birthDate", admission_date as "admissionDate",
              semester, photo_url as "photoUrl", observations, is_active as "isActive",
               must_change_password as "mustChangePassword", created_at as "createdAt"
       FROM users ORDER BY full_name ASC;`
    );
    return res.rows;
  }

  public async getUsersForActor(actor: User): Promise<User[]> {
    if (actor.role === UserRole.ADMIN) return this.getUsers();
    const pool = await getPgPool();
    const profileColumns = `u.id, u.username, u.full_name as "fullName", u.alias, u.email, u.role, u.account,
      u.career_id as "careerId", u.career_name as "careerName", u.semester,
      u.photo_url as "photoUrl", u.is_active as "isActive",
      CASE WHEN u.id = $1 THEN u.must_change_password ELSE false END as "mustChangePassword",
      u.created_at as "createdAt"`;
    if (actor.role === UserRole.TEACHER) {
      const res = await pool.query(
        `SELECT DISTINCT ${profileColumns}
         FROM users u
         WHERE u.id = $1 OR u.id IN (
           SELECT ta.student_id FROM tutoring_assistants ta
           JOIN tutorings t ON t.id = ta.tutoring_id WHERE t.teacher_id = $1
         ) ORDER BY "fullName" ASC;`,
        [actor.id]
      );
      return res.rows;
    }
    const res = await pool.query(
      `SELECT ${profileColumns} FROM users u
       WHERE u.id = $1 OR (u.role = $2 AND u.is_active = true)
       ORDER BY "fullName" ASC;`,
      [actor.id, UserRole.TEACHER]
    );
    return res.rows;
  }

  public async getUserById(id: string): Promise<User | null> {
    const pool = await getPgPool();
    const res = await pool.query(
      `SELECT id, username, full_name as "fullName", alias, email, role, account,
              campus_id as "campusId", campus_name as "campusName", career_id as "careerId",
              career_name as "careerName", birth_date as "birthDate", admission_date as "admissionDate",
              semester, photo_url as "photoUrl", observations, is_active as "isActive",
              must_change_password as "mustChangePassword", session_version as "sessionVersion", created_at as "createdAt"
       FROM users WHERE id = $1;`,
      [id]
    );
    return res.rows[0] || null;
  }

  public async getUserByEmailOrUsername(term: string): Promise<User | null> {
    const pool = await getPgPool();
    const cleanTerm = term.toLowerCase().trim();
    const res = await pool.query(
      `SELECT id, username, full_name as "fullName", alias, email, role, account,
              campus_id as "campusId", campus_name as "campusName", career_id as "careerId",
              career_name as "careerName", birth_date as "birthDate", admission_date as "admissionDate",
              semester, photo_url as "photoUrl", observations, is_active as "isActive",
              must_change_password as "mustChangePassword", created_at as "createdAt"
       FROM users
       WHERE LOWER(email) = $1 OR LOWER(username) = $1 OR (account != '' AND LOWER(account) = $1);`,
      [cleanTerm]
    );
    return res.rows[0] || null;
  }

  public async createPasswordResetToken(userId: string): Promise<string> {
    const pool = await getPgPool();
    const { createHash, randomBytes } = await import('crypto');
    const resetToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(resetToken).digest('hex');
    const id = `rst-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutos de vigencia
    const createdAt = new Date().toISOString();

    // Invalidar tokens previos activos del mismo usuario
    await pool.query('UPDATE password_reset_tokens SET used = true WHERE user_id = $1;', [userId]);

    await pool.query(
      `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used, created_at)
       VALUES ($1, $2, $3, $4, false, $5);`,
      [id, userId, tokenHash, expiresAt, createdAt]
    );

    return resetToken;
  }

  public async resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const pool = await getPgPool();
    const { createHash } = await import('crypto');
    const tokenHash = createHash('sha256').update(token.trim()).digest('hex');
    const client = await pool.connect();
    let userId = '';
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `SELECT id, user_id as "userId", expires_at as "expiresAt"
         FROM password_reset_tokens WHERE token = $1 AND used = false FOR UPDATE;`,
        [tokenHash]
      );
      if (res.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, message: 'El código de seguridad es inválido o ya ha sido utilizado.' };
      }
      const record = res.rows[0];
      if (Date.now() > Number(record.expiresAt)) {
        await client.query('ROLLBACK');
        return { success: false, message: 'El código de seguridad ha expirado. Por favor solicita uno nuevo.' };
      }
      userId = record.userId;
      const hashedPassword = await hashPassword(newPassword);
      await client.query('UPDATE users SET password_hash = $1, session_version = session_version + 1, must_change_password = FALSE WHERE id = $2;', [hashedPassword, userId]);
      await client.query('UPDATE password_reset_tokens SET used = true WHERE user_id = $1;', [userId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const user = await this.getUserById(userId);
    if (user) {
      await this.logBinnacle(
        'Restablecimiento de Contraseña',
        `El usuario ${user.fullName} (${user.username}) restableció su contraseña exitosamente`,
        user.username
      );
    }

    return { success: true, message: 'Contraseña restablecida exitosamente. Ahora puedes iniciar sesión con tu nueva clave.' };
  }

  public async updatePassword(userId: string, newPassword: string): Promise<User> {
    const pool = await getPgPool();
    const hashedPassword = await hashPassword(newPassword);

    await pool.query(
      'UPDATE users SET password_hash = $1, must_change_password = FALSE, session_version = session_version + 1 WHERE id = $2;',
      [hashedPassword, userId]
    );

    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado al actualizar la contraseña.');
    }

    await this.logBinnacle(
      'Cambio de Contraseña',
      `El usuario ${user.fullName} (${user.username}) actualizó su contraseña`,
      user.username
    );

    return user;
  }

  public async revokeSessions(userId: string): Promise<void> {
    const pool = await getPgPool();
    await pool.query('UPDATE users SET session_version = session_version + 1 WHERE id = $1;', [userId]);
  }

  public async login(identity: string, password?: string, role?: UserRole): Promise<User | null> {
    const pool = await getPgPool();
    const term = identity.toLowerCase().trim();

    let query = `
      SELECT id, username, password_hash as "passwordHash", full_name as "fullName", alias, email, role, account,
             campus_id as "campusId", campus_name as "campusName", career_id as "careerId",
             career_name as "careerName", birth_date as "birthDate", admission_date as "admissionDate",
             semester, photo_url as "photoUrl", observations, is_active as "isActive",
             must_change_password as "mustChangePassword", session_version as "sessionVersion", created_at as "createdAt"
      FROM users
      WHERE (LOWER(username) = $1 OR LOWER(email) = $1 OR (account != '' AND LOWER(account) = $1))
    `;
    const params: any[] = [term];

    if (role && (role === UserRole.ADMIN || role === UserRole.TEACHER || role === UserRole.STUDENT)) {
      query += ' AND role = $2';
      params.push(role);
    }

    const res = await pool.query(query, params);
    const row = res.rows[0];
    if (!row) return null;

    // Si se proporciona una contraseña, validarla con bcrypt
    if (password !== undefined) {
      const isValid = await comparePassword(password, row.passwordHash || '');
      if (!isValid) {
        return null;
      }
    }

    // No retornar el password_hash al exterior
    const { passwordHash, ...userWithoutPassword } = row;
    return userWithoutPassword as User;
  }

  public async registerStudent(dto: RegisterStudentDto, mustChangePassword = false): Promise<User> {
    const pool = await getPgPool();
    const username = dto.username.trim().toLowerCase();
    const email = dto.email.trim().toLowerCase();
    const account = dto.account.trim();

    // Check existing
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $2 OR (account != \'\' AND LOWER(account) = LOWER($3));',
      [username, email, account]
    );
    if (existing.rows.length > 0) {
      throw new Error('Ya existe un usuario con ese nombre de usuario, correo o número de cuenta.');
    }

    const id = `usr-student-${randomUUID()}`;
    const createdAt = new Date().toISOString().split('T')[0];

    const nameParts = dto.fullName.trim().split(' ');
    const alias = (dto as any).alias || (nameParts.length >= 2 ? `${nameParts[0]} ${nameParts[1]}` : dto.fullName);
    const plainPass = typeof dto.password === 'string' ? dto.password : '';
    if (plainPass.length < 10 || plainPass.length > 100 || plainPass.trim().length < 10) {
      throw new Error('La contraseña del estudiante es obligatoria (mínimo 10 caracteres).');
    }
    const hashedPass = await hashPassword(plainPass);

    const studentCareer = this.resolveCareer(dto.careerId);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
        await client.query(
          `INSERT INTO users (id, username, password_hash, full_name, alias, email, role, account,
                            campus_id, campus_name, career_id, career_name, birth_date, admission_date,
                            semester, photo_url, observations, is_active, must_change_password, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, true, $18, $19);`,
          [
            id, username, hashedPass, dto.fullName, alias, email, UserRole.STUDENT, account,
            dto.campusId || 'cam-1', (dto as any).campusName || 'Sede Única', studentCareer.id,
            studentCareer.name, dto.birthDate || '', dto.admissionDate || createdAt, dto.semester || 0,
            (dto as any).photoUrl || '', (dto as any).observations || '', mustChangePassword, createdAt
          ]
        );
      await client.query('COMMIT');
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error?.code === '23505') {
        throw new Error('Ya existe una cuenta con ese nombre de usuario, correo o número de cuenta.');
      }
      throw error;
    } finally {
      client.release();
    }

    await this.logBinnacle('Registro de Estudiante', `Nuevo estudiante ${dto.fullName} registrado`, username);

    const user = await this.getUserById(id);
    return user!;
  }

  public async registerTeacher(dto: RegisterTeacherDto): Promise<User> {
    const pool = await getPgPool();
    const username = dto.username.trim().toLowerCase();
    const email = dto.email.trim().toLowerCase();
    const account = (dto.account || '').trim();

    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $2 OR ($3 <> \'\' AND LOWER(account) = LOWER($3));',
      [username, email, account]
    );
    if (existing.rows.length > 0) {
      throw new Error('Ya existe un usuario con ese nombre de usuario o correo.');
    }

    const id = `usr-teacher-${randomUUID()}`;
    const createdAt = new Date().toISOString().split('T')[0];

    const nameParts = dto.fullName.trim().split(' ');
    const alias = (dto as any).alias || (nameParts.length >= 2 ? `${nameParts[0]} ${nameParts[1]}` : dto.fullName);
    const plainPass = typeof dto.password === 'string' ? dto.password : '';
    if (plainPass.length < 10 || plainPass.length > 100 || plainPass.trim().length < 10) {
      throw new Error('La contraseña inicial del docente es obligatoria (mínimo 10 caracteres).');
    }
    const hashedPass = await hashPassword(plainPass);

    const teacherCareer = this.resolveCareer(dto.careerId);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
        await client.query(
          `INSERT INTO users (id, username, password_hash, full_name, alias, email, role, account,
                            campus_id, campus_name, career_id, career_name, birth_date, admission_date,
                            semester, photo_url, observations, is_active, must_change_password, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 0, $15, $16, true, true, $17);`,
          [
            id, username, hashedPass, dto.fullName, alias, email, UserRole.TEACHER, account,
            dto.campusId || 'cam-1', (dto as any).campusName || 'Sede Única', teacherCareer.id,
            teacherCareer.name, (dto as any).birthDate || '', (dto as any).admissionDate || createdAt,
            (dto as any).photoUrl || '', (dto as any).observations || '', createdAt
          ]
        );

      // Save initial availability in the same transaction as the account.
      const initialAvailability = (dto as any).initialAvailability || [];
      const availability = Array.from(new Map(
        initialAvailability.map((item: { scheduleSlotId: string; subjectCourseId: string }) => [
          `${item.scheduleSlotId}:${item.subjectCourseId}`,
          item
        ])
      ).values()) as Array<{ scheduleSlotId: string; subjectCourseId: string }>;
      if (availability.length > 0) {
        const slotIds = [...new Set(availability.map((item) => item.scheduleSlotId))];
        const subjectIds = [...new Set(availability.map((item) => item.subjectCourseId))];
        const [slots, subjects] = await Promise.all([
          client.query('SELECT id, label FROM schedule_slots WHERE id = ANY($1::text[]);', [slotIds]),
          client.query('SELECT id, name FROM subjects WHERE id = ANY($1::text[]);', [subjectIds])
        ]);
        const slotLabels = new Map(slots.rows.map((slot) => [slot.id, slot.label]));
        const subjectNames = new Map(subjects.rows.map((subject) => [subject.id, subject.name]));
        if (slotIds.some((slotId) => !slotLabels.has(slotId)) || subjectIds.some((subjectId) => !subjectNames.has(subjectId))) {
          throw new Error('Una asignatura o franja seleccionada ya no existe. Actualiza el formulario e inténtalo de nuevo.');
        }

        for (const item of availability) {
          await client.query(
            `INSERT INTO teacher_availability (id, teacher_id, teacher_name, schedule_slot_id, schedule_label, subject_course_id, subject_course_name, is_available)
             VALUES ($1, $2, $3, $4, $5, $6, $7, true);`,
            [randomUUID(), id, dto.fullName.trim(), item.scheduleSlotId, slotLabels.get(item.scheduleSlotId), item.subjectCourseId, subjectNames.get(item.subjectCourseId)]
          );
        }

        for (const subjectId of subjectIds) {
          await client.query(
            `INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $2)
             ON CONFLICT (teacher_id, subject_id) DO NOTHING;`,
            [id, subjectId]
          );
        }
      }

      await client.query('COMMIT');
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error?.code === '23505') {
        throw new Error('Ya existe una cuenta con ese nombre de usuario, correo o código de docente.');
      }
      throw error;
    } finally {
      client.release();
    }

    await this.logBinnacle('Registro de Docente', `Nuevo docente ${dto.fullName} registrado`, username);
    const user = await this.getUserById(id);
    return user!;
  }

  public async toggleUserActive(userId: string, adminUser: User): Promise<User> {
    const pool = await getPgPool();
    const current = await this.getUserById(userId);
    if (!current) throw new Error('Usuario no encontrado.');

    const newActive = !current.isActive;
    await pool.query('UPDATE users SET is_active = $1 WHERE id = $2;', [newActive, userId]);

    await this.logBinnacle(
      'Modificación de Usuario',
      `Estado de ${current.fullName} cambiado a ${newActive ? 'Activo' : 'Inactivo'} por ${adminUser.fullName}`,
      adminUser.username
    );

    return (await this.getUserById(userId))!;
  }

  public async deleteUser(userId: string, adminUser: User): Promise<User> {
    const pool = await getPgPool();
    const current = await this.getUserById(userId);
    if (!current) throw new Error('Usuario no encontrado.');

    await pool.query('DELETE FROM users WHERE id = $1;', [userId]);
    await this.logBinnacle(
      'Eliminación de Usuario',
      `Usuario ${current.fullName} eliminado por ${adminUser.fullName}`,
      adminUser.username
    );

    return current;
  }

  // --- TEACHER SUBJECTS (catálogo de asignaturas por docente) ---
  public async getTeacherSubjects(teacherId: string): Promise<SubjectCourse[]> {
    const pool = await getPgPool();
    const res = await pool.query(
      `SELECT s.id, s.name, s.code, s.credits, s.semester,
              s.career_id as "careerId", s.career_name as "careerName", s.is_active as "isActive"
       FROM subjects s
       JOIN teacher_subjects ts ON ts.subject_id = s.id
       WHERE ts.teacher_id = $1
       ORDER BY s.semester ASC, s.name ASC;`,
      [teacherId]
    );
    return res.rows;
  }

  public async canAccessAttachment(filename: string, actor: User): Promise<boolean> {
    if (actor.role === UserRole.ADMIN) return true;
    const pool = await getPgPool();
    const result = await pool.query(
      `SELECT 1 FROM tutorings t
       WHERE md5(t.attachment_url) = md5($1)
         AND t.attachment_url = $1
         AND (t.teacher_id = $2 OR t.petitioner_student_id = $2 OR EXISTS (
           SELECT 1 FROM tutoring_assistants ta
           WHERE ta.tutoring_id = t.id AND ta.student_id = $2
         )) LIMIT 1;`,
      [`/uploads/${filename}`, actor.id]
    );
    return result.rowCount > 0;
  }

  public async setTeacherSubjects(teacherId: string, subjectIds: string[], actor: User): Promise<SubjectCourse[]> {
    const pool = await getPgPool();
    const teacher = await this.getUserById(teacherId);
    if (!teacher) throw new Error('Docente no encontrado.');

    await pool.query('DELETE FROM teacher_subjects WHERE teacher_id = $1;', [teacherId]);
    for (const subId of subjectIds) {
      await pool.query(
        `INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $2)
         ON CONFLICT (teacher_id, subject_id) DO NOTHING;`,
        [teacherId, subId]
      );
    }

    // Eliminar disponibilidad de materias que dejaron de estar asignadas al docente
    await pool.query(
      `DELETE FROM teacher_availability
       WHERE teacher_id = $1
         AND subject_course_id NOT IN (SELECT subject_id FROM teacher_subjects WHERE teacher_id = $1);`,
      [teacherId]
    );

    await this.logBinnacle(
      'Asignación de Materias',
      `Materias de ${teacher.fullName} actualizadas (${subjectIds.length} asignadas) por ${actor.fullName}`,
      actor.username
    );
    return this.getTeacherSubjects(teacherId);
  }

  public async updateTeacherProfile(
    userId: string,
    dto: { fullName?: string; email?: string; careerId?: string },
    actor: User
  ): Promise<User> {
    const pool = await getPgPool();
    const teacher = await this.getUserById(userId);
    if (!teacher) throw new Error('Docente no encontrado.');
    if (teacher.role !== UserRole.TEACHER) throw new Error('El usuario seleccionado no es docente.');

    let careerId = teacher.careerId;
    let careerName = teacher.careerName;
    if (dto.careerId && dto.careerId !== teacher.careerId) {
      const career = this.resolveCareer(dto.careerId);
      careerId = career.id;
      careerName = career.name;
    }

    await pool.query(
      `UPDATE users SET
         full_name = COALESCE($1, full_name),
         email = COALESCE($2, email),
         career_id = COALESCE($3, career_id),
         career_name = COALESCE($4, career_name)
       WHERE id = $5;`,
      [dto.fullName || null, dto.email || null, careerId, careerName, userId]
    );

    await this.logBinnacle(
      'Modificación de Docente',
      `Perfil de ${teacher.fullName} actualizado por ${actor.fullName}`,
      actor.username
    );
    return (await this.getUserById(userId))!;
  }

  public async updateUserProfile(
    userId: string,
    dto: { photoUrl?: string | null; alias?: string },
    actor: User
  ): Promise<User> {
    const pool = await getPgPool();
    const targetUser = await this.getUserById(userId);
    if (!targetUser) throw new Error('Usuario no encontrado.');

    const isSelf = actor.id === userId;
    const isAdmin = actor.role === UserRole.ADMIN;
    if (!isSelf && !isAdmin) {
      throw new Error('No tiene permisos para modificar este perfil.');
    }

    if (dto.photoUrl !== undefined) {
      await pool.query(`UPDATE users SET photo_url = $1 WHERE id = $2;`, [dto.photoUrl || '', userId]);
    }
    if (dto.alias !== undefined) {
      await pool.query(`UPDATE users SET alias = $1 WHERE id = $2;`, [dto.alias || '', userId]);
    }

    await this.logBinnacle(
      'Actualización de Perfil',
      `El usuario ${targetUser.fullName} (${targetUser.username}) actualizó su foto / datos de perfil`,
      actor.username
    );

    return (await this.getUserById(userId))!;
  }

  // --- SUBJECTS ---
  public async getSubjects(): Promise<SubjectCourse[]> {
    const pool = await getPgPool();
    const res = await pool.query(
      `SELECT id, name, code, credits, semester, career_id as "careerId", career_name as "careerName", is_active as "isActive"
       FROM subjects ORDER BY name ASC;`
    );
    return res.rows;
  }

  public async createSubject(dto: CreateSubjectDto, adminUser: User): Promise<SubjectCourse> {
    const pool = await getPgPool();
    const id = `subj-${Date.now()}`;
    const subjectCareer = this.resolveCareer(dto.careerId);
    const careerId = subjectCareer.id;
    const careerName = dto.careerName || subjectCareer.name;
    await pool.query(
      `INSERT INTO subjects (id, name, code, credits, semester, career_id, career_name, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true);`,
      [id, dto.name, dto.code || '', dto.credits || 0, dto.semester || 0, careerId, careerName]
    );

    await this.logBinnacle('Catálogo de Materias', `Materia ${dto.name} agregada por ${adminUser.fullName}`, adminUser.username);
    const res = await pool.query(
      `SELECT id, name, code, credits, semester, career_id as "careerId", career_name as "careerName", is_active as "isActive"
       FROM subjects WHERE id = $1;`,
      [id]
    );
    return res.rows[0];
  }

  public async getCareers(): Promise<Career[]> {
    const pool = await getPgPool();
    const res = await pool.query(
      `SELECT id, name, code_prefix as "codePrefix", number_of_semesters as "numberOfSemesters", is_active as "isActive"
       FROM careers ORDER BY name ASC;`
    );
    return res.rows;
  }

  public async createCareer(
    dto: { name: string; codePrefix: string; numberOfSemesters: number },
    adminUser: User
  ): Promise<Career> {
    const pool = await getPgPool();
    const id = `car-fet-${Date.now()}`;
    const exists = await pool.query('SELECT id FROM careers WHERE LOWER(name) = $1;', [dto.name.trim().toLowerCase()]);
    if (exists.rows.length > 0) throw new Error('Ya existe una carrera con ese nombre.');

    await pool.query(
      `INSERT INTO careers (id, name, code_prefix, number_of_semesters, is_active)
       VALUES ($1, $2, $3, $4, true);`,
      [id, dto.name.trim(), dto.codePrefix || '', dto.numberOfSemesters || 10]
    );
    await this.logBinnacle('Catálogo de Carreras', `Carrera ${dto.name.trim()} creada`, adminUser.username);

    const res = await pool.query(
      `SELECT id, name, code_prefix as "codePrefix", number_of_semesters as "numberOfSemesters", is_active as "isActive"
       FROM careers WHERE id = $1;`,
      [id]
    );
    return res.rows[0];
  }

  public async updateCareer(
    careerId: string,
    dto: { name: string; codePrefix: string; numberOfSemesters: number },
    adminUser: User
  ): Promise<Career> {
    const pool = await getPgPool();
    const cur = await pool.query('SELECT name FROM careers WHERE id = $1', [careerId]);
    if (cur.rows.length === 0) throw new Error('Carrera no encontrada.');

    await pool.query(
      `UPDATE careers SET name = $1, code_prefix = $2, number_of_semesters = $3 WHERE id = $4;`,
      [dto.name.trim(), dto.codePrefix || '', dto.numberOfSemesters || 10, careerId]
    );
    await this.logBinnacle('Catálogo de Carreras', `Carrera ${cur.rows[0].name} actualizada a ${dto.name.trim()}`, adminUser.username);

    const res = await pool.query(
      `SELECT id, name, code_prefix as "codePrefix", number_of_semesters as "numberOfSemesters", is_active as "isActive"
       FROM careers WHERE id = $1;`,
      [careerId]
    );
    return res.rows[0];
  }

  public async toggleCareerActive(careerId: string, adminUser: User): Promise<Career> {
    const pool = await getPgPool();
    const cur = await pool.query('SELECT is_active, name FROM careers WHERE id = $1', [careerId]);
    if (cur.rows.length === 0) throw new Error('Carrera no encontrada.');

    const newActive = !cur.rows[0].is_active;
    await pool.query('UPDATE careers SET is_active = $1 WHERE id = $2;', [newActive, careerId]);
    await this.logBinnacle(
      'Catálogo de Carreras',
      `Carrera ${cur.rows[0].name} ${newActive ? 'activada' : 'inhabilitada'}`,
      adminUser.username
    );

    const res = await pool.query(
      `SELECT id, name, code_prefix as "codePrefix", number_of_semesters as "numberOfSemesters", is_active as "isActive"
       FROM careers WHERE id = $1;`,
      [careerId]
    );
    return res.rows[0];
  }

  public async deleteCareer(careerId: string, adminUser: User): Promise<Career> {
    const pool = await getPgPool();
    const cur = await pool.query(
      `SELECT id, name, code_prefix as "codePrefix", number_of_semesters as "numberOfSemesters"
       FROM careers WHERE id = $1;`,
      [careerId]
    );
    if (cur.rows.length === 0) throw new Error('Carrera no encontrada.');

    const refs = await pool.query(
      `SELECT (SELECT COUNT(*) FROM users WHERE career_id = $1) as users, (SELECT COUNT(*) FROM subjects WHERE career_id = $1) as subjects;`,
      [careerId]
    );
    if (refs.rows[0].users > 0 || refs.rows[0].subjects > 0) {
      throw new Error('No se puede eliminar: la carrera tiene usuarios o asignaturas asociadas.');
    }

    await pool.query('DELETE FROM careers WHERE id = $1;', [careerId]);
    await this.logBinnacle('Catálogo de Carreras', `Carrera ${cur.rows[0].name} eliminada`, adminUser.username);
    return cur.rows[0];
  }

  public async toggleSubjectActive(subjectId: string, adminUser: User): Promise<SubjectCourse> {
    const pool = await getPgPool();
    const cur = await pool.query('SELECT is_active, name FROM subjects WHERE id = $1', [subjectId]);
    if (cur.rows.length === 0) throw new Error('Asignatura no encontrada.');

    const newActive = !cur.rows[0].is_active;
    await pool.query('UPDATE subjects SET is_active = $1 WHERE id = $2;', [newActive, subjectId]);
    await this.logBinnacle(
      'Catálogo de Materias',
      `Materia ${cur.rows[0].name} ${newActive ? 'activada' : 'inhabilitada'}`,
      adminUser.username
    );

    const res = await pool.query(
      `SELECT id, name, code, credits, career_id as "careerId", career_name as "careerName", is_active as "isActive"
       FROM subjects WHERE id = $1;`,
      [subjectId]
    );
    return res.rows[0];
  }

  public async deleteSubject(subjectId: string, adminUser: User): Promise<SubjectCourse> {
    const pool = await getPgPool();
    const cur = await pool.query(
      `SELECT id, name, code, credits, career_id as "careerId", career_name as "careerName", is_active as "isActive"
       FROM subjects WHERE id = $1;`,
      [subjectId]
    );
    if (cur.rows.length === 0) throw new Error('Asignatura no encontrada.');

    await pool.query('DELETE FROM subjects WHERE id = $1;', [subjectId]);
    await this.logBinnacle(
      'Catálogo de Materias',
      `Materia ${cur.rows[0].name} eliminada por ${adminUser.fullName}`,
      adminUser.username
    );

    return cur.rows[0];
  }

  // --- SCHEDULE SLOTS & SECTIONS ---
  public async getScheduleSlots(): Promise<ScheduleSlot[]> {
    const pool = await getPgPool();
    const res = await pool.query(
      `SELECT id, start_time as "startTime", finish_time as "finishTime", label, is_available as "isAvailable"
       FROM schedule_slots ORDER BY start_time ASC;`
    );
    return res.rows;
  }

  public async getSections(): Promise<SectionClassroom[]> {
    const pool = await getPgPool();
    const res = await pool.query(
      `SELECT id, name, is_available as "isAvailable", capacity
       FROM sections ORDER BY name ASC;`
    );
    return res.rows;
  }

  // --- TEACHER AVAILABILITY ---
  public async getTeacherAvailability(): Promise<TeacherAvailability[]> {
    const pool = await getPgPool();
    const res = await pool.query(
      `SELECT id, teacher_id as "teacherId", teacher_name as "teacherName",
              schedule_slot_id as "scheduleSlotId", schedule_label as "scheduleLabel",
              subject_course_id as "subjectCourseId", subject_course_name as "subjectCourseName",
              is_available as "isAvailable"
       FROM teacher_availability ORDER BY teacher_name ASC, schedule_label ASC;`
    );
    return res.rows;
  }

  public async toggleTeacherAvailability(id: string, actor: User): Promise<TeacherAvailability> {
    const pool = await getPgPool();
    const cur = await pool.query('SELECT is_available, teacher_id FROM teacher_availability WHERE id = $1', [id]);
    if (cur.rows.length === 0) throw new Error('Disponibilidad no encontrada.');
    if (actor.role !== UserRole.ADMIN && (actor.role !== UserRole.TEACHER || cur.rows[0].teacher_id !== actor.id)) {
      throw new Error('No tiene permisos para modificar esta disponibilidad.');
    }

    const newActive = !cur.rows[0].is_available;
    await pool.query('UPDATE teacher_availability SET is_available = $1 WHERE id = $2', [newActive, id]);

    const res = await pool.query(
      `SELECT id, teacher_id as "teacherId", teacher_name as "teacherName",
              schedule_slot_id as "scheduleSlotId", schedule_label as "scheduleLabel",
              subject_course_id as "subjectCourseId", subject_course_name as "subjectCourseName",
              is_available as "isAvailable"
       FROM teacher_availability WHERE id = $1;`,
      [id]
    );
    return res.rows[0];
  }

  public async addTeacherAvailability(
    teacher: User,
    subjectCourseId: string,
    scheduleSlotId: string
  ): Promise<TeacherAvailability> {
    if (teacher.role !== UserRole.TEACHER) {
      throw new Error('Solo un docente puede configurar su disponibilidad.');
    }
    const pool = await getPgPool();
    const subjRes = await pool.query('SELECT name FROM subjects WHERE id = $1', [subjectCourseId]);
    const slotRes = await pool.query('SELECT label FROM schedule_slots WHERE id = $1', [scheduleSlotId]);

    if (subjRes.rows.length === 0 || slotRes.rows.length === 0) {
      throw new Error('Materia o franja horaria no válida.');
    }

    const subjectName = subjRes.rows[0].name;
    const scheduleLabel = slotRes.rows[0].label;

    const existing = await pool.query(
      `SELECT id FROM teacher_availability
       WHERE teacher_id = $1 AND subject_course_id = $2 AND schedule_slot_id = $3;`,
      [teacher.id, subjectCourseId, scheduleSlotId]
    );

    if (existing.rows.length > 0) {
      await pool.query('UPDATE teacher_availability SET is_available = true WHERE id = $1', [existing.rows[0].id]);
      const res = await pool.query(
        `SELECT id, teacher_id as "teacherId", teacher_name as "teacherName",
                schedule_slot_id as "scheduleSlotId", schedule_label as "scheduleLabel",
                subject_course_id as "subjectCourseId", subject_course_name as "subjectCourseName",
                is_available as "isAvailable"
         FROM teacher_availability WHERE id = $1;`,
        [existing.rows[0].id]
      );
      return res.rows[0];
    }

    const id = `avail-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await pool.query(
      `INSERT INTO teacher_availability (id, teacher_id, teacher_name, schedule_slot_id, schedule_label, subject_course_id, subject_course_name, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true);`,
      [id, teacher.id, teacher.fullName, scheduleSlotId, scheduleLabel, subjectCourseId, subjectName]
    );

    // Asegurar la asignatura en el catálogo del docente
    await pool.query(
      `INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $2)
       ON CONFLICT (teacher_id, subject_id) DO NOTHING;`,
      [teacher.id, subjectCourseId]
    );

    await this.logBinnacle(
      'Disponibilidad Docente',
      `Docente ${teacher.fullName} agregó franja para ${subjectName} (${scheduleLabel})`,
      teacher.username
    );

    return {
      id,
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      scheduleSlotId,
      scheduleLabel,
      subjectCourseId,
      subjectCourseName: subjectName,
      isAvailable: true
    };
  }

  public async deleteTeacherAvailability(id: string, teacher: User): Promise<boolean> {
    const pool = await getPgPool();
    if (teacher.role !== UserRole.TEACHER && teacher.role !== UserRole.ADMIN) {
      throw new Error('Solo un docente o administrador puede eliminar disponibilidades.');
    }
    const result = teacher.role === UserRole.ADMIN
      ? await pool.query('DELETE FROM teacher_availability WHERE id = $1', [id])
      : await pool.query('DELETE FROM teacher_availability WHERE id = $1 AND teacher_id = $2', [id, teacher.id]);
    if (result.rowCount === 0) throw new Error('Disponibilidad no encontrada o sin permisos.');
    await this.logBinnacle('Disponibilidad Docente', `Franja ${id} eliminada por ${teacher.fullName}`, teacher.username);
    return true;
  }

  public async setTeacherAvailabilityBatch(
    teacher: User,
    subjectCourseId: string,
    scheduleSlotIds: string[]
  ): Promise<TeacherAvailability[]> {
    const results: TeacherAvailability[] = [];
    for (const slotId of scheduleSlotIds) {
      const item = await this.addTeacherAvailability(teacher, subjectCourseId, slotId);
      results.push(item);
    }
    return results;
  }

  // --- TUTORINGS ---
  public async getTutorings(actor?: User): Promise<Tutoring[]> {
    const pool = await getPgPool();
    let where = '';
    let values: unknown[] = [];
    if (actor?.role === UserRole.TEACHER) {
      where = 'WHERE teacher_id = $1';
      values = [actor.id];
    } else if (actor?.role === UserRole.STUDENT) {
      where = `WHERE petitioner_student_id = $1
        OR EXISTS (SELECT 1 FROM tutoring_assistants ta WHERE ta.tutoring_id = tutorings.id AND ta.student_id = $1)
        OR (type = 'GROUP' AND status IN ($2, $3) AND subject_course_id IN (
          SELECT id FROM subjects
          WHERE (career_id = $4 OR career_id IS NULL OR career_id = '')
            AND ($5::int = 0 OR semester = $5 OR semester IS NULL OR semester = 0)
        ))`;
      values = [actor.id, TutoringStatus.PENDING, TutoringStatus.APPROVED, actor.careerId || '', actor.semester || 0];
    }
    const tutRes = await pool.query(
      `SELECT id, code, subject, details, reserv_date as "reservDate", request_date as "requestDate",
              modality, type, max_participants as "maxParticipants", status, space, block, subject_course_id as "subjectCourseId",
              subject_course_name as "subjectCourseName", teacher_id as "teacherId",
              teacher_name as "teacherName", petitioner_student_id as "petitionerStudentId",
              petitioner_student_name as "petitionerStudentName", schedule_slot_id as "scheduleSlotId",
              created_by_user_id as "createdByUserId", created_by_name as "createdByName", created_by_role as "createdByRole",
              schedule_label as "scheduleLabel", approved_by_id as "approvedById",
              approved_by_name as "approvedByName", start_time as "startTime",
              finish_time as "finishTime", score, student_comment as "studentComment",
              teacher_comment as "teacherComment", attachment_name as "attachmentName",
              attachment_url as "attachmentUrl", cancel_reason as "cancelReason", created_at as "createdAt"
        FROM tutorings ${where}
        ORDER BY created_at DESC;`,
      values
    );

    const tutoringIds = tutRes.rows.map((t) => t.id);
    if (tutoringIds.length === 0) return [];

    const [asstRes, rateRes] = await Promise.all([
      pool.query(
        `SELECT id, tutoring_id as "tutoringId", student_id as "studentId",
              student_name as "studentName", student_account as "studentAccount",
              student_email as "studentEmail",
              is_petitioner as "isPetitioner", has_attended as "hasAttended",
              joined_at as "joinedAt"
          FROM tutoring_assistants WHERE tutoring_id = ANY($1::varchar[]);`,
        [tutoringIds]
      ),
      pool.query(
        `SELECT id, tutoring_id as "tutoringId", student_id as "studentId",
                student_name as "studentName", score,
                student_comment as "studentComment", created_at as "createdAt"
          FROM tutoring_ratings WHERE tutoring_id = ANY($1::varchar[]);`,
        [tutoringIds]
      )
    ]);

    const assistantsByTutoring: { [key: string]: TutoringAssistant[] } = {};
    for (const a of asstRes.rows) {
      if (!assistantsByTutoring[a.tutoringId]) {
        assistantsByTutoring[a.tutoringId] = [];
      }
      assistantsByTutoring[a.tutoringId].push(a);
    }

    const ratingsByTutoring: { [key: string]: any[] } = {};
    for (const r of rateRes.rows) {
      if (!ratingsByTutoring[r.tutoringId]) {
        ratingsByTutoring[r.tutoringId] = [];
      }
      ratingsByTutoring[r.tutoringId].push(r);
    }

    return tutRes.rows.map((t) => ({
      ...t,
      createdByUserId: t.createdByUserId || t.petitionerStudentId,
      createdByName: t.createdByName || t.petitionerStudentName,
      createdByRole: t.createdByRole || (t.petitionerStudentId === t.teacherId ? UserRole.TEACHER : UserRole.STUDENT),
      creatorRole: t.createdByRole || (t.petitionerStudentId === t.teacherId ? UserRole.TEACHER : UserRole.STUDENT),
      score: Number(t.score || 0),
      assistants: assistantsByTutoring[t.id] || [],
      ratings: ratingsByTutoring[t.id] || []
    }));
  }

  public async getTutoringById(id: string): Promise<Tutoring | null> {
    const pool = await getPgPool();
    const tutRes = await pool.query(
      `SELECT id, code, subject, details, reserv_date as "reservDate", request_date as "requestDate",
              modality, type, max_participants as "maxParticipants", status, space, block, cancel_reason as "cancelReason", subject_course_id as "subjectCourseId",
              subject_course_name as "subjectCourseName", teacher_id as "teacherId",
              teacher_name as "teacherName", petitioner_student_id as "petitionerStudentId",
              petitioner_student_name as "petitionerStudentName", schedule_slot_id as "scheduleSlotId",
              created_by_user_id as "createdByUserId", created_by_name as "createdByName", created_by_role as "createdByRole",
              schedule_label as "scheduleLabel", approved_by_id as "approvedById",
              approved_by_name as "approvedByName", start_time as "startTime",
              finish_time as "finishTime", score, student_comment as "studentComment",
              teacher_comment as "teacherComment", attachment_name as "attachmentName",
              attachment_url as "attachmentUrl", created_at as "createdAt"
       FROM tutorings WHERE id = $1;`,
      [id]
    );
    if (tutRes.rows.length === 0) return null;
    const [asstRes, oneRateRes] = await Promise.all([
      pool.query(
        `SELECT id, tutoring_id as "tutoringId", student_id as "studentId",
              student_name as "studentName", student_account as "studentAccount",
              student_email as "studentEmail",
              is_petitioner as "isPetitioner", has_attended as "hasAttended",
              joined_at as "joinedAt"
          FROM tutoring_assistants WHERE tutoring_id = $1;`,
        [id]
      ),
      pool.query(
        `SELECT id, tutoring_id as "tutoringId", student_id as "studentId",
              student_name as "studentName", score,
              student_comment as "studentComment", created_at as "createdAt"
          FROM tutoring_ratings WHERE tutoring_id = $1 ORDER BY created_at ASC;`,
        [id]
      )
    ]);
    return {
      ...tutRes.rows[0],
      createdByUserId: tutRes.rows[0].createdByUserId || tutRes.rows[0].petitionerStudentId,
      createdByName: tutRes.rows[0].createdByName || tutRes.rows[0].petitionerStudentName,
      createdByRole: tutRes.rows[0].createdByRole || (tutRes.rows[0].petitionerStudentId === tutRes.rows[0].teacherId ? UserRole.TEACHER : UserRole.STUDENT),
      creatorRole: tutRes.rows[0].createdByRole || (tutRes.rows[0].petitionerStudentId === tutRes.rows[0].teacherId ? UserRole.TEACHER : UserRole.STUDENT),
      score: Number(tutRes.rows[0].score || 0),
      assistants: asstRes.rows,
      ratings: (oneRateRes.rows || []).map((r) => ({ ...r, score: Number(r.score || 0) }))
    };
  }

  public async createTutoring(dto: CreateTutoringDto, user: User): Promise<Tutoring> {
    if (user.role !== UserRole.STUDENT && user.role !== UserRole.TEACHER) {
      throw new Error('Solo estudiantes y docentes pueden crear tutorías.');
    }
    if (user.role === UserRole.TEACHER && dto.type !== 'GROUP') throw new Error('Los docentes solo pueden convocar tutorías grupales.');
    if (dto.type !== 'GROUP' && dto.type !== 'INDIVIDUAL') throw new Error('Tipo de tutoría inválido.');
    const teacherId = user.role === UserRole.TEACHER ? user.id : dto.teacherId;
    const pool = await getPgPool();

    // Verify minimum 2 days advance notice (Business Rule 1)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reservDate = new Date(dto.reservDate + 'T00:00:00');
    const diffDays = (reservDate.getTime() - today.getTime()) / (1000 * 3600 * 24);

    if (diffDays < 2) {
      throw new Error('La fecha de la tutoría debe programarse con al menos 2 días de anticipación.');
    }

    const client = await pool.connect();

    try {
    await client.query('BEGIN');
    // Serialize scheduling writes so two requests cannot both pass the same availability check.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `tutoring-slot:${teacherId}:${dto.reservDate}:${dto.scheduleSlotId}`
    ]);

    const conflict = await client.query(
      `SELECT id FROM tutorings
       WHERE teacher_id = $1 AND reserv_date = $2 AND schedule_slot_id = $3 AND status != $4
       FOR UPDATE;`,
      [teacherId, dto.reservDate, dto.scheduleSlotId, TutoringStatus.CANCELLED]
    );
    if (conflict.rows.length > 0) {
      throw new Error('El docente seleccionado ya tiene una tutoría programada en esa fecha y horario.');
    }

    // Verify teacher availability (Business Rule 4, conditional):
    // si el docente tiene disponibilidad registrada, la solicitud debe ajustarse a ella.
    const availCountRes = await client.query(
      `SELECT COUNT(*) as count FROM teacher_availability WHERE teacher_id = $1;`,
      [teacherId]
    );
    const teacherHasAvailability = parseInt(availCountRes.rows[0]?.count || '0', 10) > 0;
    if (teacherHasAvailability || user.role === UserRole.TEACHER) {
      const availMatch = await client.query(
        `SELECT id FROM teacher_availability
         WHERE teacher_id = $1 AND schedule_slot_id = $2 AND subject_course_id = $3 AND is_available = TRUE;`,
        [teacherId, dto.scheduleSlotId, dto.subjectCourseId]
      );
      if (availMatch.rows.length === 0) {
        throw new Error('El docente seleccionado no tiene disponibilidad activa para esa franja horaria y asignatura.');
      }
    }

    // Get subject and slot labels
    const subjRes = await client.query(
      'SELECT name, is_active as "isActive", career_id as "careerId", semester FROM subjects WHERE id = $1',
      [dto.subjectCourseId]
    );
    const slotRes = await client.query('SELECT label FROM schedule_slots WHERE id = $1', [dto.scheduleSlotId]);
    const teacherRes = await client.query('SELECT full_name, role, is_active as "isActive" FROM users WHERE id = $1', [teacherId]);

    if (!subjRes.rows[0]?.isActive) throw new Error('La asignatura seleccionada no está activa.');
    if (user.role === UserRole.STUDENT && subjRes.rows[0].careerId && user.careerId && subjRes.rows[0].careerId !== user.careerId) {
      throw new Error('Solo puedes solicitar tutorías de asignaturas de tu carrera.');
    }
    if (user.role === UserRole.STUDENT && Number(subjRes.rows[0].semester) > 0 && Number(user.semester) !== Number(subjRes.rows[0].semester)) {
      throw new Error(`Esta asignatura corresponde al semestre ${subjRes.rows[0].semester}.`);
    }
    if (!slotRes.rows[0]) throw new Error('La franja horaria seleccionada no es válida.');
    if (teacherRes.rows[0]?.role !== UserRole.TEACHER || !teacherRes.rows[0]?.isActive) {
      throw new Error('El docente seleccionado no está disponible para recibir solicitudes.');
    }
    const assignment = await client.query(
      'SELECT 1 FROM teacher_subjects WHERE teacher_id = $1 AND subject_id = $2;',
      [teacherId, dto.subjectCourseId]
    );
    if (assignment.rows.length === 0) throw new Error('El docente no tiene asignada esta asignatura.');

    const subjectName = subjRes.rows[0]?.name || 'Materia';
    const scheduleLabel = slotRes.rows[0]?.label || 'Horario';
    const teacherName = teacherRes.rows[0]?.full_name || 'Docente';
    let tutoringStatus = TutoringStatus.PENDING;
    let tutoringSpace = '';
    let tutoringBlock = '';
    let maxParticipants: number | null = dto.type === 'INDIVIDUAL' ? 1 : null;
    let approvedById: string | null = null;
    let approvedByName: string | null = null;

    if (user.role === UserRole.TEACHER) {
      if (!Number.isInteger(dto.maxParticipants) || Number(dto.maxParticipants) < 2) {
        throw new Error('Indica un cupo de al menos 2 estudiantes.');
      }
      maxParticipants = Number(dto.maxParticipants);
      tutoringSpace = (dto.space || '').trim();
      if (!tutoringSpace) throw new Error('Asigna el aula o enlace antes de publicar la convocatoria.');
      if (dto.modality === TutoringModality.PRESENCIAL) {
        tutoringBlock = (dto.block || '').trim();
        if (!tutoringBlock) throw new Error('Indica el bloque o edificio del aula.');
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
          `tutoring-room:${dto.reservDate}:${dto.scheduleSlotId}:${tutoringSpace.toLocaleLowerCase()}:${tutoringBlock.toLocaleLowerCase()}`
        ]);
        const roomConflict = await client.query(
          `SELECT id FROM tutorings WHERE reserv_date = $1 AND schedule_slot_id = $2
             AND LOWER(space) = LOWER($3) AND LOWER(COALESCE(block, '')) = LOWER($4)
             AND status IN ($5, $6) FOR UPDATE;`,
          [dto.reservDate, dto.scheduleSlotId, tutoringSpace, tutoringBlock, TutoringStatus.APPROVED, TutoringStatus.IN_PROGRESS]
        );
        if (roomConflict.rowCount) throw new Error('El aula y bloque ya están ocupados en esa fecha y franja.');
      } else if (dto.modality === TutoringModality.VIRTUAL) {
        let meetingUrl: URL;
        try { meetingUrl = new URL(tutoringSpace); } catch { throw new Error('Ingresa un enlace virtual válido.'); }
        if (meetingUrl.protocol !== 'https:' && meetingUrl.protocol !== 'http:') throw new Error('El enlace virtual debe comenzar con http:// o https://.');
        const virtualLimit = Number.parseInt(process.env.MAX_VIRTUAL_TUTORING_PARTICIPANTS || '30', 10) || 30;
        if (maxParticipants > virtualLimit) throw new Error(`El cupo no puede superar el límite virtual configurado (${virtualLimit}).`);
      } else {
        throw new Error('Modalidad de tutoría inválida.');
      }
      tutoringStatus = TutoringStatus.APPROVED;
      approvedById = user.id;
      approvedByName = user.alias || user.fullName;
    }

    // Código correlativo sin colisiones (MAX sufijo numérico + 1, no COUNT)
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['tutoring-code-sequence']);
    const maxRes = await client.query(
      `SELECT COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(code, '[^0-9]', '', 'g'), '') AS INT)), 0) AS maxcode FROM tutorings;`
    );
    const nextCodeNum = parseInt(maxRes.rows[0]?.maxcode ?? '0', 10) + 1;
    const code = `#${nextCodeNum}`;
    const { randomUUID } = await import('crypto');
    const id = `tut-${randomUUID()}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    await client.query(
      `INSERT INTO tutorings (id, code, subject, details, reserv_date, request_date, modality, type, max_participants, status, space,
                              block, subject_course_id, subject_course_name, teacher_id, teacher_name,
                              petitioner_student_id, petitioner_student_name, created_by_user_id, created_by_name, created_by_role, schedule_slot_id, schedule_label,
                              approved_by_id, approved_by_name, attachment_name, attachment_url, score, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, 0, $28);`,
      [
        id,
        code,
        dto.subject,
        dto.details,
        dto.reservDate,
        nowStr,
        dto.modality,
        dto.type,
        maxParticipants,
        tutoringStatus,
        tutoringSpace,
        tutoringBlock,
        dto.subjectCourseId,
        subjectName,
        teacherId,
        teacherName,
        user.id,
        user.fullName,
        user.id,
        user.fullName,
        user.role,
        dto.scheduleSlotId,
        scheduleLabel,
        approvedById,
        approvedByName,
        dto.attachmentName || null,
        dto.attachmentUrl || null,
        nowStr
      ]
    );

    // Student requesters join as participants; teacher convocations keep the teacher as organizer only.
    if (user.role === UserRole.STUDENT) {
      const asstId = `asst-${randomUUID()}`;
      await client.query(
        `INSERT INTO tutoring_assistants (id, tutoring_id, student_id, student_name, student_account, student_email, is_petitioner, has_attended, joined_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, false, $7);`,
        [asstId, id, user.id, user.fullName, user.account, user.email, nowStr]
      );
    }

    await client.query('COMMIT');
    await this.logBinnacle(
      user.role === UserRole.TEACHER ? 'Convocatoria de Tutoría' : 'Solicitud de Tutoría',
      `${user.role === UserRole.TEACHER ? 'Docente' : 'Estudiante'} ${user.fullName} ${user.role === UserRole.TEACHER ? 'convocó' : 'solicitó'} tutoría ${code} (${subjectName})`,
      user.username
    );

    if (user.role === UserRole.STUDENT) {
      await this.addNotification(teacherId, 'Nueva Solicitud de Tutoría', `El estudiante ${user.fullName} ha solicitado una tutoría para la asignatura ${subjectName} en la fecha ${dto.reservDate}.`, id);
    } else {
      const admins = await pool.query('SELECT id FROM users WHERE role = $1 AND is_active = TRUE;', [UserRole.ADMIN]);
      await Promise.all(admins.rows.map((admin: { id: string }) => this.addNotification(admin.id, 'Nueva Convocatoria Docente', `${user.fullName} convocó una tutoría grupal de ${subjectName} para el ${dto.reservDate}.`, id)));
    }

    return (await this.getTutoringById(id))!;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async approveTutoring(tutoringId: string, space: string, approver: User, block: string = '', maxParticipants?: number): Promise<Tutoring> {
    const pool = await getPgPool();
    const tut = await this.getTutoringById(tutoringId);
    if (!tut) throw new Error('Tutoría no encontrada.');

    if (approver.role === UserRole.TEACHER && approver.id !== tut.teacherId) {
      throw new Error('Un docente solo puede aprobar las tutorías que le han sido asignadas.');
    }

    const cleanSpace = (space || '').trim();
    const cleanBlock = (block || '').trim();
    const isGroup = tut.type === 'GROUP';
    const virtualLimit = Number.parseInt(process.env.MAX_VIRTUAL_TUTORING_PARTICIPANTS || '30', 10) || 30;
    if (!cleanSpace) throw new Error('Asigna un aula o enlace antes de aprobar.');
    if (isGroup && (!Number.isInteger(maxParticipants) || Number(maxParticipants) < 2)) throw new Error('Indique un cupo grupal de al menos 2 participantes.');
    if (tut.modality === TutoringModality.PRESENCIAL && !cleanBlock) throw new Error('Debe ingresar el bloque/edificio del aula para la tutoría presencial.');
    if (tut.modality === TutoringModality.VIRTUAL) {
      let meetingUrl: URL;
      try { meetingUrl = new URL(cleanSpace); } catch { throw new Error('Ingresa un enlace virtual válido.'); }
      if (!['http:', 'https:'].includes(meetingUrl.protocol)) throw new Error('El enlace virtual debe comenzar con http:// o https://.');
      if (isGroup && Number(maxParticipants) > virtualLimit) throw new Error(`El cupo no puede superar el límite virtual configurado (${virtualLimit}).`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const locked = await client.query('SELECT status FROM tutorings WHERE id = $1 FOR UPDATE;', [tutoringId]);
      if (locked.rows[0]?.status !== TutoringStatus.PENDING) throw new Error('La solicitud cambió mientras se procesaba. Actualiza la lista e inténtalo de nuevo.');

      if (tut.modality === TutoringModality.PRESENCIAL) {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
          `tutoring-room:${tut.reservDate}:${tut.scheduleSlotId}:${cleanSpace.toLocaleLowerCase()}:${cleanBlock.toLocaleLowerCase()}`
        ]);
        const conflictRes = await client.query(
          `SELECT id FROM tutorings
           WHERE reserv_date = $1 AND schedule_slot_id = $2
             AND LOWER(space) = LOWER($3) AND COALESCE(LOWER(block), '') = LOWER($4)
             AND id <> $5 AND status IN ($6, $7)
           LIMIT 1;`,
          [tut.reservDate, tut.scheduleSlotId, cleanSpace, cleanBlock, tutoringId, TutoringStatus.APPROVED, TutoringStatus.IN_PROGRESS]
        );
        if (conflictRes.rowCount) throw new Error(`Conflicto de Aula: el espacio "${cleanSpace}" (Bloque ${cleanBlock}) ya está reservado para esa franja horaria.`);
      }
      if (isGroup && tut.modality === TutoringModality.VIRTUAL && Number(maxParticipants) > virtualLimit) throw new Error(`El cupo no puede superar el límite virtual configurado (${virtualLimit}).`);
      const countRes = await client.query('SELECT COUNT(*) AS count FROM tutoring_assistants WHERE tutoring_id = $1;', [tutoringId]);
      const current = Number.parseInt(countRes.rows[0]?.count ?? '0', 10);
      const effectiveLimit = isGroup ? Number(maxParticipants) : 1;
      if (current > effectiveLimit) throw new Error(`El cupo confirmado (${effectiveLimit}) no puede ser menor que los ${current} participantes ya inscritos.`);

      const approved = await client.query(
        `UPDATE tutorings SET status = $1, space = $2, block = $3, max_participants = $4, approved_by_id = $5, approved_by_name = $6
         WHERE id = $7 AND status = $8;`,
        [TutoringStatus.APPROVED, cleanSpace, tut.modality === TutoringModality.PRESENCIAL ? cleanBlock : '', effectiveLimit, approver.id, approver.fullName, tutoringId, TutoringStatus.PENDING]
      );
      if (approved.rowCount !== 1) throw new Error('La solicitud cambió mientras se procesaba. Actualiza la lista e inténtalo de nuevo.');
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const placeLabel = tut.modality === TutoringModality.PRESENCIAL ? `${cleanSpace} (Bloque ${cleanBlock})` : cleanSpace;

    await this.logBinnacle(
      'Aprobación de Tutoría',
      `Tutoría ${tut.code} aprobada por ${approver.fullName} con espacio ${placeLabel}`,
      approver.username
    );

    // Notify student
    await this.addNotification(
      tut.petitionerStudentId,
      'Tutoría Aprobada',
      `Su tutoría ${tut.code} (${tut.subjectCourseName}) fue aprobada. Espacio asignado: ${placeLabel}`,
      tutoringId
    );

    // Notify teacher if approved by admin
    if (approver.id !== tut.teacherId) {
      await this.addNotification(
        tut.teacherId,
        'Tutoría Confirmada',
        `La tutoría ${tut.code} con ${tut.petitionerStudentName} ha sido confirmada en ${placeLabel}.`,
        tutoringId
      );
    }

    return (await this.getTutoringById(tutoringId))!;
  }

  public async cancelTutoring(tutoringId: string, reason: string, user: User): Promise<Tutoring> {
    const pool = await getPgPool();
    const tut = await this.getTutoringById(tutoringId);
    if (!tut) throw new Error('Tutoría no encontrada.');
    const isPetitioner = user.role === UserRole.STUDENT && user.id === tut.petitionerStudentId;
    const isAdmin = user.role === UserRole.ADMIN;
    const isAssignedTeacher = user.role === UserRole.TEACHER && user.id === tut.teacherId;

    if (!isPetitioner && !isAdmin && !isAssignedTeacher) {
      throw new Error('No tiene permisos para cancelar esta tutoría.');
    }

    if (!reason || reason.trim().length < 4) {
      throw new Error('Debe indicar un motivo de cancelación detallado.');
    }

    if (isPetitioner && tut.status === TutoringStatus.APPROVED) {
      const noticeValue = Number.parseInt(process.env.CANCELLATION_MIN_NOTICE_HOURS || '24', 10);
      const noticeHours = Number.isFinite(noticeValue) && noticeValue >= 0 ? noticeValue : 24;
      const timing = await pool.query(
        `SELECT ($1::date + s.start_time::time) <= NOW() + ($3::int * INTERVAL '1 hour') AS inside_notice
         FROM schedule_slots s WHERE s.id = $2;`,
        [tut.reservDate, tut.scheduleSlotId, noticeHours]
      );
      if (timing.rows[0]?.inside_notice) {
        throw new Error(`Las cancelaciones del estudiante deben hacerse con al menos ${noticeHours} horas de anticipación. Contacta al docente o administrador para informar una emergencia.`);
      }
    }

    // Máquina de estados: solo PENDING/APPROVED pueden cancelarse
    if (tut.status !== TutoringStatus.PENDING && tut.status !== TutoringStatus.APPROVED) {
      throw new Error('Solo se pueden cancelar tutorías pendientes o programadas.');
    }

    const cancelled = await pool.query(
      `UPDATE tutorings SET status = $1, cancel_reason = $2 WHERE id = $3 AND status IN ($4, $5);`,
      [TutoringStatus.CANCELLED, reason.trim(), tutoringId, TutoringStatus.PENDING, TutoringStatus.APPROVED]
    );
    if (cancelled.rowCount !== 1) throw new Error('La tutoría cambió mientras se procesaba y ya no se puede cancelar. Actualiza la lista.');

    await this.logBinnacle(
      'Cancelación de Tutoría',
      `Tutoría ${tut.code} cancelada por ${user.fullName}. Motivo: ${reason}`,
      user.username
    );

    // Notify student if cancelled by teacher or admin
    if (user.id !== tut.petitionerStudentId) {
      await this.addNotification(
        tut.petitionerStudentId,
        'Tutoría Rechazada/Cancelada',
        `Su tutoría ${tut.code} fue rechazada por ${user.fullName}. Motivo: ${reason}`,
        tutoringId
      );
    }

    // Notify teacher if cancelled by student or admin
    if (user.id !== tut.teacherId) {
      await this.addNotification(
        tut.teacherId,
        'Tutoría Cancelada',
        `La tutoría ${tut.code} con ${tut.petitionerStudentName} ha sido cancelada por ${user.fullName}. Motivo: ${reason}`,
        tutoringId
      );
    }

    // Los estudiantes inscritos también deben enterarse de la cancelación.
    const participants = await pool.query(
      `SELECT student_id FROM tutoring_assistants
       WHERE tutoring_id = $1 AND student_id <> $2 AND student_id <> $3;`,
      [tutoringId, tut.petitionerStudentId, tut.teacherId]
    );
    await Promise.all(participants.rows.map((participant: { student_id: string }) =>
      this.addNotification(
        participant.student_id,
        'Tutoría cancelada',
        `La tutoría ${tut.code} fue cancelada por ${user.fullName}. Motivo: ${reason.trim()}`,
        tutoringId
      )
    ));

    return (await this.getTutoringById(tutoringId))!;
  }

  public async startTutoring(tutoringId: string, teacher: User): Promise<Tutoring> {
    const pool = await getPgPool();
    const tut = await this.getTutoringById(tutoringId);
    if (!tut) throw new Error('Tutoría no encontrada.');

    if (teacher.role !== UserRole.TEACHER) {
      throw new Error('Solo un docente puede iniciar tutorías.');
    }
    if (teacher.id !== tut.teacherId) {
      throw new Error('Solo el docente titular puede iniciar esta tutoría.');
    }
    if (tut.status !== TutoringStatus.APPROVED) {
      throw new Error(`Solo se pueden iniciar tutorías programadas (estado actual #${tut.status}).`);
    }

    const startTime = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const started = await pool.query(
      `UPDATE tutorings SET status = $1, start_time = $2 WHERE id = $3 AND status = $4;`,
      [TutoringStatus.IN_PROGRESS, startTime, tutoringId, TutoringStatus.APPROVED]
    );
    if (started.rowCount !== 1) throw new Error('La tutoría cambió mientras se intentaba iniciar. Actualiza la lista.');

    await this.logBinnacle(
      'Inicio de Tutoría',
      `Docente ${teacher.fullName} inició la sesión de tutoría ${tut.code}`,
      teacher.username
    );

    return (await this.getTutoringById(tutoringId))!;
  }

  public async finishTutoring(tutoringId: string, teacher: User, teacherComment?: string): Promise<Tutoring> {
    const pool = await getPgPool();
    const tut = await this.getTutoringById(tutoringId);
    if (!tut) throw new Error('Tutoría no encontrada.');

    if (teacher.role !== UserRole.TEACHER) {
      throw new Error('Solo un docente puede finalizar tutorías.');
    }
    if (teacher.id !== tut.teacherId) {
      throw new Error('Solo el docente titular puede finalizar esta tutoría.');
    }
    if (tut.status !== TutoringStatus.IN_PROGRESS) {
      throw new Error(`Solo se pueden finalizar tutorías en curso (estado actual #${tut.status}).`);
    }

    const finishTime = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const finished = await pool.query(
      `UPDATE tutorings SET status = $1, finish_time = $2, teacher_comment = $3 WHERE id = $4 AND status = $5;`,
      [TutoringStatus.COMPLETED, finishTime, teacherComment || null, tutoringId, TutoringStatus.IN_PROGRESS]
    );
    if (finished.rowCount !== 1) throw new Error('La tutoría cambió mientras se intentaba finalizar. Actualiza la lista.');

    await this.logBinnacle(
      'Finalización de Tutoría',
      `Docente ${teacher.fullName} finalizó la tutoría ${tut.code}`,
      teacher.username
    );

    await this.addNotification(
      tut.petitionerStudentId,
      'Califica tu Tutoría',
      `La tutoría ${tut.code} ha finalizado. Por favor ingresa para calificar la sesión.`,
      tutoringId
    );

    return (await this.getTutoringById(tutoringId))!;
  }

  public async joinTutoring(tutoringId: string, student: User): Promise<Tutoring> {
    if (student.role !== UserRole.STUDENT) {
      throw new Error('Solo los estudiantes pueden unirse a tutorías.');
    }
    const pool = await getPgPool();
    const client = await pool.connect();
    let tut: any;
    let assistants: TutoringAssistant[] = [];
    let joinedAssistant: TutoringAssistant;
    try {
      await client.query('BEGIN');
      const tutoringRes = await client.query(
        `SELECT t.id, t.code, t.subject, t.details, t.reserv_date as "reservDate", t.request_date as "requestDate",
                t.modality, t.type, t.max_participants as "maxParticipants", t.status, t.space, t.block,
                t.cancel_reason as "cancelReason", t.subject_course_id as "subjectCourseId",
                t.subject_course_name as "subjectCourseName", t.teacher_id as "teacherId", t.teacher_name as "teacherName",
                t.petitioner_student_id as "petitionerStudentId", t.petitioner_student_name as "petitionerStudentName",
                t.created_by_user_id as "createdByUserId", t.created_by_name as "createdByName", t.created_by_role as "createdByRole",
                t.schedule_slot_id as "scheduleSlotId", t.schedule_label as "scheduleLabel",
                t.approved_by_id as "approvedById", t.approved_by_name as "approvedByName",
                t.start_time as "startTime", t.finish_time as "finishTime", t.score,
                t.student_comment as "studentComment", t.teacher_comment as "teacherComment",
                t.attachment_name as "attachmentName", t.attachment_url as "attachmentUrl", t.created_at as "createdAt",
                s.career_id as "subjectCareerId", s.semester as "subjectSemester"
         FROM tutorings t LEFT JOIN subjects s ON s.id = t.subject_course_id
         WHERE t.id = $1 AND t.status IN ($2, $3)
         FOR UPDATE OF t;`,
        [tutoringId, TutoringStatus.PENDING, TutoringStatus.APPROVED]
      );
      tut = tutoringRes.rows[0];
      if (!tut) throw new Error('La tutoría no existe o ya no está disponible.');
      if (tut.type !== 'GROUP') throw new Error('Esta tutoría es individual y no admite participantes invitados.');

      if (tut.subjectCareerId && student.careerId && tut.subjectCareerId !== student.careerId) {
        throw new Error('Solo pueden unirse estudiantes de la misma carrera de la materia.');
      }
      if (tut.subjectSemester && student.semester && Number(tut.subjectSemester) !== Number(student.semester)) {
        throw new Error(`Solo pueden unirse estudiantes del semestre ${tut.subjectSemester} de la materia.`);
      }

      const participantsRes = await client.query(
        `SELECT id, tutoring_id as "tutoringId", student_id as "studentId", student_name as "studentName",
                student_account as "studentAccount", student_email as "studentEmail",
                is_petitioner as "isPetitioner", has_attended as "hasAttended", joined_at as "joinedAt"
         FROM tutoring_assistants WHERE tutoring_id = $1;`,
        [tutoringId]
      );
      assistants = participantsRes.rows;
      if (assistants.some((participant) => participant.studentId === student.id)) {
        throw new Error('Ya estás registrado en esta tutoría.');
      }

      // La tutoría queda bloqueada hasta confirmar inscripción y cupo; así no se exceden plazas en clics simultáneos.
      let virtualLimit = Number.parseInt(process.env.MAX_VIRTUAL_TUTORING_PARTICIPANTS || '30', 10);
      if (!Number.isFinite(virtualLimit) || virtualLimit < 1) virtualLimit = 30;
      const capacity = tut.maxParticipants
        ? Number(tut.maxParticipants)
        : tut.modality === TutoringModality.VIRTUAL ? virtualLimit : 0;
      if (capacity > 0 && assistants.length >= capacity) {
        throw new Error(`El cupo de esta tutoría está completo (máximo ${capacity} participantes).`);
      }

      const asstId = `asst-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const insertRes = await client.query(
        `INSERT INTO tutoring_assistants (id, tutoring_id, student_id, student_name, student_account, student_email, is_petitioner, has_attended, joined_at)
         VALUES ($1, $2, $3, $4, $5, $6, false, false, $7)
         RETURNING id, tutoring_id as "tutoringId", student_id as "studentId", student_name as "studentName",
                   student_account as "studentAccount", student_email as "studentEmail",
                   is_petitioner as "isPetitioner", has_attended as "hasAttended", joined_at as "joinedAt";`,
        [asstId, tutoringId, student.id, student.fullName, student.account, student.email, nowStr]
      );
      joinedAssistant = insertRes.rows[0];
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    void this.logBinnacle(
      'Inscripción a Tutoría',
      `Estudiante ${student.fullName} se unió a la tutoría ${tut.code}`,
      student.username
    ).catch((error) => console.error('[PgRepository] No se pudo guardar la bitácora de inscripción:', error));
    const creatorRole = tut.createdByRole || (tut.petitionerStudentId === tut.teacherId ? UserRole.TEACHER : UserRole.STUDENT);
    return {
      ...tut,
      createdByUserId: tut.createdByUserId || tut.petitionerStudentId,
      createdByName: tut.createdByName || tut.petitionerStudentName,
      createdByRole: creatorRole,
      creatorRole,
      score: Number(tut.score || 0),
      assistants: [...assistants, joinedAssistant!],
      ratings: []
    };
  }

  public async withdrawFromTutoring(tutoringId: string, student: User): Promise<{ id: string }> {
    if (student.role !== UserRole.STUDENT) throw new Error('Solo los estudiantes pueden retirarse de una tutoría.');
    const pool = await getPgPool();
    const client = await pool.connect();
    let tutoringCode = '';
    let tutoringSubject = '';
    let teacherId = '';
    try {
      await client.query('BEGIN');
      const locked = await client.query('SELECT status, type, teacher_id as "teacherId", code, subject FROM tutorings WHERE id = $1 FOR UPDATE;', [tutoringId]);
      const tut = locked.rows[0];
      if (!tut) throw new Error('Tutoría no encontrada.');
      if (tut.type !== 'GROUP') throw new Error('Solo es posible retirarse de una tutoría grupal.');
      if (tut.status !== TutoringStatus.PENDING && tut.status !== TutoringStatus.APPROVED) {
        throw new Error('Solo puedes retirarte antes de que el docente inicie la tutoría.');
      }
      const deleted = await client.query(
        'DELETE FROM tutoring_assistants WHERE tutoring_id = $1 AND student_id = $2 AND is_petitioner = FALSE RETURNING id;',
        [tutoringId, student.id]
      );
      if (deleted.rowCount !== 1) throw new Error('No tienes una inscripción activa en esta tutoría.');
      tutoringCode = tut.code;
      tutoringSubject = tut.subject;
      teacherId = tut.teacherId;
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    void Promise.all([
      this.logBinnacle('Retiro de tutoría grupal', `${student.fullName} se retiró de la tutoría ${tutoringCode} (${tutoringSubject})`, student.username),
      this.addNotification(teacherId, 'Participante retirado', `${student.fullName} se retiró de la tutoría grupal ${tutoringCode}.`, tutoringId)
    ]).catch((error) => console.error('[PgRepository] No se pudo completar el registro posterior al retiro:', error));
    return { id: tutoringId };
  }

  public async recordAssistance(tutoringId: string, records: AssistanceRecordItem[], teacher: User): Promise<Tutoring> {
    const pool = await getPgPool();
    if (teacher.role !== UserRole.TEACHER) {
      throw new Error('Solo el docente puede registrar la asistencia.');
    }
    const tutForAuth = await this.getTutoringById(tutoringId);
    if (!tutForAuth) throw new Error('Tutoría no encontrada.');
    if (tutForAuth.teacherId !== teacher.id) {
      throw new Error('Solo el docente titular puede registrar asistencia.');
    }
    if (tutForAuth.status !== TutoringStatus.IN_PROGRESS && tutForAuth.status !== TutoringStatus.COMPLETED) {
      throw new Error('Solo se puede registrar asistencia en tutorías en proceso o finalizadas.');
    }
    for (const r of records) {
      await pool.query(
        `UPDATE tutoring_assistants SET has_attended = $1 WHERE tutoring_id = $2 AND (id = $3 OR student_id = $3);`,
        [r.hasAttended, tutoringId, r.assistantId]
      );
    }

    await this.logBinnacle(
      'Toma de Asistencia',
      `Docente ${teacher.fullName} registró asistencia de ${records.length} alumnos en tutoría ${tutoringId}`,
      teacher.username
    );

    return (await this.getTutoringById(tutoringId))!;
  }

  public async rateTutoring(dto: RateTutoringDto, student: User): Promise<Tutoring> {
    const pool = await getPgPool();
    const tut = await this.getTutoringById(dto.tutoringId);
    if (!tut) throw new Error('Tutoría no encontrada.');

    if (student.role !== UserRole.STUDENT) {
      throw new Error('Solo los estudiantes pueden calificar tutorías.');
    }
    // Regla grupal: cualquier participante (solicitante o invitado) puede evaluar
    const partRes = await pool.query(
      'SELECT 1 FROM tutoring_assistants WHERE tutoring_id = $1 AND student_id = $2 AND has_attended = TRUE;',
      [dto.tutoringId, student.id]
    );
    if (partRes.rows.length === 0) {
      throw new Error('Solo los estudiantes cuya asistencia fue confirmada pueden evaluar esta tutoría.');
    }
    if (tut.status !== TutoringStatus.COMPLETED) {
      throw new Error('Solo se pueden calificar tutorías que hayan finalizado.');
    }
    const dupRes = await pool.query(
      'SELECT 1 FROM tutoring_ratings WHERE tutoring_id = $1 AND student_id = $2;',
      [dto.tutoringId, student.id]
    );
    if (dupRes.rows.length > 0) {
      throw new Error('Esta tutoría ya fue calificada por ti anteriormente.');
    }
    if (!Number.isInteger(dto.score) || dto.score < 1 || dto.score > 5) {
      throw new Error('La calificación debe estar entre 1 y 5 estrellas.');
    }
    if (!dto.studentComment || dto.studentComment.trim().length < 5) {
      throw new Error('Agregue un comentario sobre su experiencia en la tutoría.');
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    await pool.query(
      `INSERT INTO tutoring_ratings (id, tutoring_id, student_id, student_name, score, student_comment, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [`rate-${Date.now()}`, dto.tutoringId, student.id, student.fullName, dto.score, dto.studentComment.trim(), nowStr]
    );

    // Compatibilidad: score = promedio, student_comment = más reciente
    const allRes = await pool.query(
      'SELECT score, student_comment as "studentComment", created_at as "createdAt" FROM tutoring_ratings WHERE tutoring_id = $1 ORDER BY created_at ASC;',
      [dto.tutoringId]
    );
    const avg = allRes.rows.reduce((s: number, r: any) => s + Number(r.score), 0) / allRes.rows.length;
    const latest = allRes.rows[allRes.rows.length - 1]?.studentComment || null;
    await pool.query('UPDATE tutorings SET score = $1, student_comment = $2 WHERE id = $3;', [
      Math.round(avg * 10) / 10,
      latest,
      dto.tutoringId
    ]);

    await this.logBinnacle(
      'Calificación de Tutoría',
      `Estudiante ${student.fullName} calificó tutoría ${tut.code} con ${dto.score} estrellas`,
      student.username
    );

    return (await this.getTutoringById(dto.tutoringId))!;
  }

  // --- INSTITUTION ---
  public async getInstitution(): Promise<InstitutionInfo> {
    const pool = await getPgPool();
    const res = await pool.query('SELECT id, name, vision, mission, address, phone, email, logo FROM institution LIMIT 1;');
    return res.rows[0];
  }

  public async updateInstitution(info: Partial<InstitutionInfo>, user: User): Promise<InstitutionInfo> {
    const pool = await getPgPool();
    const cur = await this.getInstitution();
    const updated = { ...cur, ...info };

    await pool.query(
      `UPDATE institution
       SET name = $1, vision = $2, mission = $3, address = $4, phone = $5, email = $6, logo = $7
       WHERE id = $8;`,
      [updated.name, updated.vision, updated.mission, updated.address, updated.phone, updated.email, updated.logo, cur.id]
    );

    await this.logBinnacle('Configuración', 'Actualización de datos institucionales', user.username);
    return updated;
  }

  // --- ANALYTICS ---
  public async getAnalytics(): Promise<any> {
    const pool = await getPgPool();
    const tutorings = await this.getTutorings();
    const users = await this.getUsers();

    const totalTutorings = tutorings.length;
    const pendingCount = tutorings.filter((t) => t.status === TutoringStatus.PENDING).length;
    const approvedCount = tutorings.filter((t) => t.status === TutoringStatus.APPROVED).length;
    const inProgressCount = tutorings.filter((t) => t.status === TutoringStatus.IN_PROGRESS).length;
    const completedCount = tutorings.filter((t) => t.status === TutoringStatus.COMPLETED).length;
    const cancelledCount = tutorings.filter((t) => t.status === TutoringStatus.CANCELLED).length;

    // Attendance query
    let attendanceRate = 100;
    try {
      const asstRes = await pool.query(
        'SELECT count(*) as total, count(*) FILTER (WHERE has_attended = true) as attended FROM tutoring_assistants;'
      );
      const totalAsst = parseInt(asstRes.rows[0]?.total || '0', 10);
      const attended = parseInt(asstRes.rows[0]?.attended || '0', 10);
      if (totalAsst > 0) {
        attendanceRate = Math.round((attended / totalAsst) * 100);
      }
    } catch {
      attendanceRate = 100;
    }

    // Modality distribution
    const presencialCount = tutorings.filter((t) => t.modality === TutoringModality.PRESENCIAL).length;
    const virtualCount = tutorings.filter((t) => t.modality === TutoringModality.VIRTUAL).length;
    const modalityDistribution = [
      {
        name: 'Presencial',
        count: presencialCount,
        percentage: totalTutorings > 0 ? Math.round((presencialCount / totalTutorings) * 100) : 0,
        color: '#0EA5E9'
      },
      {
        name: 'Virtual',
        count: virtualCount,
        percentage: totalTutorings > 0 ? Math.round((virtualCount / totalTutorings) * 100) : 0,
        color: '#8B5CF6'
      }
    ];

    const ratedTutorings = tutorings.filter((t) => t.score > 0);
    const averageRating =
      ratedTutorings.length > 0
        ? Number((ratedTutorings.reduce((acc, t) => acc + t.score, 0) / ratedTutorings.length).toFixed(1))
        : 5.0;

    const totalStudents = users.filter((u) => u.role === UserRole.STUDENT).length;
    const totalTeachers = users.filter((u) => u.role === UserRole.TEACHER).length;

    const completionRate = totalTutorings > 0 ? Math.round((completedCount / totalTutorings) * 100) : 0;
    const cancellationRate = totalTutorings > 0 ? Math.round((cancelledCount / totalTutorings) * 100) : 0;

    const statusDistribution = [
      { name: 'Pendientes', count: pendingCount, color: '#F59E0B' },
      { name: 'Aprobadas', count: approvedCount, color: '#10B981' },
      { name: 'En Proceso', count: inProgressCount, color: '#3B82F6' },
      { name: 'Finalizadas', count: completedCount, color: '#6366F1' },
      { name: 'Canceladas', count: cancelledCount, color: '#EF4444' }
    ];

    // Course frequency strictly for subjects that exist in the database
    const existingSubjects = await this.getSubjects();
    const activeSubjects = existingSubjects.filter((s) => s.isActive);
    const courseFrequency = activeSubjects
      .map((s) => {
        const count = tutorings.filter((t) =>
          t.subjectCourseId === s.id ||
          (t.subjectCourseName && t.subjectCourseName.trim().toLowerCase() === s.name.trim().toLowerCase())
        ).length;
        return {
          subject: s.name.length > 22 ? s.name.substring(0, 20) + '...' : s.name,
          fullName: s.name,
          count
        };
      })
      .sort((a, b) => b.count - a.count);

    // Rating distribution with clean text labels
    const starCounts: { [key: string]: number } = {
      '5 Estrellas': 0,
      '4 Estrellas': 0,
      '3 Estrellas': 0,
      '2 Estrellas': 0,
      '1 Estrella': 0
    };
    ratedTutorings.forEach((t) => {
      if (t.score >= 5) starCounts['5 Estrellas']++;
      else if (t.score === 4) starCounts['4 Estrellas']++;
      else if (t.score === 3) starCounts['3 Estrellas']++;
      else if (t.score === 2) starCounts['2 Estrellas']++;
      else if (t.score === 1) starCounts['1 Estrella']++;
    });
    const ratingDistribution = [
      { stars: '5 Estrellas', count: starCounts['5 Estrellas'], color: '#10B981' },
      { stars: '4 Estrellas', count: starCounts['4 Estrellas'], color: '#3B82F6' },
      { stars: '3 Estrellas', count: starCounts['3 Estrellas'], color: '#F59E0B' },
      { stars: '2 Estrellas', count: starCounts['2 Estrellas'], color: '#F97316' },
      { stars: '1 Estrella', count: starCounts['1 Estrella'], color: '#EF4444' }
    ];

    // Teacher workload
    const teacherMap: { [id: string]: { name: string; total: number; completed: number; ratings: number[] } } = {};
    tutorings.forEach((t) => {
      if (!t.teacherId) return;
      if (!teacherMap[t.teacherId]) {
        teacherMap[t.teacherId] = {
          name: t.teacherName || 'Docente Tutor',
          total: 0,
          completed: 0,
          ratings: []
        };
      }
      teacherMap[t.teacherId].total++;
      if (t.status === TutoringStatus.COMPLETED) {
        teacherMap[t.teacherId].completed++;
      }
      if (t.score > 0) {
        teacherMap[t.teacherId].ratings.push(t.score);
      }
    });

    const teacherWorkload = Object.values(teacherMap)
      .map((t) => ({
        name: t.name,
        total: t.total,
        completed: t.completed,
        avgRating: t.ratings.length > 0 ? Number((t.ratings.reduce((a, b) => a + b, 0) / t.ratings.length).toFixed(1)) : 5.0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Recent activity timeline
    const dateCounts: { [d: string]: number } = {};
    tutorings.forEach((t) => {
      const d = t.reservDate || (t.requestDate ? t.requestDate.substring(0, 10) : '');
      if (d) {
        dateCounts[d] = (dateCounts[d] || 0) + 1;
      }
    });
    const timeline = Object.keys(dateCounts)
      .sort()
      .slice(-6)
      .map((d) => ({ date: d, count: dateCounts[d] }));

    return {
      totalTutorings,
      pendingCount,
      approvedCount,
      inProgressCount,
      completedCount,
      cancelledCount,
      averageRating,
      totalStudents,
      totalTeachers,
      attendanceRate,
      completionRate,
      cancellationRate,
      totalReviews: ratedTutorings.length,
      modalityDistribution,
      statusDistribution,
      courseFrequency,
      ratingDistribution,
      teacherWorkload,
      timeline
    };
  }
}

export const pgRepo = PgRepository.getInstance();
