import { BusinessRuleException } from '../../domain/services/schedule-conflict.service';
import { db } from '../../infrastructure/database/database';
import { Tutoring, TutoringStatus, User, UserRole } from '../../types';

export interface AssistanceRecordItem {
  assistantId: string;
  hasAttended: boolean;
}

export class RecordAssistanceUseCase {
  public static execute(
    tutoringId: string,
    records: AssistanceRecordItem[],
    teacher: User
  ): Tutoring {
    if (teacher.role !== UserRole.TEACHER) {
      throw new BusinessRuleException('Solo el docente puede registrar la asistencia.', 'UNAUTHORIZED_ROLE');
    }

    const tutoring = db.tutorings.find((t) => t.id === tutoringId);
    if (!tutoring) {
      throw new BusinessRuleException('La tutoría no existe.', 'NOT_FOUND');
    }

    if (tutoring.teacherId !== teacher.id) {
      throw new BusinessRuleException('Solo el docente titular puede registrar asistencia.', 'FORBIDDEN');
    }

    if (
      tutoring.status !== TutoringStatus.IN_PROGRESS &&
      tutoring.status !== TutoringStatus.COMPLETED
    ) {
      throw new BusinessRuleException(
        'Solo se puede registrar asistencia en tutorías en proceso o finalizadas.',
        'INVALID_STATUS'
      );
    }

    // Actualizar asistencia
    records.forEach((rec) => {
      const assistant = tutoring.assistants.find((a) => a.id === rec.assistantId);
      if (assistant) {
        assistant.hasAttended = rec.hasAttended;
      }
    });

    db.logBinnacle(
      'Control de Asistencia',
      `Docente ${teacher.fullName} actualizó la lista de asistencia en la tutoría ${tutoring.code}`,
      teacher.username
    );

    db.notify();
    return tutoring;
  }
}
