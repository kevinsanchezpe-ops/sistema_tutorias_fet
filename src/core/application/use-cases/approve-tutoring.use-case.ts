import { BusinessRuleException, ScheduleConflictService } from '../../domain/services/schedule-conflict.service';
import { TutoringStateMachineService } from '../../domain/services/state-machine.service';
import { db } from '../../infrastructure/database/database';
import { Tutoring, TutoringModality, TutoringStatus, User, UserRole } from '../../types';

export interface ApproveTutoringDto {
  tutoringId: string;
  space: string; // Aula física (e.g. "Laboratorio 1") o Enlace URL (e.g. "https://meet.google.com/xyz")
}

export class ApproveTutoringUseCase {
  public static execute(dto: ApproveTutoringDto, approver: User): Tutoring {
    if (approver.role !== UserRole.ADMIN && approver.role !== UserRole.TEACHER) {
      throw new BusinessRuleException('Solo los administradores o docentes tutores pueden aprobar tutorías.', 'UNAUTHORIZED_ROLE');
    }

    const tutoring = db.tutorings.find((t) => t.id === dto.tutoringId);
    if (!tutoring) {
      throw new BusinessRuleException('La tutoría solicitada no existe.', 'NOT_FOUND');
    }

    // Si quien aprueba es docente, debe ser el docente asignado a la tutoría
    if (approver.role === UserRole.TEACHER && tutoring.teacherId !== approver.id) {
      throw new BusinessRuleException('Solo puede aprobar tutorías en las que usted sea el docente asignado.', 'UNAUTHORIZED_TEACHER');
    }

    // Validar máquina de estados (-1 a 1)
    TutoringStateMachineService.ensureValidTransition(tutoring.status, TutoringStatus.APPROVED);

    if (!dto.space || dto.space.trim().length === 0) {
      throw new BusinessRuleException(
        tutoring.modality === TutoringModality.PRESENCIAL
          ? 'Debe asignar un aula o sección para la tutoría presencial.'
          : 'Debe ingresar el enlace de la reunión virtual.',
        'SPACE_REQUIRED'
      );
    }

    // Si es presencial, validar que el aula no esté ocupada en la misma fecha y bloque horario
    if (tutoring.modality === TutoringModality.PRESENCIAL) {
      ScheduleConflictService.validateSectionState(
        dto.space.trim(),
        tutoring.reservDate,
        tutoring.scheduleSlotId,
        tutoring.modality,
        db.tutorings,
        tutoring.id
      );
    }

    tutoring.status = TutoringStatus.APPROVED;
    tutoring.space = dto.space.trim();
    tutoring.approvedById = approver.id;
    tutoring.approvedByName = approver.alias || approver.fullName;

    const approverRoleLabel = approver.role === UserRole.ADMIN ? 'Administrador' : 'Docente';

    // Bitácora
    db.logBinnacle(
      'Aprobación',
      `${approverRoleLabel} ${approver.username} aprobó la tutoría ${tutoring.code} asignando '${tutoring.space}'`,
      approver.username
    );

    // Notificación al estudiante solicitante
    db.addNotification(
      tutoring.petitionerStudentId,
      'Solicitud Aprobada',
      `Su solicitud de tutoría con asunto "${tutoring.subject}" fue aprobada por ${approver.alias || approver.fullName} para el día ${tutoring.reservDate} en el horario ${tutoring.scheduleLabel}. Impartida en: ${tutoring.space}`
    );

    // Si quien aprueba es administrador, notificar al docente asignado
    if (approver.role === UserRole.ADMIN) {
      db.addNotification(
        tutoring.teacherId,
        'Solicitud Asignada',
        `Se le ha programado la tutoría con asunto "${tutoring.subject}", para el día ${tutoring.reservDate} en el horario ${tutoring.scheduleLabel}. Impartida en: ${tutoring.space}`
      );
    }

    db.notify();
    return tutoring;
  }
}
