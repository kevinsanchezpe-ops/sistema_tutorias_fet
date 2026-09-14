import { BusinessRuleException } from '../../domain/services/schedule-conflict.service';
import { db } from '../../infrastructure/database/database';
import { SubjectCourse, User, UserRole } from '../../types';

export class ToggleSubjectActiveUseCase {
  public static execute(subjectId: string, adminUser: User): SubjectCourse {
    if (adminUser.role !== UserRole.ADMIN) {
      throw new BusinessRuleException(
        'Solo los administradores pueden habilitar o inhabilitar asignaturas.',
        'UNAUTHORIZED_ROLE'
      );
    }

    const subject = db.subjects.find((s) => s.id === subjectId);
    if (!subject) {
      throw new BusinessRuleException('La asignatura especificada no existe.', 'NOT_FOUND');
    }

    subject.isActive = !subject.isActive;

    db.logBinnacle(
      'Gestión de Asignatura',
      `Administrador ${adminUser.username} ${subject.isActive ? 'activó' : 'desactivó'} la asignatura "${subject.name}"`,
      adminUser.username
    );

    db.notify();
    return subject;
  }
}
