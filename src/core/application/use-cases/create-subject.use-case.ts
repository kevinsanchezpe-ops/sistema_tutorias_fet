import { BusinessRuleException } from '../../domain/services/schedule-conflict.service';
import { db } from '../../infrastructure/database/database';
import { SubjectCourse, User, UserRole } from '../../types';

export interface CreateSubjectDto {
  name: string;
  code?: string;
  credits?: number;
  careerName?: string;
}

export class CreateSubjectUseCase {
  public static execute(dto: CreateSubjectDto, adminUser: User): SubjectCourse {
    if (adminUser.role !== UserRole.ADMIN) {
      throw new BusinessRuleException(
        'Solo los administradores de la institución pueden crear nuevas asignaturas.',
        'UNAUTHORIZED_ROLE'
      );
    }

    const trimmedName = dto.name?.trim();
    if (!trimmedName || trimmedName.length < 3) {
      throw new BusinessRuleException(
        'El nombre de la asignatura debe tener al menos 3 caracteres.',
        'INVALID_SUBJECT_NAME'
      );
    }

    // Check if subject with identical name already exists
    const duplicate = db.subjects.find(
      (s) => s.name.toLowerCase().trim() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      throw new BusinessRuleException(
        'Ya existe una asignatura con este nombre en el plan de estudios.',
        'DUPLICATE_SUBJECT'
      );
    }

    const newSubject: SubjectCourse = {
      id: `sub-${Date.now()}`,
      name: trimmedName,
      code: dto.code?.trim().toUpperCase() || `ASG-${Math.floor(100 + Math.random() * 900)}`,
      credits: dto.credits || 4,
      careerId: 'car-1',
      careerName: dto.careerName?.trim() || 'Ingeniería en Sistemas',
      isActive: true
    };

    db.subjects.push(newSubject);

    db.logBinnacle(
      'Creación de Asignatura',
      `Administrador ${adminUser.username} dio de alta la asignatura: "${newSubject.name}" (${newSubject.code})`,
      adminUser.username
    );

    db.notify();
    return newSubject;
  }
}
