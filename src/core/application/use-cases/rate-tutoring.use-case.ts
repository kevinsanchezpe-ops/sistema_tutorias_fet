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

    if (tutoring.petitionerStudentId !== student.id) {
      throw new BusinessRuleException('Solo el estudiante creador de la solicitud puede evaluar la sesión.', 'FORBIDDEN');
    }

    // Regla: la tutoría debe estar finalizada (status == 2)
    if (tutoring.status !== TutoringStatus.COMPLETED) {
      throw new BusinessRuleException('Solo se pueden evaluar tutorías que hayan finalizado con éxito.', 'NOT_COMPLETED');
    }

    // Regla original: no se puede calificar más de una vez
    if (tutoring.score > 0) {
      throw new BusinessRuleException('Esta tutoría ya fue evaluada previamente y no puede modificarse.', 'ALREADY_RATED');
    }

    if (!dto.score || dto.score < 1 || dto.score > 5) {
      throw new BusinessRuleException('La calificación debe estar entre 1 y 5 estrellas.', 'INVALID_SCORE');
    }

    if (!dto.studentComment || dto.studentComment.trim().length < 5) {
      throw new BusinessRuleException('Por favor agregue un comentario sobre su experiencia en la tutoría.', 'COMMENT_REQUIRED');
    }

    tutoring.score = dto.score;
    tutoring.studentComment = dto.studentComment.trim();

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
