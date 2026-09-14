import { BusinessRuleException } from '../../domain/services/schedule-conflict.service';
import { TutoringStateMachineService } from '../../domain/services/state-machine.service';
import { db } from '../../infrastructure/database/database';
import { Tutoring, TutoringStatus, User, UserRole } from '../../types';

export class StartTutoringUseCase {
  public static execute(tutoringId: string, teacher: User): Tutoring {
    if (teacher.role !== UserRole.TEACHER) {
      throw new BusinessRuleException('Solo los docentes pueden iniciar una tutoría.', 'UNAUTHORIZED_ROLE');
    }

    const tutoring = db.tutorings.find((t) => t.id === tutoringId);
    if (!tutoring) {
      throw new BusinessRuleException('La tutoría no existe.', 'NOT_FOUND');
    }

    if (tutoring.teacherId !== teacher.id) {
      throw new BusinessRuleException('Solo el docente titular asignado puede iniciar esta sesión.', 'FORBIDDEN');
    }

    // Debe transitar desde APPROVED (1) a IN_PROGRESS (0)
    TutoringStateMachineService.ensureValidTransition(tutoring.status, TutoringStatus.IN_PROGRESS);

    const now = new Date();
    const formattedStartTime = now.toLocaleDateString('es-ES') + ' ' + now.toLocaleTimeString('es-ES');

    tutoring.status = TutoringStatus.IN_PROGRESS;
    tutoring.startTime = formattedStartTime;

    db.logBinnacle(
      'Inicio de Tutoría',
      `El docente ${teacher.fullName} inició la tutoría ${tutoring.code} (${tutoring.subject})`,
      teacher.username
    );

    db.notify();
    return tutoring;
  }
}
