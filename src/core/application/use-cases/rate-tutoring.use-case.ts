import { BusinessRuleException } from '../../domain/services/schedule-conflict.service';
import { db } from '../../infrastructure/database/database';
import { Tutoring, TutoringStatus, User, UserRole } from '../../types';

export interface RateTutoringDto {
  tutoringId: string;
  score: number; // 1 to 5
  studentComment: string;
}

export class RateTutoringUseCase {
  public static execute(dto: RateTutoringDto, student: User): Tutoring {
    if (student.role !== UserRole.STUDENT) {
      throw new BusinessRuleException('Solo los estudiantes solicitantes pueden calificar la tutoría.', 'UNAUTHORIZED_ROLE');
    }

    const tutoring = db.tutorings.find((t) => t.id === dto.tutoringId);
    if (!tutoring) {
      throw new BusinessRuleException('La tutoría no existe.', 'NOT_FOUND');
    }

    // Regla grupal: cualquier participante (solicitante o invitado) puede evaluar, una sola vez
    const isParticipant = (tutoring.assistants || []).some((a) => a.studentId === student.id);
    if (!isParticipant) {
      throw new BusinessRuleException('Solo los participantes de esta tutoría pueden evaluarla.', 'FORBIDDEN');
    }

    // Regla: la tutoría debe estar finalizada (status == 2)
    if (tutoring.status !== TutoringStatus.COMPLETED) {
      throw new BusinessRuleException('Solo se pueden evaluar tutorías que hayan finalizado con éxito.', 'NOT_COMPLETED');
    }

    // Regla: un participante no puede calificar más de una vez
    const ratings = tutoring.ratings || (tutoring.ratings = []);
    if (ratings.some((r) => r.studentId === student.id)) {
      throw new BusinessRuleException('Esta tutoría ya fue calificada por ti anteriormente.', 'ALREADY_RATED');
    }

    if (!Number.isInteger(dto.score) || dto.score < 1 || dto.score > 5) {
      throw new BusinessRuleException('La calificación debe estar entre 1 y 5 estrellas.', 'INVALID_SCORE');
    }

    if (!dto.studentComment || dto.studentComment.trim().length < 5) {
      throw new BusinessRuleException('Por favor agregue un comentario sobre su experiencia en la tutoría.', 'COMMENT_REQUIRED');
    }

    ratings.push({
      id: `rate-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tutoringId: tutoring.id,
      studentId: student.id,
      studentName: student.fullName,
      score: dto.score,
      studentComment: dto.studentComment.trim(),
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    });
    // Compatibilidad: score = promedio, studentComment = más reciente
    const avg = ratings.reduce((s, r) => s + r.score, 0) / ratings.length;
    tutoring.score = Math.round(avg * 10) / 10;
    tutoring.studentComment = ratings[ratings.length - 1].studentComment;

    db.logBinnacle(
      'Evaluación',
      `Estudiante ${student.fullName} evaluó con ${dto.score} estrellas la tutoría ${tutoring.code}`,
      student.username
    );

    // Notificar al docente sobre la retroalimentación recibida
    db.addNotification(
      tutoring.teacherId,
      'Nueva Calificación Recibida',
      `El estudiante ${student.fullName} ha calificado su tutoría ${tutoring.code} con ${dto.score}/5 estrellas. Comentario: "${dto.studentComment.trim()}"`
    );

    db.notify();
    return tutoring;
  }
}
