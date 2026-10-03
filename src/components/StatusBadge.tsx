import React from 'react';
import { TutoringStatus } from '../core/types';
import { YafaStatus } from './admin/yafaDashboard';

interface StatusBadgeProps {
  status: TutoringStatus;
  size?: 'sm' | 'md';
}

/**
 * Yafa-UI: estado como dot semántico 6px + texto neutro plano.
 * Sin cápsula, sin fondo tintado ni borde. El color solo está en el dot.
 * Se mantienen los ids para compatibilidad con tests.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case TutoringStatus.PENDING:
      return (
        <span id="badge-status-pending">
          <YafaStatus dot="#b45309" label="Pendiente" />
        </span>
      );

    case TutoringStatus.APPROVED:
      return (
        <span id="badge-status-approved">
          <YafaStatus dot="#11770e" label="Programada" />
        </span>
      );

    case TutoringStatus.IN_PROGRESS:
      return (
        <span id="badge-status-inprogress">
          <YafaStatus
            dot="#2563eb"
            label="En Proceso"
            icon={
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2563eb] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#2563eb]" />
              </span>
            }
          />
        </span>
      );

    case TutoringStatus.COMPLETED:
      return (
        <span id="badge-status-completed">
          <YafaStatus dot="#059669" label="Finalizada" />
        </span>
      );

    case TutoringStatus.CANCELLED:
      return (
        <span id="badge-status-cancelled">
          <YafaStatus dot="#dc2626" label="Cancelada" />
        </span>
      );

    default:
      return (
        <span id="badge-status-unknown">
          <YafaStatus dot="#64748b" label="Desconocido" />
        </span>
      );
  }
};
