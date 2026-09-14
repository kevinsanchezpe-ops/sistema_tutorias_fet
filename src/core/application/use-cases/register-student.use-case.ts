import { BusinessRuleException } from '../../domain/services/schedule-conflict.service';
import { db } from '../../infrastructure/database/database';
import { User, UserRole } from '../../types';

export interface RegisterStudentDto {
  fullName: string;
  email: string;
  phone?: string;
  birthDate?: string;
  admissionDate?: string;
  account: string;
  careerId?: string;
  campusId?: string;
  username: string;
  password?: string;
}

export class RegisterStudentUseCase {
  public static execute(dto: RegisterStudentDto): User {
    if (!dto.fullName || dto.fullName.trim().length < 10) {
      throw new BusinessRuleException('El nombre completo debe tener al menos 10 caracteres.', 'INVALID_NAME');
    }

    if (!dto.email || !dto.email.includes('@')) {
      throw new BusinessRuleException('El correo institucional es obligatorio y debe ser válido.', 'INVALID_EMAIL');
    }

    if (!dto.account || dto.account.trim().length < 6) {
      throw new BusinessRuleException('El número de cuenta institucional es obligatorio.', 'INVALID_ACCOUNT');
    }

    const usernameLower = dto.username.toLowerCase().trim();
    if (db.users.some((u) => u.username.toLowerCase() === usernameLower)) {
      throw new BusinessRuleException('El nombre de usuario ya está en uso. Por favor elija otro.', 'USERNAME_TAKEN');
    }

    if (db.users.some((u) => u.account === dto.account.trim())) {
      throw new BusinessRuleException('El número de cuenta ya se encuentra registrado.', 'ACCOUNT_TAKEN');
    }

    const nameParts = dto.fullName.trim().split(' ');
    const alias = nameParts.length >= 2 ? `${nameParts[0]} ${nameParts[1]}` : dto.fullName;

    const newUser: User = {
      id: `usr-student-${Date.now()}`,
      username: usernameLower,
      fullName: dto.fullName.trim(),
      alias,
      email: dto.email.trim(),
      phone: dto.phone.trim(),
      role: UserRole.STUDENT,
      account: dto.account.trim(),
      campusId: dto.campusId || 'cmp-1',
      campusName: 'Campus Central',
      careerId: dto.careerId || 'car-1',
      careerName: 'Ingeniería en Sistemas',
      birthDate: dto.birthDate,
      admissionDate: dto.admissionDate,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0]
    };

    db.users.push(newUser);

    db.logBinnacle(
      'Registro',
      `Nuevo estudiante registrado: ${newUser.fullName} (${newUser.account})`,
      newUser.username
    );

    db.notify();
    return newUser;
  }
}
