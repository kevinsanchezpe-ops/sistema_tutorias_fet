import { BusinessRuleException, ScheduleConflictService } from '../../domain/services/schedule-conflict.service';
import { db } from '../../infrastructure/database/database';
import { Tutoring, TutoringModality, TutoringStatus, TutoringType, User, UserRole } from '../../types';

export interface CreateTutoringDto {
  subject: string;
  details: string;
  reservDate: string; // YYYY-MM-DD
  scheduleSlotId: string;
  subjectCourseId: string;
  teacherId: string;
  modality: TutoringModality;
  type: TutoringType;
  targetStudentId?: string;
  space?: string;
  block?: string;
  maxParticipants?: number;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
}

export class CreateTutoringUseCase {
  public static execute(dto: CreateTutoringDto, petitioner: User): Tutoring {
    const isTeacherRequest = petitioner.role === UserRole.TEACHER;
    const isDirectedTeacherRequest = isTeacherRequest && dto.type === TutoringType.INDIVIDUAL && Boolean(dto.targetStudentId);
    if (petitioner.role !== UserRole.STUDENT && !(isTeacherRequest && (dto.type === TutoringType.GROUP || dto.type === TutoringType.INDIVIDUAL))) {
      throw new BusinessRuleException('Solicitud de tutoría no permitida para este usuario.', 'UNAUTHORIZED_ROLE');
    }
    if (isTeacherRequest && dto.type === TutoringType.INDIVIDUAL && !dto.targetStudentId) {
      throw new BusinessRuleException('Selecciona el estudiante al que se dirige la tutoría.', 'TARGET_STUDENT_REQUIRED');
    }
    if (!isTeacherRequest && dto.targetStudentId) {
      throw new BusinessRuleException('Solo un docente puede dirigir una tutoría a un estudiante.', 'FORBIDDEN_TARGET_STUDENT');
    }

    if (!dto.subject || dto.subject.trim().length < 3) {
      throw new BusinessRuleException('El asunto o tema es obligatorio (mínimo 3 caracteres).', 'INVALID_SUBJECT');
    }

    if (!dto.details || dto.details.trim().length < 5) {
      throw new BusinessRuleException('El detalle o explicación es obligatorio.', 'INVALID_DETAILS');
    }
    if (dto.type !== TutoringType.INDIVIDUAL && dto.type !== TutoringType.GROUP) {
      throw new BusinessRuleException('Debe elegir si la tutoría será individual o grupal.', 'INVALID_TUTORING_TYPE');
    }

    // 1. Regla de negocio original: Mínimo 2 días de anticipación
    ScheduleConflictService.validateReservationDate(dto.reservDate);

    // 2. Validar que la materia y el horario existan
    const course = db.subjects.find((s) => s.id === dto.subjectCourseId);
    if (!course) {
      throw new BusinessRuleException('La asignatura seleccionada no existe.', 'NOT_FOUND_COURSE');
    }

    const slot = db.scheduleSlots.find((s) => s.id === dto.scheduleSlotId);
    if (!slot) {
      throw new BusinessRuleException('La franja horaria seleccionada no es válida.', 'NOT_FOUND_SLOT');
    }

    const teacherId = isTeacherRequest ? petitioner.id : dto.teacherId;
    const teacher = db.users.find((u) => u.id === teacherId && u.role === UserRole.TEACHER);
    if (!teacher) {
      throw new BusinessRuleException('El docente seleccionado no existe o no está habilitado.', 'NOT_FOUND_TEACHER');
    }

    const targetStudent = isDirectedTeacherRequest
      ? db.users.find((u) => u.id === dto.targetStudentId && u.role === UserRole.STUDENT && u.isActive)
      : undefined;
    if (isDirectedTeacherRequest && !targetStudent) {
      throw new BusinessRuleException('El estudiante seleccionado no existe o está inactivo.', 'NOT_FOUND_STUDENT');
    }
    if (targetStudent && course.careerId && targetStudent.careerId !== course.careerId) {
      throw new BusinessRuleException('El estudiante no pertenece a la carrera de la asignatura.', 'STUDENT_CAREER_MISMATCH');
    }
    if (targetStudent && course.semester && Number(course.semester) > 0 && Number(targetStudent.semester) !== Number(course.semester)) {
      throw new BusinessRuleException(`El estudiante debe pertenecer al semestre ${course.semester} de la asignatura.`, 'STUDENT_SEMESTER_MISMATCH');
    }

    // 3. Regla de conflicto de docente en la misma fecha y bloque
    ScheduleConflictService.validateTeacherScheduleConflict(
      teacherId,
      dto.reservDate,
      dto.scheduleSlotId,
      db.tutorings
    );

    // 4. Regla de disponibilidad del docente (condicional): si el docente tiene
    // disponibilidad registrada, la solicitud debe ajustarse a una franja/asignatura activa.
    const teacherHasAvailability = db.teacherAvailability.some((a) => a.teacherId === dto.teacherId);
    if (teacherHasAvailability) {
      const matchesAvailability = db.teacherAvailability.some(
        (a) =>
          a.teacherId === teacherId &&
          a.scheduleSlotId === dto.scheduleSlotId &&
          a.subjectCourseId === dto.subjectCourseId &&
          a.isAvailable
      );
      if (!matchesAvailability) {
        throw new BusinessRuleException(
          'El docente seleccionado no tiene disponibilidad activa para esa franja horaria y asignatura.',
          'TEACHER_UNAVAILABLE'
        );
      }
    }

    if (isTeacherRequest) {
      if (!dto.space?.trim()) throw new BusinessRuleException('Asigna el aula o enlace antes de publicar.', 'SPACE_REQUIRED');
      if (dto.modality === TutoringModality.PRESENCIAL && !dto.block?.trim()) {
        throw new BusinessRuleException('Indica el bloque o edificio del aula.', 'BLOCK_REQUIRED');
      }
      if (dto.modality === TutoringModality.PRESENCIAL) {
        ScheduleConflictService.validateSectionState(
          dto.space.trim(), dto.reservDate, dto.scheduleSlotId, dto.modality, db.tutorings, undefined, dto.block
        );
      }
      if (dto.modality === TutoringModality.VIRTUAL) {
        try {
          const meetingUrl = new URL(dto.space || '');
          if (!['http:', 'https:'].includes(meetingUrl.protocol)) throw new Error();
        } catch {
          throw new BusinessRuleException('Ingresa un enlace virtual válido.', 'INVALID_MEETING_URL');
        }
      }
    }

    const newId = `tut-${Date.now()}`;
    // Código correlativo sin colisiones (MAX sufijo numérico + 1, no length)
    const codeNumber =
      db.tutorings.reduce((max, t) => {
        const n = parseInt(String(t.code).replace(/[^0-9]/g, ''), 10);
        return Number.isFinite(n) && n > max ? n : max;
      }, 0) + 1;

    const recipient = targetStudent || petitioner;
    const newTutoring: Tutoring = {
      id: newId,
      code: `#${codeNumber}`,
      subject: dto.subject.trim(),
      details: dto.details.trim(),
      reservDate: dto.reservDate,
      requestDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      modality: dto.modality,
      type: dto.type,
      maxParticipants: dto.type === TutoringType.GROUP ? null : 1,
      status: isTeacherRequest ? TutoringStatus.APPROVED : TutoringStatus.PENDING,
      space: isTeacherRequest ? (dto.space || '').trim() : dto.modality === TutoringModality.VIRTUAL ? 'Pendiente enlace virtual' : 'Pendiente aula',
      block: isTeacherRequest && dto.modality === TutoringModality.PRESENCIAL ? dto.block!.trim() : '',
      subjectCourseId: course.id,
      subjectCourseName: course.name,
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      createdByUserId: petitioner.id,
      createdByName: petitioner.fullName,
      createdByRole: petitioner.role,
      creatorRole: petitioner.role,
      approvedById: isTeacherRequest ? petitioner.id : undefined,
      approvedByName: isTeacherRequest ? (petitioner.alias || petitioner.fullName) : undefined,
      petitionerStudentId: recipient.id,
      petitionerStudentName: recipient.fullName,
      scheduleSlotId: slot.id,
      scheduleLabel: slot.label,
      score: 0,
      ratings: [],
      attachmentName: dto.attachmentName || null,
      assistants: [
        {
          id: `ast-${Date.now()}`,
          tutoringId: newId,
          studentId: recipient.id,
          studentName: recipient.fullName,
          studentAccount: recipient.account,
          studentEmail: recipient.email,
          isPetitioner: true,
          hasAttended: false,
          joinedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        }
      ],
      createdAt: new Date().toISOString()
    };

    db.tutorings.unshift(newTutoring);

    // Auditoría en bitácora
    db.logBinnacle(
      isTeacherRequest ? (targetStudent ? 'Tutoría dirigida' : 'Convocatoria de Tutoría') : 'Solicitud',
      isTeacherRequest
        ? targetStudent ? `Docente ${petitioner.fullName} programó tutoría ${newTutoring.code} para ${targetStudent.fullName}` : `Docente ${petitioner.fullName} convocó tutoría grupal ${newTutoring.code}`
        : `Estudiante ${petitioner.fullName} solicitó la tutoría ${newTutoring.code} sobre '${newTutoring.subject}'`,
      petitioner.username
    );

    // Notificar a administradores
    db.users
      .filter((u) => u.role === UserRole.ADMIN)
      .forEach((admin) => {
        db.addNotification(
          admin.id,
          'Nueva Solicitud de Tutoría',
          `Se ha recibido la solicitud ${newTutoring.code} para '${course.name}' el ${dto.reservDate}.`,
          newTutoring.id
        );
      });

    if (targetStudent) {
      db.addNotification(
        targetStudent.id,
        'Tutoría programada por tu docente',
        `El docente ${petitioner.fullName} programó la tutoría ${newTutoring.code} de ${course.name} para el ${dto.reservDate} a las ${slot.label}.`,
        newTutoring.id
      );
    }

    db.notify();
    return newTutoring;
  }
}
