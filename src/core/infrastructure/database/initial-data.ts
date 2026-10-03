import {
  BinnacleEntry,
  InstitutionInfo,
  ScheduleSlot,
  SectionClassroom,
  SubjectCourse,
  TeacherAvailability,
  Tutoring,
  TutoringModality,
  TutoringStatus,
  User,
  UserRole
} from '../../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin-1',
    username: 'admin',
    fullName: 'Administrador del Sistema',
    alias: 'Admin GT',
    email: 'admin@gt.edu',
    role: UserRole.ADMIN,
    account: 'ADM-2021001',
    campusId: 'cmp-1',
    campusName: 'Sede Única',
    careerId: 'car-fet-software',
    careerName: 'Ingeniería de Software',
    birthDate: '1988-04-12',
    admissionDate: '2019-01-15',
    observations: 'Administrador general de tutorías académicas',
    isActive: true,
    createdAt: '2021-01-20'
  },
  {
    id: 'usr-teacher-1',
    username: 'osman_mejia',
    fullName: 'Ing. Osman Mejía',
    alias: 'Prof. Osman',
    email: 'osman.mejia@gt.edu',
    role: UserRole.TEACHER,
    account: 'DOC-11029',
    campusId: 'cmp-1',
    campusName: 'Sede Única',
    careerId: 'car-fet-software',
    careerName: 'Ingeniería de Software',
    birthDate: '1985-09-22',
    admissionDate: '2018-08-01',
    observations: 'Docente titular de Programación y Estructuras de Datos',
    isActive: true,
    createdAt: '2021-01-22'
  },
  {
    id: 'usr-teacher-2',
    username: 'karen_alvarado',
    fullName: 'Licda. Karen Alvarado',
    alias: 'Prof. Karen',
    email: 'karen.alvarado@gt.edu',
    role: UserRole.TEACHER,
    account: 'DOC-11035',
    campusId: 'cmp-1',
    campusName: 'Sede Única',
    careerId: 'car-fet-software',
    careerName: 'Ingeniería de Software',
    birthDate: '1990-03-18',
    admissionDate: '2020-02-10',
    observations: 'Especialista en Bases de Datos y Análisis de Algoritmos',
    isActive: true,
    createdAt: '2021-01-22'
  },
  {
    id: 'usr-student-1',
    username: 'dennis_andino',
    fullName: 'Dennis M. Andino',
    alias: 'Dennis Andino',
    email: 'dennis.andino@gt.edu',
    role: UserRole.STUDENT,
    account: '11811054',
    campusId: 'cmp-1',
    campusName: 'Sede Única',
    careerId: 'car-fet-software',
    careerName: 'Ingeniería de Software',
    birthDate: '1999-07-14',
    admissionDate: '2018-01-20',
    semester: 9,
    observations: 'Estudiante de último año, cursando materias avanzadas',
    isActive: true,
    createdAt: '2021-01-22'
  },
  {
    id: 'usr-student-2',
    username: 'lidia_castillo',
    fullName: 'Lidia Castillo',
    alias: 'Lidia Castillo',
    email: 'lidia.castillo@gt.edu',
    role: UserRole.STUDENT,
    account: '11921088',
    campusId: 'cmp-1',
    campusName: 'Sede Única',
    careerId: 'car-fet-software',
    careerName: 'Ingeniería de Software',
    birthDate: '2001-11-05',
    admissionDate: '2019-07-15',
    semester: 4,
    observations: 'Estudiante de tercer año',
    isActive: true,
    createdAt: '2021-01-22'
  }
];

import { INITIAL_FET_SUBJECTS } from './fet-software-engineering-subjects';
import { INITIAL_FET_SUBJECTS_ELECTRICAL } from './fet-electrical-engineering-subjects';
import { INITIAL_FET_SUBJECTS_ENVIRONMENTAL } from './fet-environmental-engineering-subjects';
import { INITIAL_FET_SUBJECTS_FOOD } from './fet-food-engineering-subjects';
import { INITIAL_FET_SUBJECTS_SST } from './fet-sst-subjects';

/** Catálogo completo de asignaturas oficiales del pénsum FET (las 5 carreras). */
export const ALL_CURRICULUM_SUBJECTS: SubjectCourse[] = [
  ...INITIAL_FET_SUBJECTS,
  ...INITIAL_FET_SUBJECTS_ELECTRICAL,
  ...INITIAL_FET_SUBJECTS_ENVIRONMENTAL,
  ...INITIAL_FET_SUBJECTS_FOOD,
  ...INITIAL_FET_SUBJECTS_SST
];

export const INITIAL_SUBJECTS: SubjectCourse[] = ALL_CURRICULUM_SUBJECTS;

export const INITIAL_SCHEDULE_SLOTS: ScheduleSlot[] = [
  { id: 'sch-1', startTime: '07:30', finishTime: '08:30', label: '07:30 - 08:30', isAvailable: true },
  { id: 'sch-2', startTime: '09:00', finishTime: '10:00', label: '09:00 - 10:00', isAvailable: true },
  { id: 'sch-3', startTime: '10:00', finishTime: '11:00', label: '10:00 - 11:00', isAvailable: true },
  { id: 'sch-4', startTime: '11:00', finishTime: '12:00', label: '11:00 - 12:00', isAvailable: true },
  { id: 'sch-5', startTime: '13:00', finishTime: '14:00', label: '13:00 - 14:00', isAvailable: true },
  { id: 'sch-6', startTime: '14:00', finishTime: '15:00', label: '14:00 - 15:00', isAvailable: true },
  { id: 'sch-7', startTime: '15:00', finishTime: '16:00', label: '15:00 - 16:00', isAvailable: true }
];

export const INITIAL_SECTIONS: SectionClassroom[] = [
  { id: 'sec-1', name: 'Laboratorio 1 - Computación', isAvailable: true, capacity: 30 },
  { id: 'sec-2', name: 'Laboratorio 2 - Redes', isAvailable: true, capacity: 30 },
  { id: 'sec-3', name: 'Laboratorio 3 - Software', isAvailable: true, capacity: 30 },
  { id: 'sec-4', name: 'Aula 25 - Edificio B2', isAvailable: true, capacity: 40 },
  { id: 'sec-5', name: 'Aula 45 - Edificio F5', isAvailable: true, capacity: 40 },
  { id: 'sec-6', name: 'Aula Magna', isAvailable: true, capacity: 120 }
];

export const INITIAL_TEACHER_AVAILABILITY: TeacherAvailability[] = [
  {
    id: 'av-1',
    teacherId: 'usr-teacher-1',
    teacherName: 'Ing. Osman Mejía',
    scheduleSlotId: 'sch-6',
    scheduleLabel: '14:00 - 15:00',
    subjectCourseId: 'sub-1',
    subjectCourseName: 'Programación Orientada a Objetos',
    isAvailable: true
  },
  {
    id: 'av-2',
    teacherId: 'usr-teacher-1',
    teacherName: 'Ing. Osman Mejía',
    scheduleSlotId: 'sch-5',
    scheduleLabel: '13:00 - 14:00',
    subjectCourseId: 'sub-2',
    subjectCourseName: 'Estructuras de Datos y Recursividad',
    isAvailable: true
  },
  {
    id: 'av-3',
    teacherId: 'usr-teacher-2',
    teacherName: 'Licda. Karen Alvarado',
    scheduleSlotId: 'sch-1',
    scheduleLabel: '07:30 - 08:30',
    subjectCourseId: 'sub-3',
    subjectCourseName: 'Base de Datos I (Normalización y SQL)',
    isAvailable: true
  },
  {
    id: 'av-4',
    teacherId: 'usr-teacher-2',
    teacherName: 'Licda. Karen Alvarado',
    scheduleSlotId: 'sch-2',
    scheduleLabel: '09:00 - 10:00',
    subjectCourseId: 'sub-4',
    subjectCourseName: 'Matemática Discreta y Algoritmos',
    isAvailable: true
  }
];

// Helper to produce a future date string (+3 days, +4 days, etc.)
function getFutureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

export const INITIAL_TUTORINGS: Tutoring[] = [
  {
    id: 'tut-1',
    code: '#14',
    subject: 'Polimorfismo e Interfaces en Java',
    details: 'Dudas sobre implementación de interfaces y casting de clases derivadas en el proyecto.',
    reservDate: getFutureDate(3),
    requestDate: '2026-09-01 10:15',
    modality: TutoringModality.VIRTUAL,
    status: TutoringStatus.APPROVED,
    space: 'https://zoom.us/j/93818575766?pwd=cHpTR2R3M0hCeFU2OXo5ZTBuZWZEZz09',
    subjectCourseId: 'sub-1',
    subjectCourseName: 'Programación Orientada a Objetos',
    teacherId: 'usr-teacher-1',
    teacherName: 'Ing. Osman Mejía',
    petitionerStudentId: 'usr-student-1',
    petitionerStudentName: 'Dennis M. Andino',
    scheduleSlotId: 'sch-6',
    scheduleLabel: '14:00 - 15:00',
    approvedById: 'usr-admin-1',
    approvedByName: 'Admin GT',
    startTime: null,
    finishTime: null,
    score: 0,
    studentComment: null,
    teacherComment: null,
    attachmentName: 'guia_polimorfismo.pdf',
    assistants: [
      {
        id: 'ast-1',
        tutoringId: 'tut-1',
        studentId: 'usr-student-1',
        studentName: 'Dennis M. Andino',
        studentAccount: '11811054',
        studentEmail: 'dennis.andino@gt.edu',
        isPetitioner: true,
        hasAttended: false,
        joinedAt: '2026-09-01 10:15'
      },
      {
        id: 'ast-2',
        tutoringId: 'tut-1',
        studentId: 'usr-student-2',
        studentName: 'Lidia Castillo',
        studentAccount: '11921088',
        studentEmail: 'lidia.castillo@gt.edu',
        isPetitioner: false,
        hasAttended: false,
        joinedAt: '2026-09-02 14:20'
      }
    ],
    createdAt: '2026-09-01 10:15'
  },
  {
    id: 'tut-2',
    code: '#18',
    subject: 'Recursividad y Torres de Hanói',
    details: 'Explicación del caso base y stack de llamadas en algoritmos recursivos complejos.',
    reservDate: getFutureDate(4),
    requestDate: '2026-09-02 09:30',
    modality: TutoringModality.PRESENCIAL,
    status: TutoringStatus.PENDING,
    space: 'No asignado aún',
    subjectCourseId: 'sub-2',
    subjectCourseName: 'Estructuras de Datos y Recursividad',
    teacherId: 'usr-teacher-1',
    teacherName: 'Ing. Osman Mejía',
    petitionerStudentId: 'usr-student-2',
    petitionerStudentName: 'Lidia Castillo',
    scheduleSlotId: 'sch-5',
    scheduleLabel: '13:00 - 14:00',
    approvedById: undefined,
    startTime: null,
    finishTime: null,
    score: 0,
    studentComment: null,
    teacherComment: null,
    attachmentName: null,
    assistants: [
      {
        id: 'ast-3',
        tutoringId: 'tut-2',
        studentId: 'usr-student-2',
        studentName: 'Lidia Castillo',
        studentAccount: '11921088',
        studentEmail: 'lidia.castillo@gt.edu',
        isPetitioner: true,
        hasAttended: false,
        joinedAt: '2026-09-02 09:30'
      }
    ],
    createdAt: '2026-09-02 09:30'
  },
  {
    id: 'tut-3',
    code: '#27',
    subject: 'Normalización de Bases de Datos hasta 3FN',
    details: 'Ejercicios prácticos de desnormalización y aplicación rigurosa de Boyce-Codd y 3FN.',
    reservDate: '2026-08-28',
    requestDate: '2026-08-24 11:20',
    modality: TutoringModality.PRESENCIAL,
    status: TutoringStatus.COMPLETED,
    space: 'Laboratorio 1 - Computación',
    subjectCourseId: 'sub-3',
    subjectCourseName: 'Base de Datos I (Normalización y SQL)',
    teacherId: 'usr-teacher-2',
    teacherName: 'Licda. Karen Alvarado',
    petitionerStudentId: 'usr-student-1',
    petitionerStudentName: 'Dennis M. Andino',
    scheduleSlotId: 'sch-1',
    scheduleLabel: '07:30 - 08:30',
    approvedById: 'usr-admin-1',
    approvedByName: 'Admin GT',
    startTime: '28-08-2026 7:32am',
    finishTime: '28-08-2026 8:35am',
    score: 5,
    studentComment: 'Excelente explicación de la profesora Karen, resolvió todas las dudas sobre 3FN.',
    teacherComment: 'El estudiante demostró dominio rápido de las formas normales.',
    attachmentName: 'ejercicios_3fn.pdf',
    ratings: [
      {
        id: 'rate-3',
        tutoringId: 'tut-3',
        studentId: 'usr-student-1',
        studentName: 'Dennis M. Andino',
        score: 5,
        studentComment: 'Excelente explicación de la profesora Karen, resolvió todas las dudas sobre 3FN.',
        createdAt: '2026-08-28 09:00'
      }
    ],
    assistants: [
      {
        id: 'ast-4',
        tutoringId: 'tut-3',
        studentId: 'usr-student-1',
        studentName: 'Dennis M. Andino',
        studentAccount: '11811054',
        studentEmail: 'dennis.andino@gt.edu',
        isPetitioner: true,
        hasAttended: true,
        joinedAt: '2026-08-24 11:20'
      }
    ],
    createdAt: '2026-08-24 11:20'
  }
];

export const INITIAL_BINNACLE: BinnacleEntry[] = [
  {
    id: 'bin-1',
    typeEvent: 'Registro',
    description: 'Registro de usuario Dennis M. Andino en el sistema GT',
    username: 'dennis_andino',
    ipAddress: '192.168.1.10',
    dateEvent: '2021-01-22',
    hourEvent: '10:29'
  },
  {
    id: 'bin-2',
    typeEvent: 'Aprobación',
    description: 'Aprobación de solicitud de tutoría #14 (Polimorfismo)',
    username: 'admin',
    ipAddress: '192.168.1.2',
    dateEvent: '2021-01-22',
    hourEvent: '12:56'
  },
  {
    id: 'bin-3',
    typeEvent: 'Finalización',
    description: 'Prof. Karen finalizó la tutoría #27 (Normalización de Bases de Datos)',
    username: 'karen_alvarado',
    ipAddress: '192.168.1.15',
    dateEvent: '2026-08-28',
    hourEvent: '08:35'
  }
];

export const INITIAL_INSTITUTION: InstitutionInfo = {
  id: 'inst-1',
  name: 'Fundación Escuela Tecnológica de Neiva - FET',
  vision: 'Ser el centro referente a nivel regional y nacional en tutorías de reforzamiento académico, garantizando la excelencia y retención estudiantil.',
  mission: 'Facilitar espacios colaborativos y accesibles de apoyo pedagógico continuo entre docentes y estudiantes.',
  address: 'Kilometro 12, via Neiva – Rivera',
  phone: '6088674935 – (+57) 3223041567',
  email: 'gestiontutorias@fet.edu.co',
  logo: 'logo.png'
};

