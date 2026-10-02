import { Tutoring, TutoringModality, TutoringStatus } from '../../types';

export class BusinessRuleException extends Error {
  public readonly code: string;
  constructor(message: string, code: string = 'BUSINESS_RULE_VIOLATION') {
    super(message);
    this.name = 'BusinessRuleException';
    this.code = code;
  }
}

export class ScheduleConflictService {
  /**
   * Regla original de anticipación:
   * "La fecha debe ser como mínimo 2 días posteriores a la fecha actual"
   */
  public static validateReservationDate(reservDate: string): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const minAllowed = new Date(today);
    minAllowed.setDate(minAllowed.getDate() + 2);

    const parts = reservDate.split('-');
    if (parts.length !== 3) {
      throw new BusinessRuleException('Formato de fecha inválido. Utilice YYYY-MM-DD.', 'INVALID_DATE_FORMAT');
    }

    const targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate < minAllowed) {
      const minDateStr = minAllowed.toISOString().split('T')[0];
      throw new BusinessRuleException(
        `Regla de anticipación: Las tutorías deben solicitarse con al menos 2 días de anticipación (Fecha mínima permitida: ${minDateStr}).`,
        'DATE_TOO_EARLY'
      );
    }
  }

  /**
   * Valida que el docente no tenga ya otra tutoría en la misma fecha y bloque de horario
   */
  public static validateTeacherScheduleConflict(
    teacherId: string,
    reservDate: string,
    scheduleSlotId: string,
    existingTutorings: Tutoring[],
    excludeTutoringId?: string
  ): void {
    const conflict = existingTutorings.find(
      (t) =>
        t.id !== excludeTutoringId &&
        t.teacherId === teacherId &&
        t.reservDate === reservDate &&
        t.scheduleSlotId === scheduleSlotId &&
        (t.status === TutoringStatus.PENDING ||
          t.status === TutoringStatus.APPROVED ||
          t.status === TutoringStatus.IN_PROGRESS)
    );

    if (conflict) {
      throw new BusinessRuleException(
        'El horario solicitado ya se encuentra reservado para este docente. Por favor, seleccione otro horario o fecha.',
        'TEACHER_SLOT_OCCUPIED'
      );
    }
  }

  /**
   * Valida que el aula física no se encuentre ocupada por otra tutoría presencial
   */
  public static validateSectionState(
    spaceName: string,
    reservDate: string,
    scheduleSlotId: string,
    modality: TutoringModality,
    existingTutorings: Tutoring[],
    excludeTutoringId?: string,
    blockName?: string
  ): void {
    if (modality === TutoringModality.VIRTUAL) {
      return; // Enlaces virtuales no colisionan aulas físicas
    }

    const normSpace = spaceName.trim().toLowerCase();
    const normBlock = (blockName || '').trim().toLowerCase();
    const conflict = existingTutorings.find(
      (t) =>
        t.id !== excludeTutoringId &&
        t.modality === TutoringModality.PRESENCIAL &&
        t.space.toLowerCase() === normSpace &&
        (t.block || '').toLowerCase() === normBlock &&
        t.reservDate === reservDate &&
        t.scheduleSlotId === scheduleSlotId &&
        (t.status === TutoringStatus.APPROVED || t.status === TutoringStatus.IN_PROGRESS)
    );

    if (conflict) {
      const where = normBlock ? `'${spaceName.trim()}' (Bloque ${blockName!.trim()})` : `'${spaceName.trim()}'`;
      throw new BusinessRuleException(
        `La sección/aula ${where} ya está reservada para la tutoría ${conflict.code} en ese mismo horario.`,
        'SECTION_NOT_AVAILABLE'
      );
    }
  }
}
