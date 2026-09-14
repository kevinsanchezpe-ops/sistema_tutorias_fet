import { TutoringStatus } from '../../types';
import { BusinessRuleException } from './schedule-conflict.service';

export class TutoringStateMachineService {
  /**
   * Valida la validez de la transición de estado según las reglas del sistema original
   */
  public static ensureValidTransition(currentStatus: TutoringStatus, targetStatus: TutoringStatus): void {
    if (currentStatus === targetStatus) {
      return;
    }

    switch (currentStatus) {
      case TutoringStatus.PENDING:
        // Desde PENDING se puede Aprobar (1) o Cancelar/Rechazar (3)
        if (targetStatus !== TutoringStatus.APPROVED && targetStatus !== TutoringStatus.CANCELLED) {
          throw new BusinessRuleException(
            `Una tutoría pendiente solo puede pasar a estado Aprobada o Cancelada.`,
            'INVALID_STATE_TRANSITION'
          );
        }
        break;

      case TutoringStatus.APPROVED:
        // Desde APPROVED se puede Iniciar (0) o Cancelar (3)
        if (targetStatus !== TutoringStatus.IN_PROGRESS && targetStatus !== TutoringStatus.CANCELLED) {
          throw new BusinessRuleException(
            `Una tutoría aprobada solo puede pasar a estado En Proceso o Cancelada.`,
            'INVALID_STATE_TRANSITION'
          );
        }
        break;

      case TutoringStatus.IN_PROGRESS:
        // Desde IN_PROGRESS solo se puede Finalizar (2)
        if (targetStatus !== TutoringStatus.COMPLETED) {
          throw new BusinessRuleException(
            `Una tutoría en proceso solo puede pasar a estado Finalizada.`,
            'INVALID_STATE_TRANSITION'
          );
        }
        break;

      case TutoringStatus.COMPLETED:
        throw new BusinessRuleException(
          `Una tutoría finalizada no puede cambiar su estado.`,
          'IMMUTABLE_COMPLETED_STATE'
        );

      case TutoringStatus.CANCELLED:
        throw new BusinessRuleException(
          `Una tutoría cancelada no puede ser reactivada.`,
          'IMMUTABLE_CANCELLED_STATE'
        );

      default:
        throw new BusinessRuleException('Estado de tutoría desconocido.', 'UNKNOWN_STATE');
    }
  }
}
