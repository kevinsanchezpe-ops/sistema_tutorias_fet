import { BusinessRuleException } from '../../domain/services/schedule-conflict.service';
import { db } from '../../infrastructure/database/database';
import { TutoringStatus, User, UserRole } from '../../types';

export class DeleteUserUseCase {
  public static execute(targetUserId: string, adminUser: User): User {
    if (adminUser.role !== UserRole.ADMIN) {
      throw new BusinessRuleException(
        'Solo los administradores pueden dar de baja y eliminar usuarios.',
        'UNAUTHORIZED_ROLE'
      );
    }

    const userIndex = db.users.findIndex((u) => u.id === targetUserId);
    if (userIndex === -1) {
      throw new BusinessRuleException('El usuario especificado no existe.', 'NOT_FOUND');
    }

    const targetUser = db.users[userIndex];

    if (targetUser.id === adminUser.id) {
      throw new BusinessRuleException(
        'No puede eliminar su propia cuenta de administrador en sesión.',
        'CANNOT_DELETE_SELF'
      );
    }

    // Check for active tutorings (pending, approved, in-progress)
    if (targetUser.role === UserRole.STUDENT) {
      const activeTutorings = db.tutorings.filter(
        (t) =>
          (t.petitionerStudentId === targetUserId ||
            t.assistants.some((a) => a.studentId === targetUserId)) &&
          (t.status === TutoringStatus.PENDING ||
            t.status === TutoringStatus.APPROVED ||
            t.status === TutoringStatus.IN_PROGRESS)
      );
      if (activeTutorings.length > 0) {
        throw new BusinessRuleException(
          `No se puede eliminar al estudiante "${targetUser.fullName}" porque tiene ${activeTutorings.length} tutoría(s) activa(s) o pendiente(s).`,
          'ACTIVE_TUTORINGS_EXIST'
        );
      }
    } else if (targetUser.role === UserRole.TEACHER) {
      const activeTutorings = db.tutorings.filter(
        (t) =>
          t.teacherId === targetUserId &&
          (t.status === TutoringStatus.PENDING ||
            t.status === TutoringStatus.APPROVED ||
            t.status === TutoringStatus.IN_PROGRESS)
      );
      if (activeTutorings.length > 0) {
        throw new BusinessRuleException(
          `No se puede eliminar al docente "${targetUser.fullName}" porque tiene ${activeTutorings.length} tutoría(s) activa(s) o asignada(s).`,
          'ACTIVE_TUTORINGS_EXIST'
        );
      }
      // Remove teacher availability slots
      db.teacherAvailability = db.teacherAvailability.filter((a) => a.teacherId !== targetUserId);
    }

    // Remove user from database
    db.users.splice(userIndex, 1);

    const roleName =
      targetUser.role === UserRole.STUDENT
        ? 'estudiante'
        : targetUser.role === UserRole.TEACHER
        ? 'docente'
        : 'usuario';

    db.logBinnacle(
      'Eliminación de Usuario',
      `Administrador ${adminUser.username} eliminó permanentemente al ${roleName}: "${targetUser.fullName}" (${targetUser.account || targetUser.username})`,
      adminUser.username
    );

    db.notify();
    return targetUser;
  }
}
