import { BusinessRuleException } from '../../domain/services/schedule-conflict.service';
import { db } from '../../infrastructure/database/database';
import { User, UserRole } from '../../types';

export class ToggleUserActiveUseCase {
  public static execute(targetUserId: string, adminUser: User): User {
    if (adminUser.role !== UserRole.ADMIN) {
      throw new BusinessRuleException('Solo los administradores pueden cambiar el estado de un usuario.', 'UNAUTHORIZED_ROLE');
    }

    const user = db.users.find((u) => u.id === targetUserId);
    if (!user) {
      throw new BusinessRuleException('El usuario no existe.', 'NOT_FOUND');
    }

    if (user.id === adminUser.id) {
      throw new BusinessRuleException('No puede desactivar su propia cuenta de administrador.', 'SELF_DEACTIVATION');
    }

    user.isActive = !user.isActive;

    db.logBinnacle(
      'Gestión de Usuario',
      `Administrador ${adminUser.username} ${user.isActive ? 'activó' : 'desactivó'} la cuenta de ${user.fullName}`,
      adminUser.username
    );

    db.notify();
    return user;
  }
}
