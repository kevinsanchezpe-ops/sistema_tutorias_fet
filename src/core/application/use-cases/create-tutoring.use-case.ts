import { BusinessRuleException, ScheduleConflictService } from '../../domain/services/schedule-conflict.service';
import { db } from '../../infrastructure/database/database';
import { Tutoring, TutoringModality, TutoringStatus, User, UserRole } from '../../types';

export interface CreateTutoringDto {
  subject: string;
  details: string;
  reservDate: string; // YYYY-MM-DD
  scheduleSlotId: string;
  subjectCourseId: string;
  teacherId: string;
  modality: TutoringModality;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
}

export class CreateTutoringUseCase {
  public static execute(dto: CreateTutoringDto, petitioner: User): Tutoring {
    if (petitioner.role !== UserRole.STUDENT) {
      throw new BusinessRuleException('Solo los estudiantes pueden solicitar una tutoría.', 'UNAUTHORIZED_ROLE');
    }

    if (!dto.subject || dto.subject.trim().length < 3) {
      throw new BusinessRuleException('El asunto o tema es obligatorio (mínimo 3 caracteres).', 'INVALID_SUBJECT');
    }

    if (!dto.details || dto.details.trim().length < 5) {
      throw new BusinessRuleException('El detalle o explicación es obligatorio.', 'INVALID_DETAILS');
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

    const teacher = db.users.find((u) => u.id === dto.teacherId && u.role === UserRole.TEACHER);
    if (!teacher) {
      throw new BusinessRuleException('El docente seleccionado no existe o no está habilitado.', 'NOT_FOUND_TEACHER');
    }

    // 3. Regla de conflicto de docente en la misma fecha y bloque
    ScheduleConflictService.validateTeacherScheduleConflict(
      dto.teacherId,
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
          a.teacherId === dto.teacherId &&
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

    const newId = `tut-${Date.now()}`;
    const codeNumber = db.tutorings.length + 15;

    const newTutoring: Tutoring = {
      id: newId,
      code: `#${codeNumber}`,
      subject: dto.subject.trim(),
      details: dto.details.trim(),
      reservDate: dto.reservDate,
      requestDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      modality: dto.modality,
      status: TutoringStatus.PENDING,
      space: dto.modality === TutoringModality.VIRTUAL ? 'Pendiente enlace virtual' : 'Pendiente aula',
      subjectCourseId: course.id,
      subjectCourseName: course.name,
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      petitionerStudentId: petitioner.id,
      petitionerStudentName: petitioner.fullName,
      scheduleSlotId: slot.id,
      scheduleLabel: slot.label,
      score: 0,
      attachmentName: dto.attachmentName || null,
      assistants: [
        {
          id: `ast-${Date.now()}`,
          tutoringId: newId,
          studentId: petitioner.id,
          studentName: petitioner.fullName,
          studentAccount: petitioner.account,
          studentPhone: petitioner.phone,
          studentEmail: petitioner.email,
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
      'Solicitud',
      `Estudiante ${petitioner.fullName} solicitó la tutoría ${newTutoring.code} sobre '${newTutoring.subject}'`,
      petitioner.username
    );

    // Notificar a administradores
    db.users
      .filter((u) => u.role === UserRole.ADMIN)
      .forEach((admin) => {
        db.addNotification(
          admin.id,
          'Nueva Solicitud de Tutoría',
          `Se ha recibido la solicitud ${newTutoring.code} para '${course.name}' el ${dto.reservDate}.`
        );
      });

    db.notify();
    return newTutoring;
  }
}
