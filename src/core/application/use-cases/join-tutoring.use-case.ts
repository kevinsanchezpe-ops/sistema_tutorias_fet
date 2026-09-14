import { BusinessRuleException } from '../../domain/services/schedule-conflict.service';
import { db } from '../../infrastructure/database/database';
import { Tutoring, TutoringAssistant, TutoringStatus, User, UserRole } from '../../types';

export class JoinTutoringUseCase {
  public static execute(tutoringId: string, student: User): Tutoring {
    if (student.role !== UserRole.STUDENT) {
      throw new BusinessRuleException('Solo los estudiantes pueden unirse como participantes invitados.', 'UNAUTHORIZED_ROLE');
    }

    const tutoring = db.tutorings.find((t) => t.id === tutoringId);
    if (!tutoring) {
      throw new BusinessRuleException('La tutoría no existe.', 'NOT_FOUND');
    }

    if (tutoring.petitionerStudentId === student.id) {
      throw new BusinessRuleException('Usted es el creador de esta solicitud de tutoría.', 'ALREADY_OWNER');
    }

    if (tutoring.status !== TutoringStatus.PENDING && tutoring.status !== TutoringStatus.APPROVED) {
      throw new BusinessRuleException(
        'Solo puede unirse a tutorías que se encuentren en estado Pendiente o Programadas.',
        'INVALID_STATUS_FOR_JOIN'
      );
    }

    const alreadyJoined = tutoring.assistants.some((a) => a.studentId === student.id);
    if (alreadyJoined) {
      throw new BusinessRuleException('Ya se encuentra registrado como participante en esta tutoría.', 'ALREADY_JOINED');
    }

    const newAssistant: TutoringAssistant = {
      id: `ast-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tutoringId: tutoring.id,
      studentId: student.id,
      studentName: student.fullName,
      studentAccount: student.account,
      studentPhone: student.phone,
      studentEmail: student.email,
      isPetitioner: false,
      hasAttended: false,
      joinedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    tutoring.assistants.push(newAssistant);

    // Bitácora
    db.logBinnacle(
      'Participación',
      `Estudiante ${student.fullName} se unió a la tutoría ${tutoring.code} (${tutoring.subject})`,
      student.username
    );

    // Notificar al docente
    db.addNotification(
      tutoring.teacherId,
      'Nuevo Participante en Tutoría',
      `El estudiante ${student.fullName} (${student.account}) se ha unido a su tutoría ${tutoring.code} programada para el ${tutoring.reservDate}.`
    );

    db.notify();
    return tutoring;
  }
}
