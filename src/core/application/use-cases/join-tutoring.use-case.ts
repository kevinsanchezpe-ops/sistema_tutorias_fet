import { BusinessRuleException } from '../../domain/services/schedule-conflict.service';
import { db } from '../../infrastructure/database/database';
import { Tutoring, TutoringAssistant, TutoringModality, TutoringStatus, TutoringType, User, UserRole } from '../../types';

export class JoinTutoringUseCase {
  public static execute(tutoringId: string, student: User): Tutoring {
    if (student.role !== UserRole.STUDENT) {
      throw new BusinessRuleException('Solo los estudiantes pueden unirse como participantes invitados.', 'UNAUTHORIZED_ROLE');
    }

    const tutoring = db.tutorings.find((t) => t.id === tutoringId);
    if (!tutoring) {
      throw new BusinessRuleException('La tutoría no existe.', 'NOT_FOUND');
    }
    if ((tutoring.type || TutoringType.GROUP) !== TutoringType.GROUP) {
      throw new BusinessRuleException('Esta tutoría es individual y no admite participantes invitados.', 'INDIVIDUAL_TUTORING');
    }

    if (tutoring.petitionerStudentId === student.id) {
      throw new BusinessRuleException('Usted es el creador de esta solicitud de tutoría.', 'ALREADY_OWNER');
    }

    if (tutoring.status !== TutoringStatus.PENDING && tutoring.status !== TutoringStatus.APPROVED) {
      throw new BusinessRuleException(
        'Solo puede unirse a tutorías pendientes o aprobadas que no hayan iniciado.',
        'INVALID_STATUS_FOR_JOIN'
      );
    }

    const alreadyJoined = tutoring.assistants.some((a) => a.studentId === student.id);
    if (alreadyJoined) {
      throw new BusinessRuleException('Ya se encuentra registrado como participante en esta tutoría.', 'ALREADY_JOINED');
    }

    // Regla grupal: solo estudiantes de la misma carrera y semestre de la materia.
    const subject = db.subjects.find((s) => s.id === tutoring.subjectCourseId);
    if (subject?.careerId && student.careerId && subject.careerId !== student.careerId) {
      throw new BusinessRuleException('Solo pueden unirse estudiantes de la misma carrera de la materia.', 'DIFFERENT_CAREER');
    }
    if (
      subject?.semester &&
      student.semester &&
      Number(subject.semester) !== Number(student.semester)
    ) {
      throw new BusinessRuleException(
        `Solo pueden unirse estudiantes del semestre ${subject.semester} de la materia.`,
        'DIFFERENT_SEMESTER'
      );
    }

    // Regla de cupo: no superar la capacidad del aula en tutorías presenciales.
    if (tutoring.modality === TutoringModality.PRESENCIAL) {
      const section = db.sections.find((s) => s.name.toLowerCase() === tutoring.space.trim().toLowerCase());
      if (section && section.capacity > 0 && tutoring.assistants.length >= section.capacity) {
        throw new BusinessRuleException(
          `El cupo de esta tutoría está completo (máximo ${section.capacity} participantes).`,
          'CAPACITY_FULL'
        );
      }
    }
    if (tutoring.maxParticipants && tutoring.assistants.length >= tutoring.maxParticipants) {
      throw new BusinessRuleException('El cupo confirmado para esta tutoría está completo.', 'CAPACITY_FULL');
    }

    const newAssistant: TutoringAssistant = {
      id: `ast-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tutoringId: tutoring.id,
      studentId: student.id,
      studentName: student.fullName,
      studentAccount: student.account,
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
      `El estudiante ${student.fullName} (${student.account}) se ha unido a su tutoría ${tutoring.code} programada para el ${tutoring.reservDate}.`,
      tutoring.id
    );

    db.notify();
    return tutoring;
  }
}
