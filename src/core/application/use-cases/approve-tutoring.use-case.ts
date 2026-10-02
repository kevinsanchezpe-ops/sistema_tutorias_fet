import { BusinessRuleException, ScheduleConflictService } from '../../domain/services/schedule-conflict.service';
import { TutoringStateMachineService } from '../../domain/services/state-machine.service';
import { db } from '../../infrastructure/database/database';
import { Tutoring, TutoringModality, TutoringStatus, User, UserRole } from '../../types';

export interface ApproveTutoringDto {
  tutoringId: string;
  space: string; // Aula física escrita manualmente (e.g. "Aula 25") o Enlace URL (e.g. "https://meet.google.com/xyz")
  block?: string; // Bloque/edificio escrito manualmente en presenciales (e.g. "B2")
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

      // Regla de cupo: la sección asignada debe tener capacidad para los participantes ya inscritos.
      const section = db.sections.find((s) => s.name.toLowerCase() === dto.space.trim().toLowerCase());
      if (section && section.capacity > 0 && tutoring.assistants.length > section.capacity) {
        throw new BusinessRuleException(
          `El cupo de "${dto.space.trim()}" es de ${section.capacity} participantes y esta tutoría ya cuenta con ${tutoring.assistants.length}.`,
          'CAPACITY_EXCEEDED'
        );
      }
    }

    tutoring.status = TutoringStatus.APPROVED;
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
      `Su solicitud de tutoría con asunto "${tutoring.subject}" fue aprobada por ${approver.alias || approver.fullName} para el día ${tutoring.reservDate} en el horario ${tutoring.scheduleLabel}. Impartida en: ${placeLabel}`
    );

    // Si quien aprueba es administrador, notificar al docente asignado
    if (approver.role === UserRole.ADMIN) {
      db.addNotification(
        tutoring.teacherId,
        'Solicitud Asignada',
        `Se le ha programado la tutoría con asunto "${tutoring.subject}", para el día ${tutoring.reservDate} en el horario ${tutoring.scheduleLabel}. Impartida en: ${placeLabel}`
      );
    }

    db.notify();
    return tutoring;
  }
}
