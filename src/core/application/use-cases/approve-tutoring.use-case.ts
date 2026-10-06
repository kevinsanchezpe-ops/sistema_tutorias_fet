import { BusinessRuleException, ScheduleConflictService } from '../../domain/services/schedule-conflict.service';
import { TutoringStateMachineService } from '../../domain/services/state-machine.service';
import { db } from '../../infrastructure/database/database';
import { Tutoring, TutoringModality, TutoringStatus, TutoringType, User, UserRole } from '../../types';

export interface ApproveTutoringDto {
  tutoringId: string;
  space: string; // Aula física escrita manualmente (e.g. "Aula 25") o Enlace URL (e.g. "https://meet.google.com/xyz")
  block?: string; // Bloque/edificio escrito manualmente en presenciales (e.g. "B2")
  maxParticipants?: number;
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
    const group = (tutoring.type || TutoringType.GROUP) === TutoringType.GROUP;
    if (group && (!Number.isInteger(dto.maxParticipants) || Number(dto.maxParticipants) < Math.max(2, tutoring.assistants.length))) {
      throw new BusinessRuleException('Indique un cupo grupal que incluya a los participantes ya inscritos.', 'INVALID_CAPACITY');
    }

    const block = (dto.block || '').trim();
    if (tutoring.modality === TutoringModality.PRESENCIAL && block.length === 0) {
      throw new BusinessRuleException(
        'Debe ingresar el bloque/edificio del aula para la tutoría presencial.',
        'BLOCK_REQUIRED'
      );
    }

    // Si es presencial, validar que el aula + bloque no esté ocupada en la misma fecha y horario
    if (tutoring.modality === TutoringModality.PRESENCIAL) {
      ScheduleConflictService.validateSectionState(
        dto.space.trim(),
        tutoring.reservDate,
        tutoring.scheduleSlotId,
        tutoring.modality,
        db.tutorings,
        tutoring.id,
        block
      );

    }

    tutoring.status = TutoringStatus.APPROVED;
    tutoring.maxParticipants = group ? Number(dto.maxParticipants) : 1;
    tutoring.space = dto.space.trim();
    tutoring.block = tutoring.modality === TutoringModality.PRESENCIAL ? block : '';
    tutoring.approvedById = approver.id;
    tutoring.approvedByName = approver.alias || approver.fullName;

    const approverRoleLabel = approver.role === UserRole.ADMIN ? 'Administrador' : 'Docente';

    const placeLabel =
      tutoring.modality === TutoringModality.PRESENCIAL && tutoring.block
        ? `${tutoring.space} (Bloque ${tutoring.block})`
        : tutoring.space;

    // Bitácora
    db.logBinnacle(
      'Aprobación',
      `${approverRoleLabel} ${approver.username} aprobó la tutoría ${tutoring.code} asignando '${placeLabel}'`,
      approver.username
    );

    // Notificación al estudiante solicitante
    db.addNotification(
      tutoring.petitionerStudentId,
      'Solicitud Aprobada',
      `Su solicitud de tutoría con asunto "${tutoring.subject}" fue aprobada por ${approver.alias || approver.fullName} para el día ${tutoring.reservDate} en el horario ${tutoring.scheduleLabel}. Impartida en: ${placeLabel}`,
      tutoring.id
    );

    // Si quien aprueba es administrador, notificar al docente asignado
    if (approver.role === UserRole.ADMIN) {
      db.addNotification(
        tutoring.teacherId,
        'Solicitud Asignada',
        `Se le ha programado la tutoría con asunto "${tutoring.subject}", para el día ${tutoring.reservDate} en el horario ${tutoring.scheduleLabel}. Impartida en: ${placeLabel}`,
        tutoring.id
      );
    }

    db.notify();
    return tutoring;
  }
}
