import React from 'react';
import { TutoringStatus } from '../core/types';
import { Clock, CheckCircle2, PlayCircle, XCircle, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: TutoringStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  switch (status) {
    case TutoringStatus.PENDING:
      return (
        <span
          id="badge-status-pending"
          className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses}`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          Pendiente
        </span>
      );

    case TutoringStatus.APPROVED:
      return (
        <span
          id="badge-status-approved"
          className={`inline-flex items-center gap-1.5 rounded-full bg-[#eaf8ea] text-[#11770e] border border-[#bce6bc] font-semibold ${sizeClasses}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-[#11770e]" />
          Programada
        </span>
      );

    case TutoringStatus.IN_PROGRESS:
      return (
        <span
          id="badge-status-inprogress"
          className={`inline-flex items-center gap-1.5 rounded-full bg-sky-50 text-sky-800 border border-sky-300 font-semibold ${sizeClasses}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-600"></span>
          </span>
          En Proceso
        </span>
      );

    case TutoringStatus.COMPLETED:
      return (
        <span
          id="badge-status-completed"
          className={`inline-flex items-center gap-1.5 rounded-full bg-[#11770e]/10 text-[#0d5c0b] border border-[#11770e]/30 font-medium ${sizeClasses}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-[#11770e]" />
          Finalizada
        </span>
      );

    case TutoringStatus.CANCELLED:
      return (
        <span
          id="badge-status-cancelled"
          className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 ${sizeClasses}`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          Cancelada
        </span>
      );

    default:
      return (
        <span
          id="badge-status-unknown"
          className={`inline-flex items-center gap-1.5 rounded-full bg-gray-100 text-gray-700 ${sizeClasses}`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-gray-500" />
          Desconocido
        </span>
      );
  }
};
