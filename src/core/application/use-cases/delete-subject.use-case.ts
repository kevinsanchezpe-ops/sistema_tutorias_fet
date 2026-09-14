import { BusinessRuleException } from '../../domain/services/schedule-conflict.service';
import { db } from '../../infrastructure/database/database';
import { SubjectCourse, TutoringStatus, User, UserRole } from '../../types';

export class DeleteSubjectUseCase {
  public static execute(subjectId: string, adminUser: User): SubjectCourse {
    if (adminUser.role !== UserRole.ADMIN) {
      throw new BusinessRuleException(
        'Solo los administradores pueden eliminar asignaturas del catálogo.',
        'UNAUTHORIZED_ROLE'
      );
    }

    const subjectIndex = db.subjects.findIndex((s) => s.id === subjectId);
    if (subjectIndex === -1) {
      throw new BusinessRuleException('La asignatura no existe en el catálogo.', 'NOT_FOUND');
    }

    const subject = db.subjects[subjectIndex];

    // Check if there are active tutorings with this subject
    const activeTutorings = db.tutorings.filter(
      (t) =>
        t.subjectCourseId === subjectId &&
        (t.status === TutoringStatus.PENDING ||
          t.status === TutoringStatus.APPROVED ||
          t.status === TutoringStatus.IN_PROGRESS)
    );

    if (activeTutorings.length > 0) {
      throw new BusinessRuleException(
        `No se puede eliminar la asignatura "${subject.name}" porque tiene ${activeTutorings.length} tutoría(s) activa(s) o pendiente(s).`,
        'ACTIVE_TUTORINGS_EXIST'
      );
    }

    // Remove from subjects list
    db.subjects.splice(subjectIndex, 1);

    // Remove associated teacher availabilities
    db.teacherAvailability = db.teacherAvailability.filter((a) => a.subjectCourseId !== subjectId);

    db.logBinnacle(
      'Eliminación de Asignatura',
      `Administrador ${adminUser.username} eliminó la asignatura: "${subject.name}" (${subject.code})`,
      adminUser.username
    );

    db.notify();
    return subject;
  }
}
