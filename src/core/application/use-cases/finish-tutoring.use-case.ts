import { BusinessRuleException } from '../../domain/services/schedule-conflict.service';
import { TutoringStateMachineService } from '../../domain/services/state-machine.service';
import { db } from '../../infrastructure/database/database';
import { Tutoring, TutoringStatus, User, UserRole } from '../../types';

export class FinishTutoringUseCase {
  public static execute(tutoringId: string, teacher: User, teacherComment?: string): Tutoring {
    if (teacher.role !== UserRole.TEACHER) {
      throw new BusinessRuleException('Solo los docentes pueden finalizar una tutoría.', 'UNAUTHORIZED_ROLE');
    }

    const tutoring = db.tutorings.find((t) => t.id === tutoringId);
    if (!tutoring) {
      throw new BusinessRuleException('La tutoría no existe.', 'NOT_FOUND');
    }

    if (tutoring.teacherId !== teacher.id) {
      throw new BusinessRuleException('Solo el docente titular asignado puede finalizar esta sesión.', 'FORBIDDEN');
    }

    // Debe transitar desde IN_PROGRESS (0) a COMPLETED (2)
    TutoringStateMachineService.ensureValidTransition(tutoring.status, TutoringStatus.COMPLETED);

    const now = new Date();
    const formattedFinishTime = now.toLocaleDateString('es-ES') + ' ' + now.toLocaleTimeString('es-ES');

    tutoring.status = TutoringStatus.COMPLETED;
    tutoring.finishTime = formattedFinishTime;
    if (teacherComment) {
      tutoring.teacherComment = teacherComment.trim();
    }

    db.logBinnacle(
      'Finalización de Tutoría',
      `El docente ${teacher.fullName} concluyó la tutoría ${tutoring.code} (${tutoring.subject})`,
      teacher.username
    );

    // Notificar al estudiante solicitante para que proceda a evaluarla
    db.addNotification(
      tutoring.petitionerStudentId,
      'Tutoría Finalizada - Evalúe a su Tutor',
      `La tutoría ${tutoring.code} sobre '${tutoring.subject}' ha concluido con éxito. Por favor, califique la sesión en su historial.`
    );

    db.notify();
    return tutoring;
  }
}
