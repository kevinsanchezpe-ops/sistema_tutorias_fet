import {
  BinnacleEntry,
  Career,
  InstitutionInfo,
  Notification,
  ScheduleSlot,
  SectionClassroom,
  SubjectCourse,
  TeacherAvailability,
  Tutoring,
  TutoringStatus,
  User,
  UserRole
} from '../../types';
import { CAREERS } from './careers-data';
import {
  INITIAL_BINNACLE,
  INITIAL_INSTITUTION,
  INITIAL_SCHEDULE_SLOTS,
  INITIAL_SECTIONS,
  INITIAL_SUBJECTS,
  INITIAL_TEACHER_AVAILABILITY,
  INITIAL_TUTORINGS,
  INITIAL_USERS
} from './initial-data';

export class AppDatabase {
  private static instance: AppDatabase;

  public users: User[] = [];
  public tutorings: Tutoring[] = [];
  public subjects: SubjectCourse[] = [];
  public careers: Career[] = [];
  public scheduleSlots: ScheduleSlot[] = [];
  public sections: SectionClassroom[] = [];
  public teacherAvailability: TeacherAvailability[] = [];
  public notifications: Notification[] = [];
  public binnacle: BinnacleEntry[] = [];
  public institution: InstitutionInfo;

  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.users = JSON.parse(JSON.stringify(INITIAL_USERS));
    this.tutorings = JSON.parse(JSON.stringify(INITIAL_TUTORINGS));
    this.subjects = JSON.parse(JSON.stringify(INITIAL_SUBJECTS));
    this.careers = JSON.parse(JSON.stringify(CAREERS));
    this.scheduleSlots = JSON.parse(JSON.stringify(INITIAL_SCHEDULE_SLOTS));
    this.sections = JSON.parse(JSON.stringify(INITIAL_SECTIONS));
    this.teacherAvailability = JSON.parse(JSON.stringify(INITIAL_TEACHER_AVAILABILITY));
    this.binnacle = JSON.parse(JSON.stringify(INITIAL_BINNACLE));
    this.institution = JSON.parse(JSON.stringify(INITIAL_INSTITUTION));

    // Generar notificaciones iniciales correspondientes
    this.notifications = [
      {
        id: 'notif-1',
        destinationUserId: 'usr-student-1',
        subject: 'Solicitud Aprobada',
        content:
          'Su tutoría sobre Polimorfismo (#14) fue aprobada para la fecha programada. Enlace virtual asignado.',
        isRead: false,
        createdAt: '2026-09-01 12:00'
      },
      {
        id: 'notif-2',
        destinationUserId: 'usr-teacher-1',
        subject: 'Solicitud Asignada',
        content:
          'Se le ha asignado la tutoría #14 con Dennis M. Andino para el horario 14:00 - 15:00.',
        isRead: false,
        createdAt: '2026-09-01 12:00'
      }
    ];
  }

  public static getInstance(): AppDatabase {
    if (!AppDatabase.instance) {
      AppDatabase.instance = new AppDatabase();
    }
    return AppDatabase.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  public logBinnacle(typeEvent: string, description: string, username: string, ipAddress: string = '127.0.0.1'): void {
    const now = new Date();
    const dateEvent = now.toISOString().split('T')[0];
    const hourEvent = now.toTimeString().split(' ')[0].substring(0, 5);

    this.binnacle.unshift({
      id: `bin-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      typeEvent,
      description,
      username,
      ipAddress,
      dateEvent,
      hourEvent
    });
  }

  public addNotification(destinationUserId: string, subject: string, content: string, tutoringId?: string): void {
    const notif: Notification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      destinationUserId,
      subject,
      content,
      tutoringId,
      isRead: false,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    this.notifications.unshift(notif);
  }

  public updateUserProfile(userId: string, data: Partial<User>): User {
    const idx = this.users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('Usuario no encontrado');
    this.users[idx] = {
      ...this.users[idx],
      ...data
    };
    this.notify();
    return this.users[idx];
  }
}

export const db = AppDatabase.getInstance();
