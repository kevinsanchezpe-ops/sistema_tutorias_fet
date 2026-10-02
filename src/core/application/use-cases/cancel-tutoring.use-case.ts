import { BusinessRuleException } from '../../domain/services/schedule-conflict.service';
import { TutoringStateMachineService } from '../../domain/services/state-machine.service';
import { db } from '../../infrastructure/database/database';
import { Tutoring, TutoringStatus, User, UserRole } from '../../types';

export interface CancelTutoringDto {
  tutoringId: string;
  reason: string;
}

export class CancelTutoringUseCase {
  public static execute(dto: CancelTutoringDto, user: User): Tutoring {
    const tutoring = db.tutorings.find((t) => t.id === dto.tutoringId);
    if (!tutoring) {
      throw new BusinessRuleException('La tutoría solicitada no existe.', 'NOT_FOUND');
    }

    // Admin, docente asignado o el estudiante solicitante pueden cancelar/rechazar
    const isOwner = user.role === UserRole.STUDENT && user.id === tutoring.petitionerStudentId;
    const isAdmin = user.role === UserRole.ADMIN;
    const isTeacher = user.role === UserRole.TEACHER && user.id === tutoring.teacherId;

    if (!isOwner && !isAdmin && !isTeacher) {
      throw new BusinessRuleException('No tiene permisos para cancelar o rechazar esta tutoría.', 'FORBIDDEN');
    }

    if (!dto.reason || dto.reason.trim().length < 4) {
      throw new BusinessRuleException('Debe indicar un motivo de cancelación detallado.', 'REASON_REQUIRED');
    }

    if (tutoring.status === TutoringStatus.CANCELLED) {
      throw new BusinessRuleException('La tutoría ya se encuentra cancelada.', 'ALREADY_CANCELLED');
    }

    // Validar transición hacia CANCELLED
    TutoringStateMachineService.ensureValidTransition(tutoring.status, TutoringStatus.CANCELLED);

    tutoring.status = TutoringStatus.CANCELLED;
    tutoring.cancelReason = dto.reason.trim();

    // Bitácora
    db.logBinnacle(
      'Cancelación',
      `Tutoría ${tutoring.code} cancelada por ${user.fullName}. Motivo: ${dto.reason.trim()}`,
      user.username
    );

    // Notificar al estudiante si canceló el admin
    if (isAdmin) {
      db.addNotification(
        tutoring.petitionerStudentId,
        'Solicitud Cancelada',
        `La solicitud con asunto: ${tutoring.subject}, fue cancelada a razón de: ${dto.reason.trim()}`
      );
    }

    // Notificar al docente si ya estaba asignado o aprobado
    db.addNotification(
      tutoring.teacherId,
      'Tutoría Cancelada',
      `La tutoría con asunto: ${tutoring.subject} programada para el ${tutoring.reservDate} ha sido cancelada. Motivo: ${dto.reason.trim()}`
    );

    db.notify();
    return tutoring;
  }
}
