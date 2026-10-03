import { BusinessRuleException } from '../../domain/services/schedule-conflict.service';
import { db } from '../../infrastructure/database/database';
import { getCareerById, getDefaultCareer } from '../../infrastructure/database/careers-data';
import { TeacherAvailability, User, UserRole } from '../../types';

export interface RegisterTeacherDto {
  fullName: string;
  email: string;
  account: string; // e.g., DOC-10452
  username: string;
  careerId?: string;
  campusId?: string;
  subjectIds?: string[]; // optional: subjects they can teach (can configure inside system)
  scheduleSlotIds?: string[]; // optional: initial availability slots
  password?: string;
}

export class RegisterTeacherUseCase {
  public static execute(dto: RegisterTeacherDto): User {
    if (!dto.fullName || dto.fullName.trim().length < 8) {
      throw new BusinessRuleException(
        'El nombre completo del docente debe tener al menos 8 caracteres.',
        'INVALID_NAME'
      );
    }

    if (!dto.email || !dto.email.includes('@')) {
      throw new BusinessRuleException(
        'El correo institucional del docente es obligatorio y debe ser válido.',
        'INVALID_EMAIL'
      );
    }

    if (!dto.account || dto.account.trim().length < 4) {
      throw new BusinessRuleException(
        'El código de docente / carnet institucional es obligatorio (mínimo 4 caracteres).',
        'INVALID_ACCOUNT'
      );
    }

    const usernameLower = dto.username.toLowerCase().trim();
    if (usernameLower.length < 3) {
      throw new BusinessRuleException(
        'El nombre de usuario debe contener al menos 3 caracteres.',
        'INVALID_USERNAME'
      );
    }

    if (db.users.some((u) => u.username.toLowerCase() === usernameLower)) {
      throw new BusinessRuleException(
        'El nombre de usuario ya está registrado en el sistema.',
        'USERNAME_TAKEN'
      );
    }

    if (db.users.some((u) => u.account === dto.account.trim())) {
      throw new BusinessRuleException(
        'El código de docente ya se encuentra asignado a otro usuario.',
        'ACCOUNT_TAKEN'
      );
    }

    const nameParts = dto.fullName.trim().split(' ');
    const alias = nameParts.length >= 2 ? `${nameParts[0]} ${nameParts[1]}` : dto.fullName;

    const careerId = dto.careerId || getDefaultCareer().id;
    const career = getCareerById(careerId);
    if (dto.careerId && !career) {
      throw new BusinessRuleException('La carrera seleccionada no es válida.', 'INVALID_CAREER');
    }

    const newTeacherId = `usr-teacher-${Date.now()}`;
    const newTeacher: User = {
      id: newTeacherId,
      username: usernameLower,
      fullName: dto.fullName.trim(),
      alias,
      email: dto.email.trim(),
      role: UserRole.TEACHER,
      account: dto.account.trim(),
      campusId: dto.campusId || 'cmp-1',
      campusName: 'Sede Única',
      careerId,
      careerName: career?.name || getDefaultCareer().name,
      birthDate: '1985-06-15',
      admissionDate: new Date().toISOString().split('T')[0],
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0]
    };

    db.users.push(newTeacher);

    // Create availability records if subjects were provided (e.g. from admin form)
    if (dto.subjectIds && dto.subjectIds.length > 0) {
      const slotsToAssign =
        dto.scheduleSlotIds && dto.scheduleSlotIds.length > 0
          ? dto.scheduleSlotIds
          : db.scheduleSlots.slice(0, 3).map((s) => s.id);

      dto.subjectIds.forEach((subId) => {
        const subject = db.subjects.find((s) => s.id === subId);
        if (!subject) return;

        slotsToAssign.forEach((slotId) => {
          const slot = db.scheduleSlots.find((s) => s.id === slotId);
          if (!slot) return;

          const avail: TeacherAvailability = {
            id: `avail-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            teacherId: newTeacher.id,
            teacherName: newTeacher.fullName,
            subjectCourseId: subject.id,
            subjectCourseName: subject.name,
            scheduleSlotId: slot.id,
            scheduleLabel: slot.label,
            isAvailable: true
          };
          db.teacherAvailability.push(avail);
        });
      });
    }

    db.logBinnacle(
      'Registro Docente',
      `Nuevo docente incorporado: ${newTeacher.fullName} (${newTeacher.account})${
        dto.subjectIds && dto.subjectIds.length > 0
          ? ` con ${dto.subjectIds.length} materias asignadas`
          : ' (configurará su disponibilidad en su panel)'
      }`,
      newTeacher.username
    );

    db.notify();
    return newTeacher;
  }
}
