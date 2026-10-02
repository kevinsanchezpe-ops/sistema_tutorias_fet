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

  public async markNotificationRead(id: string): Promise<void> {
    const pool = await getPgPool();
    await pool.query('UPDATE notifications SET is_read = true WHERE id = $1;', [id]);
  }

  public async markAllNotificationsRead(userId: string): Promise<void> {
    const pool = await getPgPool();
    await pool.query('UPDATE notifications SET is_read = true WHERE destination_user_id = $1;', [userId]);
  }

  // --- USERS ---
  public async getUsers(): Promise<User[]> {
    const pool = await getPgPool();
    const res = await pool.query(
      `SELECT id, username, full_name as "fullName", alias, email, phone, role, account,
              campus_id as "campusId", campus_name as "campusName", career_id as "careerId",
              career_name as "careerName", birth_date as "birthDate", admission_date as "admissionDate",
              semester, photo_url as "photoUrl", observations, is_active as "isActive",
              must_change_password as "mustChangePassword", created_at as "createdAt"
       FROM users ORDER BY full_name ASC;`
    );
    return res.rows;
  }

  public async getUserById(id: string): Promise<User | null> {
    const pool = await getPgPool();
    const res = await pool.query(
      `SELECT id, username, full_name as "fullName", alias, email, phone, role, account,
              campus_id as "campusId", campus_name as "campusName", career_id as "careerId",
              career_name as "careerName", birth_date as "birthDate", admission_date as "admissionDate",
              semester, photo_url as "photoUrl", observations, is_active as "isActive",
              must_change_password as "mustChangePassword", created_at as "createdAt"
       FROM users WHERE id = $1;`,
      [id]
    );
    return res.rows[0] || null;
  }

  public async getUserByEmailOrUsername(term: string): Promise<User | null> {
    const pool = await getPgPool();
    const cleanTerm = term.toLowerCase().trim();
    const res = await pool.query(
      `SELECT id, username, full_name as "fullName", alias, email, phone, role, account,
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
    // Código de 6 dígitos con RNG criptográfico (Math.random es predecible)
    const { randomInt } = await import('crypto');
    const resetToken = randomInt(100000, 1000000).toString();
    const id = `rst-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutos de vigencia
    const createdAt = new Date().toISOString();

    // Invalidar tokens previos activos del mismo usuario
    await pool.query('UPDATE password_reset_tokens SET used = true WHERE user_id = $1;', [userId]);

    await pool.query(
      `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used, created_at)
       VALUES ($1, $2, $3, $4, false, $5);`,
      [id, userId, resetToken, expiresAt, createdAt]
    );

    return resetToken;
  }

  public async resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const pool = await getPgPool();
    const cleanToken = token.trim();

    const res = await pool.query(
      `SELECT id, user_id as "userId", expires_at as "expiresAt", used
       FROM password_reset_tokens
       WHERE token = $1 AND used = false;`,
      [cleanToken]
    );

    if (res.rows.length === 0) {
      return { success: false, message: 'El código de seguridad es inválido o ya ha sido utilizado.' };
    }

    const record = res.rows[0];
    const now = Date.now();

    if (now > Number(record.expiresAt)) {
      return { success: false, message: 'El código de seguridad ha expirado. Por favor solicita uno nuevo.' };
    }

    // Hashear nueva contraseña con bcrypt
    const hashedPassword = await hashPassword(newPassword);

    // Actualizar usuario
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2;', [hashedPassword, record.userId]);

    // Marcar token como utilizado
    await pool.query('UPDATE password_reset_tokens SET used = true WHERE id = $1;', [record.id]);

    const user = await this.getUserById(record.userId);
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
      'UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2;',
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

  public async login(identity: string, password?: string, role?: UserRole): Promise<User | null> {
    const pool = await getPgPool();
    const term = identity.toLowerCase().trim();

    let query = `
      SELECT id, username, password_hash as "passwordHash", full_name as "fullName", alias, email, phone, role, account,
             campus_id as "campusId", campus_name as "campusName", career_id as "careerId",
             career_name as "careerName", birth_date as "birthDate", admission_date as "admissionDate",
             semester, photo_url as "photoUrl", observations, is_active as "isActive",
             must_change_password as "mustChangePassword", created_at as "createdAt"
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

  public async registerStudent(dto: RegisterStudentDto): Promise<User> {
    const pool = await getPgPool();

    // Check existing
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $2 OR (account != \'\' AND account = $3);',
      [dto.username.toLowerCase(), dto.email.toLowerCase(), dto.account || '']
    );
    if (existing.rows.length > 0) {
      throw new Error('Ya existe un usuario con ese nombre de usuario, correo o número de cuenta.');
    }

    const id = `usr-student-${Date.now()}`;
    const createdAt = new Date().toISOString().split('T')[0];

    const nameParts = dto.fullName.trim().split(' ');
    const alias = (dto as any).alias || (nameParts.length >= 2 ? `${nameParts[0]} ${nameParts[1]}` : dto.fullName);
    const plainPass = ((dto as any).password || '').trim();
    if (plainPass.length < 6) {
      throw new Error('La contraseña del estudiante es obligatoria (mínimo 6 caracteres).');
    }
    const hashedPass = await hashPassword(plainPass);

    const studentCareer = this.resolveCareer(dto.careerId);

    await pool.query(
      `INSERT INTO users (id, username, password_hash, full_name, alias, email, phone, role, account,
                          campus_id, campus_name, career_id, career_name, birth_date, admission_date,
                          semester, photo_url, observations, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, true, $19);`,
      [
        id,
        dto.username,
        hashedPass,
        dto.fullName,
        alias,
        dto.email,
        dto.phone || '',
        UserRole.STUDENT,
        dto.account,
        dto.campusId || 'cam-1',
        (dto as any).campusName || 'Sede Única',
        studentCareer.id,
        studentCareer.name,
        dto.birthDate || '',
        dto.admissionDate || createdAt,
        dto.semester || 0,
        (dto as any).photoUrl || '',
        (dto as any).observations || '',
        createdAt
      ]
    );

    await this.logBinnacle('Registro de Estudiante', `Nuevo estudiante ${dto.fullName} registrado`, dto.username);

    const user = await this.getUserById(id);
    return user!;
  }

  public async registerTeacher(dto: RegisterTeacherDto): Promise<User> {
    const pool = await getPgPool();

    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $2;',
      [dto.username.toLowerCase(), dto.email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      throw new Error('Ya existe un usuario con ese nombre de usuario o correo.');
    }

    const id = `usr-teacher-${Date.now()}`;
    const createdAt = new Date().toISOString().split('T')[0];

    const nameParts = dto.fullName.trim().split(' ');
    const alias = (dto as any).alias || (nameParts.length >= 2 ? `${nameParts[0]} ${nameParts[1]}` : dto.fullName);
    const plainPass = ((dto as any).password || '').trim();
    if (plainPass.length < 6) {
      throw new Error('La contraseña inicial del docente es obligatoria (mínimo 6 caracteres).');
    }
    const hashedPass = await hashPassword(plainPass);

    const teacherCareer = this.resolveCareer(dto.careerId);

    await pool.query(
      `INSERT INTO users (id, username, password_hash, full_name, alias, email, phone, role, account,
                          campus_id, campus_name, career_id, career_name, birth_date, admission_date,
                          semester, photo_url, observations, is_active, must_change_password, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 0, $16, $17, true, true, $18);`,
      [
        id,
        dto.username,
        hashedPass,
        dto.fullName,
        alias,
        dto.email,
        dto.phone || '',
        UserRole.TEACHER,
        dto.account || '',
        dto.campusId || 'cam-1',
        (dto as any).campusName || 'Sede Única',
        teacherCareer.id,
        teacherCareer.name,
        (dto as any).birthDate || '',
        (dto as any).admissionDate || createdAt,
        (dto as any).photoUrl || '',
        (dto as any).observations || '',
        createdAt
      ]
    );

    // Save initial availability if provided
    const initialAvailability = (dto as any).initialAvailability;
    if (initialAvailability && initialAvailability.length > 0) {
      for (const item of initialAvailability) {
        const slot = await pool.query('SELECT label FROM schedule_slots WHERE id = $1', [item.scheduleSlotId]);
        const subj = await pool.query('SELECT name FROM subjects WHERE id = $1', [item.subjectCourseId]);
        const slotLabel = slot.rows[0]?.label || 'Horario';
        const subjName = subj.rows[0]?.name || 'Materia';
        const availId = `avail-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

        await pool.query(
          `INSERT INTO teacher_availability (id, teacher_id, teacher_name, schedule_slot_id, schedule_label, subject_course_id, subject_course_name, is_available)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true);`,
          [availId, id, dto.fullName, item.scheduleSlotId, slotLabel, item.subjectCourseId, subjName]
        );
      }
    }

    // Registrar catálogo de asignaturas del docente (teacher_subjects)
    if (initialAvailability && initialAvailability.length > 0) {
      const catalogSubjects = Array.from(new Set(initialAvailability.map((item) => item.subjectCourseId)));
      for (const subId of catalogSubjects) {
        await pool.query(
          `INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $2)
           ON CONFLICT (teacher_id, subject_id) DO NOTHING;`,
          [id, subId]
        );
      }
    }

    await this.logBinnacle('Registro de Docente', `Nuevo docente ${dto.fullName} registrado`, dto.username);
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
    dto: { fullName?: string; phone?: string; email?: string; careerId?: string },
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
         phone = COALESCE($2, phone),
         email = COALESCE($3, email),
         career_id = COALESCE($4, career_id),
         career_name = COALESCE($5, career_name)
       WHERE id = $6;`,
      [dto.fullName || null, dto.phone || null, dto.email || null, careerId, careerName, userId]
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
    dto: { photoUrl?: string | null; phone?: string; alias?: string },
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
    if (dto.phone !== undefined) {
      await pool.query(`UPDATE users SET phone = $1 WHERE id = $2;`, [dto.phone || '', userId]);
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

  public async toggleTeacherAvailability(id: string): Promise<TeacherAvailability> {
    const pool = await getPgPool();
    const cur = await pool.query('SELECT is_available FROM teacher_availability WHERE id = $1', [id]);
    if (cur.rows.length === 0) throw new Error('Disponibilidad no encontrada.');

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
    await pool.query('DELETE FROM teacher_availability WHERE id = $1', [id]);
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
  public async getTutorings(): Promise<Tutoring[]> {
    const pool = await getPgPool();
    const tutRes = await pool.query(
      `SELECT id, code, subject, details, reserv_date as "reservDate", request_date as "requestDate",
              modality, status, space, block, subject_course_id as "subjectCourseId",
              subject_course_name as "subjectCourseName", teacher_id as "teacherId",
              teacher_name as "teacherName", petitioner_student_id as "petitionerStudentId",
              petitioner_student_name as "petitionerStudentName", schedule_slot_id as "scheduleSlotId",
              schedule_label as "scheduleLabel", approved_by_id as "approvedById",
              approved_by_name as "approvedByName", start_time as "startTime",
              finish_time as "finishTime", score, student_comment as "studentComment",
              teacher_comment as "teacherComment", attachment_name as "attachmentName",
              attachment_url as "attachmentUrl", cancel_reason as "cancelReason", created_at as "createdAt"
       FROM tutorings
       ORDER BY created_at DESC;`
    );

    const asstRes = await pool.query(
      `SELECT id, tutoring_id as "tutoringId", student_id as "studentId",
              student_name as "studentName", student_account as "studentAccount",
              student_phone as "studentPhone", student_email as "studentEmail",
              is_petitioner as "isPetitioner", has_attended as "hasAttended",
              joined_at as "joinedAt"
       FROM tutoring_assistants;`
    );

    const assistantsByTutoring: { [key: string]: TutoringAssistant[] } = {};
    for (const a of asstRes.rows) {
      if (!assistantsByTutoring[a.tutoringId]) {
        assistantsByTutoring[a.tutoringId] = [];
      }
      assistantsByTutoring[a.tutoringId].push(a);
    }

    const rateRes = await pool.query(
      `SELECT id, tutoring_id as "tutoringId", student_id as "studentId",
              student_name as "studentName", score,
              student_comment as "studentComment", created_at as "createdAt"
       FROM tutoring_ratings;`
    );
    const ratingsByTutoring: { [key: string]: any[] } = {};
    for (const r of rateRes.rows) {
      if (!ratingsByTutoring[r.tutoringId]) {
        ratingsByTutoring[r.tutoringId] = [];
      }
      ratingsByTutoring[r.tutoringId].push(r);
    }

    return tutRes.rows.map((t) => ({
      ...t,
      assistants: assistantsByTutoring[t.id] || [],
      ratings: ratingsByTutoring[t.id] || []
    }));
  }

  public async getTutoringById(id: string): Promise<Tutoring | null> {
    const pool = await getPgPool();
    const tutRes = await pool.query(
      `SELECT id, code, subject, details, reserv_date as "reservDate", request_date as "requestDate",
              modality, status, space, block, cancel_reason as "cancelReason", subject_course_id as "subjectCourseId",
              subject_course_name as "subjectCourseName", teacher_id as "teacherId",
              teacher_name as "teacherName", petitioner_student_id as "petitionerStudentId",
              petitioner_student_name as "petitionerStudentName", schedule_slot_id as "scheduleSlotId",
              schedule_label as "scheduleLabel", approved_by_id as "approvedById",
              approved_by_name as "approvedByName", start_time as "startTime",
              finish_time as "finishTime", score, student_comment as "studentComment",
              teacher_comment as "teacherComment", attachment_name as "attachmentName",
              attachment_url as "attachmentUrl", created_at as "createdAt"
       FROM tutorings WHERE id = $1;`,
      [id]
    );
    if (tutRes.rows.length === 0) return null;
    const asstRes = await pool.query(
      `SELECT id, tutoring_id as "tutoringId", student_id as "studentId",
              student_name as "studentName", student_account as "studentAccount",
              student_phone as "studentPhone", student_email as "studentEmail",
              is_petitioner as "isPetitioner", has_attended as "hasAttended",
              joined_at as "joinedAt"
       FROM tutoring_assistants WHERE tutoring_id = $1;`,
      [id]
    );
    const oneRateRes = await pool.query(
      `SELECT id, tutoring_id as "tutoringId", student_id as "studentId",
              student_name as "studentName", score,
              student_comment as "studentComment", created_at as "createdAt"
       FROM tutoring_ratings WHERE tutoring_id = $1 ORDER BY created_at ASC;`,
      [id]
    );
    return { ...tutRes.rows[0], assistants: asstRes.rows, ratings: oneRateRes.rows };
  }

  public async createTutoring(dto: CreateTutoringDto, user: User): Promise<Tutoring> {
    const pool = await getPgPool();

    // Verify minimum 2 days advance notice (Business Rule 1)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reservDate = new Date(dto.reservDate + 'T00:00:00');
    const diffDays = (reservDate.getTime() - today.getTime()) / (1000 * 3600 * 24);

    if (diffDays < 2) {
      throw new Error('La fecha de la tutoría debe programarse con al menos 2 días de anticipación.');
    }

    // Verify teacher conflict (Business Rule 2)
    const conflict = await pool.query(
      `SELECT id FROM tutorings
       WHERE teacher_id = $1 AND reserv_date = $2 AND schedule_slot_id = $3 AND status != $4;`,
      [dto.teacherId, dto.reservDate, dto.scheduleSlotId, TutoringStatus.CANCELLED]
    );
    if (conflict.rows.length > 0) {
      throw new Error('El docente seleccionado ya tiene una tutoría programada en esa fecha y horario.');
    }

    // Verify teacher availability (Business Rule 4, conditional):
    // si el docente tiene disponibilidad registrada, la solicitud debe ajustarse a ella.
    const availCountRes = await pool.query(
      `SELECT COUNT(*) as count FROM teacher_availability WHERE teacher_id = $1;`,
      [dto.teacherId]
    );
    const teacherHasAvailability = parseInt(availCountRes.rows[0]?.count || '0', 10) > 0;
    if (teacherHasAvailability) {
      const availMatch = await pool.query(
        `SELECT id FROM teacher_availability
         WHERE teacher_id = $1 AND schedule_slot_id = $2 AND subject_course_id = $3 AND is_available = TRUE;`,
        [dto.teacherId, dto.scheduleSlotId, dto.subjectCourseId]
      );
      if (availMatch.rows.length === 0) {
        throw new Error('El docente seleccionado no tiene disponibilidad activa para esa franja horaria y asignatura.');
      }
    }

    // Get subject and slot labels
    const subjRes = await pool.query('SELECT name FROM subjects WHERE id = $1', [dto.subjectCourseId]);
    const slotRes = await pool.query('SELECT label FROM schedule_slots WHERE id = $1', [dto.scheduleSlotId]);
    const teacherRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [dto.teacherId]);

    const subjectName = subjRes.rows[0]?.name || 'Materia';
    const scheduleLabel = slotRes.rows[0]?.label || 'Horario';
    const teacherName = teacherRes.rows[0]?.full_name || 'Docente';

    // Código correlativo sin colisiones (MAX sufijo numérico + 1, no COUNT)
    const maxRes = await pool.query(
      `SELECT COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(code, '[^0-9]', '', 'g'), '') AS INT)), 0) AS maxcode FROM tutorings;`
    );
    const nextCodeNum = parseInt(maxRes.rows[0]?.maxcode ?? '0', 10) + 1;
    const code = `#${nextCodeNum}`;
    const id = `tut-${Date.now()}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    await pool.query(
      `INSERT INTO tutorings (id, code, subject, details, reserv_date, request_date, modality, status, space,
                              block, subject_course_id, subject_course_name, teacher_id, teacher_name,
                              petitioner_student_id, petitioner_student_name, schedule_slot_id, schedule_label,
                              attachment_name, attachment_url, score, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 0, $21);`,
      [
        id,
        code,
        dto.subject,
        dto.details,
        dto.reservDate,
        nowStr,
        dto.modality,
        TutoringStatus.PENDING,
        '',
        '',
        dto.subjectCourseId,
        subjectName,
        dto.teacherId,
        teacherName,
        user.id,
        user.fullName,
        dto.scheduleSlotId,
        scheduleLabel,
        dto.attachmentName || null,
        dto.attachmentUrl || null,
        nowStr
      ]
    );

    // Add petitioner as assistant
    const asstId = `asst-${Date.now()}`;
    await pool.query(
      `INSERT INTO tutoring_assistants (id, tutoring_id, student_id, student_name, student_account, student_phone, student_email, is_petitioner, has_attended, joined_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, false, $8);`,
      [asstId, id, user.id, user.fullName, user.account, user.phone, user.email, nowStr]
    );

    await this.logBinnacle(
      'Solicitud de Tutoría',
      `Estudiante ${user.fullName} solicitó tutoría ${code} (${subjectName})`,
      user.username
    );

    // Notify teachers/admin
    await this.addNotification(
      dto.teacherId,
      'Nueva Solicitud de Tutoría',
      `El estudiante ${user.fullName} ha solicitado una tutoría para la asignatura ${subjectName} en la fecha ${dto.reservDate}.`,
      id
    );

    return (await this.getTutoringById(id))!;
  }

  public async approveTutoring(tutoringId: string, space: string, approver: User, block: string = ''): Promise<Tutoring> {
    const pool = await getPgPool();
    const tut = await this.getTutoringById(tutoringId);
    if (!tut) throw new Error('Tutoría no encontrada.');

    if (approver.role === UserRole.TEACHER && approver.id !== tut.teacherId) {
      throw new Error('Un docente solo puede aprobar las tutorías que le han sido asignadas.');
    }

    const cleanBlock = (block || '').trim();
    if (tut.modality === 0 && cleanBlock.length === 0) {
      throw new Error('Debe ingresar el bloque/edificio del aula para la tutoría presencial.');
    }

    // Presencial conflict validation (Business Rule 3): mismo salón + bloque, fecha y franja
    if (tut.modality === 0) {
      const conflictRes = await pool.query(
        `SELECT id, code, teacher_name FROM tutorings
         WHERE reserv_date = $1
           AND schedule_slot_id = $2
           AND LOWER(space) = LOWER($3)
           AND COALESCE(LOWER(block), '') = LOWER($4)
           AND id != $5
           AND status IN ($6, $7);`,
        [tut.reservDate, tut.scheduleSlotId, space, cleanBlock, tutoringId, TutoringStatus.APPROVED, TutoringStatus.IN_PROGRESS]
      );
      if (conflictRes.rows.length > 0) {
        throw new Error(`Conflicto de Aula: El espacio "${space}" (Bloque ${cleanBlock}) ya está reservado para esa franja horaria.`);
      }

      const sectionRes = await pool.query('SELECT capacity FROM sections WHERE name = $1;', [space]);
      const capacity = parseInt(sectionRes.rows[0]?.capacity ?? '0', 10);
      if (capacity > 0) {
        const countRes = await pool.query(
          'SELECT COUNT(*) as count FROM tutoring_assistants WHERE tutoring_id = $1;',
          [tutoringId]
        );
        const current = parseInt(countRes.rows[0]?.count ?? '0', 10);
        if (current > capacity) {
          throw new Error(`El cupo de "${space}" es de ${capacity} participantes y esta tutoría ya cuenta con ${current}.`);
        }
      }
    }

    const placeLabel = tut.modality === 0 && cleanBlock ? `${space} (Bloque ${cleanBlock})` : space;
    await pool.query(
      `UPDATE tutorings SET status = $1, space = $2, block = $3, approved_by_id = $4, approved_by_name = $5 WHERE id = $6;`,
      [TutoringStatus.APPROVED, space, tut.modality === 0 ? cleanBlock : '', approver.id, approver.fullName, tutoringId]
    );

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

    const isPetitioner = user.id === tut.petitionerStudentId;
    const isAdmin = user.role === UserRole.ADMIN;
    const isAssignedTeacher = user.role === UserRole.TEACHER && user.id === tut.teacherId;

    if (!isPetitioner && !isAdmin && !isAssignedTeacher) {
      throw new Error('No tiene permisos para cancelar esta tutoría.');
    }

    if (!reason || reason.trim().length < 4) {
      throw new Error('Debe indicar un motivo de cancelación detallado.');
    }

    // Máquina de estados: solo PENDING/APPROVED pueden cancelarse
    if (tut.status !== TutoringStatus.PENDING && tut.status !== TutoringStatus.APPROVED) {
      throw new Error('Solo se pueden cancelar tutorías pendientes o programadas.');
    }

    await pool.query(
      `UPDATE tutorings SET status = $1, cancel_reason = $2 WHERE id = $3;`,
      [TutoringStatus.CANCELLED, reason.trim(), tutoringId]
    );

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
    await pool.query(
      `UPDATE tutorings SET status = $1, start_time = $2 WHERE id = $3;`,
      [TutoringStatus.IN_PROGRESS, startTime, tutoringId]
    );

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
    await pool.query(
      `UPDATE tutorings SET status = $1, finish_time = $2, teacher_comment = $3 WHERE id = $4;`,
      [TutoringStatus.COMPLETED, finishTime, teacherComment || null, tutoringId]
    );

    await this.logBinnacle(
      'Finalización de Tutoría',
      `Docente ${teacher.fullName} finalizó la tutoría ${tut.code}`,
      teacher.username
    );

    await this.addNotification(
      tut.petitionerStudentId,
      'Califica tu Tutoría',
      `La tutoría ${tut.code} ha finalizado. Por favor ingresa para calificar la sesión.`
    );

    return (await this.getTutoringById(tutoringId))!;
  }

  public async joinTutoring(tutoringId: string, student: User): Promise<Tutoring> {
    const pool = await getPgPool();
    const tut = await this.getTutoringById(tutoringId);
    if (!tut) throw new Error('Tutoría no encontrada.');

    // Regla grupal: solo estudiantes de la misma carrera y semestre de la materia.
    const subjRes = await pool.query(
      'SELECT career_id as "careerId", semester FROM subjects WHERE id = $1;',
      [tut.subjectCourseId]
    );
    const subj = subjRes.rows[0];
    if (subj?.careerId && student.careerId && subj.careerId !== student.careerId) {
      throw new Error('Solo pueden unirse estudiantes de la misma carrera de la materia.');
    }
    if (
      subj?.semester &&
      student.semester &&
      Number(subj.semester) !== Number(student.semester)
    ) {
      throw new Error(`Solo pueden unirse estudiantes del semestre ${subj.semester} de la materia.`);
    }

    const existing = await pool.query(
      'SELECT id FROM tutoring_assistants WHERE tutoring_id = $1 AND student_id = $2;',
      [tutoringId, student.id]
    );
    if (existing.rows.length > 0) {
      throw new Error('Ya estás registrado en esta tutoría.');
    }

    // Business Rule 5: no superar el cupo (capacidad del aula) en tutorías presenciales.
    if (tut.modality === TutoringModality.PRESENCIAL && tut.space) {
      const sectionRes = await pool.query('SELECT capacity FROM sections WHERE name = $1;', [tut.space]);
      const capacity = parseInt(sectionRes.rows[0]?.capacity ?? '0', 10);
      if (capacity > 0) {
        const countRes = await pool.query(
          'SELECT COUNT(*) as count FROM tutoring_assistants WHERE tutoring_id = $1;',
          [tutoringId]
        );
        const current = parseInt(countRes.rows[0]?.count ?? '0', 10);
        if (current >= capacity) {
          throw new Error(`El cupo de esta tutoría está completo (máximo ${capacity} participantes).`);
        }
      }
    }

    const asstId = `asst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    await pool.query(
      `INSERT INTO tutoring_assistants (id, tutoring_id, student_id, student_name, student_account, student_phone, student_email, is_petitioner, has_attended, joined_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, false, $8);`,
      [asstId, tutoringId, student.id, student.fullName, student.account, student.phone, student.email, nowStr]
    );

    await this.logBinnacle(
      'Inscripción a Tutoría',
      `Estudiante ${student.fullName} se unió a la tutoría ${tut.code}`,
      student.username
    );

    return (await this.getTutoringById(tutoringId))!;
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
      'SELECT 1 FROM tutoring_assistants WHERE tutoring_id = $1 AND student_id = $2;',
      [dto.tutoringId, student.id]
    );
    if (partRes.rows.length === 0) {
      throw new Error('Solo los participantes de esta tutoría pueden evaluarla.');
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
