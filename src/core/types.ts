/**
 * Core Types & Enums for GT (Gestión de Tutorías)
 * Respecting 100% of original business statuses and rules.
 */

export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN'
}

/**
 * Status definitions from original Tutorials.php:
 * -1: Pendiente (PENDING)
 *  0: En proceso (IN_PROGRESS)
 *  1: Aprobada / Programada (APPROVED)
 *  2: Finalizada (COMPLETED)
 *  3: Cancelada / Denegada (CANCELLED)
 */
export enum TutoringStatus {
  PENDING = -1,
  IN_PROGRESS = 0,
  APPROVED = 1,
  COMPLETED = 2,
  CANCELLED = 3
}

/**
 * Modality definitions from original system:
 * 0: Presencial (requiere asignación de aula física/sección)
 * 1: Virtual (requiere enlace de videoconferencia)
 */
export enum TutoringModality {
  PRESENCIAL = 0,
  VIRTUAL = 1
}

export interface Career {
  id: string;
  name: string;
  codePrefix: string;
  numberOfSemesters: number;
  isActive: boolean;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  alias: string;
  email: string;
  phone: string;
  role: UserRole;
  account: string; // Número de cuenta institucional
  campusId: string;
  campusName: string;
  careerId: string;
  careerName: string;
  birthDate: string;
  admissionDate: string;
  semester?: number;
  photoUrl?: string;
  observations?: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  passwordHash?: string;
}

export interface SubjectCourse {
  id: string;
  name: string;
  code?: string;
  credits?: number;
  semester?: number;
  careerId: string;
  careerName: string;
  isActive: boolean;
}

export interface ScheduleSlot {
  id: string;
  startTime: string; // e.g. "07:30"
  finishTime: string; // e.g. "08:30"
  label: string; // e.g. "07:30 - 08:30"
  isAvailable: boolean;
}

export interface SectionClassroom {
  id: string;
  name: string; // e.g. "Laboratorio 1", "Aula Magna", "Aula 25-Edificio B2"
  isAvailable: boolean;
  capacity: number; // 0 = sin límite
}

export type Section = SectionClassroom;

export interface TeacherAvailability {
  id: string;
  teacherId: string;
  teacherName: string;
  scheduleSlotId: string;
  scheduleLabel: string;
  subjectCourseId: string;
  subjectCourseName: string;
  isAvailable: boolean;
}

export interface TutoringAssistant {
  id: string;
  tutoringId: string;
  studentId: string;
  studentName: string;
  studentAccount: string;
  studentPhone: string;
  studentEmail: string;
  isPetitioner: boolean;
  hasAttended: boolean;
  joinedAt: string;
}

export interface Tutoring {
  id: string;
  code: string; // e.g. "#14", "#28"
  subject: string; // Tema o razón de la solicitud
  details: string; // Explicación detallada
  reservDate: string; // YYYY-MM-DD
  requestDate: string;
  modality: TutoringModality;
  status: TutoringStatus;
  space: string; // Aula física o enlace virtual (o motivo de cancelación)
  subjectCourseId: string;
  subjectCourseName: string;
  teacherId: string;
  teacherName: string;
  petitionerStudentId: string;
  petitionerStudentName: string;
  scheduleSlotId: string;
  scheduleLabel: string; // e.g. "14:00 - 15:00"
  approvedById?: string;
  approvedByName?: string;
  startTime?: string | null; // e.g. "24-01-2021 2:00pm"
  finishTime?: string | null; // e.g. "24-01-2021 3:15pm"
  score: number; // 0 if not evaluated, 1 to 5 stars
  studentComment?: string | null;
  teacherComment?: string | null;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  assistants: TutoringAssistant[];
  createdAt: string;
}

export interface Notification {
  id: string;
  destinationUserId: string;
  subject: string;
  content: string;
  tutoringId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface BinnacleEntry {
  id: string;
  typeEvent: string; // e.g. "Login", "Registro", "Aprobación", "Cancelación", "Inicio"
  description: string;
  username: string;
  ipAddress: string;
  dateEvent: string;
  hourEvent: string;
}

export interface InstitutionInfo {
  id: string;
  name: string;
  vision: string;
  mission: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}
