import {
  ApiResponse,
  BinnacleEntry,
  Career,
  InstitutionInfo,
  Notification,
  ScheduleSlot,
  SectionClassroom,
  SubjectCourse,
  TeacherAvailability,
  Tutoring,
  User,
  UserRole
} from '../types';
import { RegisterStudentDto } from '../application/use-cases/register-student.use-case';
import { RegisterTeacherDto } from '../application/use-cases/register-teacher.use-case';
import { CreateTutoringDto } from '../application/use-cases/create-tutoring.use-case';
import { CreateSubjectDto } from '../application/use-cases/create-subject.use-case';
import { AssistanceRecordItem } from '../application/use-cases/record-assistance.use-case';
import { RateTutoringDto } from '../application/use-cases/rate-tutoring.use-case';
import { db } from '../infrastructure/database/database';
import { runBusinessRulesTests } from '../tests/business-rules.test';

const BASE_URL = '/api';
let activeApiRequests = 0;
let slowApiRequests = 0;

function emitApiActivity() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('gt:api-activity', {
    detail: {
      active: activeApiRequests > 0,
      busy: activeApiRequests > 0 && slowApiRequests > 0
    }
  }));
}

function getStoredToken(): string | null {
  try {
    return localStorage.getItem('gt_auth_token');
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const tracksActivity = (options?.method || 'GET').toUpperCase() !== 'GET';
  let isSlowRequest = false;
  let slowTimer: number | undefined;
  if (tracksActivity) {
    activeApiRequests += 1;
    slowTimer = window.setTimeout(() => {
      isSlowRequest = true;
      slowApiRequests += 1;
      emitApiActivity();
    }, 300);
    emitApiActivity();
  }
  try {
    const token = getStoredToken();
    const authHeaders: Record<string, string> = {};
    if (token) {
      authHeaders['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options?.headers || {})
      },
      ...options
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error(`[ApiClient] Error en petición ${endpoint}:`, err);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err.message || 'Error al comunicarse con el servidor backend.'
      }
    };
  } finally {
    if (tracksActivity) {
      if (slowTimer !== undefined) window.clearTimeout(slowTimer);
      activeApiRequests = Math.max(0, activeApiRequests - 1);
      if (isSlowRequest) slowApiRequests = Math.max(0, slowApiRequests - 1);
      emitApiActivity();
    }
  }
}

export class ApiClient {
  private static notifyListeners() {
    db.notify();
  }

  // --- HEALTH & STATUS ---
  public static async getHealth(): Promise<{ status: string; database: string; error?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      return await res.json();
    } catch {
      return { status: 'error', database: 'Desconectado', error: 'No se pudo conectar con el servidor' };
    }
  }

  // --- AUTH ---
  public static async login(
    identity: string,
    password?: string,
    role?: UserRole
  ): Promise<ApiResponse<User>> {
    const res = await request<User & { token?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: identity, password, role })
    });
    if (res.success && res.data) {
      // Solo-cookie: no se persiste token en localStorage; la cookie HttpOnly la maneja el navegador.
      // Se conserva lectura legacy de gt_auth_token para sesiones antiguas hasta que expiren.
      ApiClient.notifyListeners();
    }
    return res;
  }

  public static async getAuthMe(): Promise<ApiResponse<User>> {
    return request<User>('/auth/me');
  }

  public static async registerStudent(dto: RegisterStudentDto): Promise<ApiResponse<User>> {
    const res = await request<User & { token?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dto)
    });
    if (res.success && res.data) {
      // Solo-cookie: no se persiste token en localStorage.
      ApiClient.notifyListeners();
    }
    return res;
  }

  public static async registerStudentByAdmin(
    dto: Omit<RegisterStudentDto, 'password' | 'confirmPassword'>
  ): Promise<ApiResponse<User & { temporaryPassword: string }>> {
    const res = await request<User & { temporaryPassword: string }>('/admin/students', {
      method: 'POST',
      body: JSON.stringify(dto)
    });
    if (res.success) ApiClient.notifyListeners();
    return res;
  }

  public static async registerTeacher(
    dto: RegisterTeacherDto
  ): Promise<ApiResponse<User & { temporaryPassword?: string }>> {
    const res = await request<User & { temporaryPassword?: string }>('/auth/register-teacher', {
      method: 'POST',
      body: JSON.stringify(dto)
    });
    if (res.success && res.data) {
      ApiClient.notifyListeners();
    }
    return res;
  }

  public static async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST', body: JSON.stringify({}) });
    } catch {}
    try {
      localStorage.removeItem('gt_auth_token');
      localStorage.removeItem('gt_auth_user');
    } catch {}
    ApiClient.notifyListeners();
  }

  public static async changePassword(
    newPassword: string,
    confirmPassword?: string
  ): Promise<ApiResponse<User>> {
    const res = await request<User & { token?: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword, confirmPassword })
    });
    if (res.success && res.data) {
      // Solo-cookie: no se persiste token en localStorage.
      ApiClient.notifyListeners();
    }
    return res;
  }

  public static async refreshSession(): Promise<ApiResponse<User>> {
    const res = await request<User>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (res.success) ApiClient.notifyListeners();
    return res;
  }

  public static async forgotPassword(identity: string): Promise<ApiResponse<{ debugToken?: string }>> {
    return request<{ debugToken?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identity })
    });
  }

  public static async resetPassword(token: string, newPassword: string): Promise<ApiResponse<void>> {
    return request<void>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    });
  }

  public static clearLocalSession(): void {
    try {
      localStorage.removeItem('gt_auth_token');
      localStorage.removeItem('gt_auth_user');
      localStorage.removeItem('gt_auth_user_id');
    } catch {}
    ApiClient.notifyListeners();
  }

  // --- TUTORINGS ---
  public static async getTutorings(): Promise<ApiResponse<Tutoring[]>> {
    return request<Tutoring[]>('/tutorings');
  }

  public static async createTutoring(dto: CreateTutoringDto, user: User): Promise<ApiResponse<Tutoring>> {
    return request<Tutoring>('/tutorings', {
      method: 'POST',
      body: JSON.stringify({ ...dto, petitionerId: user.id })
    });
  }

  public static async approveTutoring(tutoringId: string, space: string, approver: User, block: string = '', maxParticipants?: number): Promise<ApiResponse<Tutoring>> {
    return request<Tutoring>(`/tutorings/${tutoringId}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ space, block, maxParticipants, approverId: approver.id })
    });
  }

  public static async cancelTutoring(tutoringId: string, reason: string, user: User): Promise<ApiResponse<Tutoring>> {
    return request<Tutoring>(`/tutorings/${tutoringId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason, userId: user.id })
    });
  }

  public static async startTutoring(tutoringId: string, teacher: User): Promise<ApiResponse<Tutoring>> {
    return request<Tutoring>(`/tutorings/${tutoringId}/start`, {
      method: 'PATCH',
      body: JSON.stringify({ teacherId: teacher.id })
    });
  }

  public static async finishTutoring(tutoringId: string, teacher: User, teacherComment?: string, records?: AssistanceRecordItem[]): Promise<ApiResponse<Tutoring>> {
    return request<Tutoring>(`/tutorings/${tutoringId}/stop`, {
      method: 'PATCH',
      body: JSON.stringify({ teacherId: teacher.id, teacherComment, records })
    });
  }

  public static async joinTutoring(tutoringId: string, student: User): Promise<ApiResponse<Tutoring>> {
    return request<Tutoring>(`/tutorings/${tutoringId}/join`, {
      method: 'POST',
      body: JSON.stringify({ studentId: student.id })
    });
  }

  public static async withdrawFromTutoring(tutoringId: string): Promise<ApiResponse<{ id: string }>> {
    return request<{ id: string }>(`/tutorings/${tutoringId}/participants/me`, {
      method: 'DELETE',
      body: JSON.stringify({})
    });
  }

  public static async recordAssistance(
    tutoringId: string,
    records: AssistanceRecordItem[],
    teacher: User
  ): Promise<ApiResponse<Tutoring>> {
    return request<Tutoring>(`/tutorings/${tutoringId}/assistance`, {
      method: 'POST',
      body: JSON.stringify({ records, teacherId: teacher.id })
    });
  }

  public static async rateTutoring(dto: RateTutoringDto, student: User): Promise<ApiResponse<Tutoring>> {
    return request<Tutoring>(`/tutorings/${dto.tutoringId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ score: dto.score, studentComment: dto.studentComment, studentId: student.id })
    });
  }

  // --- CATALOGS ---
  public static async getSubjects(): Promise<ApiResponse<SubjectCourse[]>> {
    return request<SubjectCourse[]>('/subjects');
  }

  public static async createSubject(dto: CreateSubjectDto, adminUser: User): Promise<ApiResponse<SubjectCourse>> {
    const res = await request<SubjectCourse>('/subjects', {
      method: 'POST',
      body: JSON.stringify({ ...dto, adminId: adminUser.id })
    });
    if (res.success) {
      ApiClient.notifyListeners();
    }
    return res;
  }

  public static async toggleSubjectActive(subjectId: string, adminUser: User): Promise<ApiResponse<SubjectCourse>> {
    const res = await request<SubjectCourse>(`/subjects/${subjectId}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ adminId: adminUser.id })
    });
    if (res.success) {
      ApiClient.notifyListeners();
    }
    return res;
  }

  public static async deleteSubject(subjectId: string, adminUser: User): Promise<ApiResponse<SubjectCourse>> {
    const res = await request<SubjectCourse>(`/subjects/${subjectId}`, {
      method: 'DELETE',
      body: JSON.stringify({ adminId: adminUser.id })
    });
    if (res.success) {
      ApiClient.notifyListeners();
    }
    return res;
  }

  // --- CAREERS ---
  public static async getCareers(): Promise<ApiResponse<Career[]>> {
    return request<Career[]>('/careers');
  }

  public static async createCareer(
    dto: { name: string; codePrefix: string; numberOfSemesters: number },
    adminUser: User
  ): Promise<ApiResponse<Career>> {
    const res = await request<Career>('/careers', {
      method: 'POST',
      body: JSON.stringify({ ...dto, adminId: adminUser.id })
    });
    if (res.success) {
      ApiClient.notifyListeners();
    }
    return res;
  }

  public static async updateCareer(
    careerId: string,
    dto: { name: string; codePrefix: string; numberOfSemesters: number },
    adminUser: User
  ): Promise<ApiResponse<Career>> {
    const res = await request<Career>(`/careers/${careerId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...dto, adminId: adminUser.id })
    });
    if (res.success) {
      ApiClient.notifyListeners();
    }
    return res;
  }

  public static async toggleCareerActive(careerId: string, adminUser: User): Promise<ApiResponse<Career>> {
    const res = await request<Career>(`/careers/${careerId}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ adminId: adminUser.id })
    });
    if (res.success) {
      ApiClient.notifyListeners();
    }
    return res;
  }

  public static async deleteCareer(careerId: string, adminUser: User): Promise<ApiResponse<Career>> {
    const res = await request<Career>(`/careers/${careerId}`, {
      method: 'DELETE',
      body: JSON.stringify({ adminId: adminUser.id })
    });
    if (res.success) {
      ApiClient.notifyListeners();
    }
    return res;
  }

  public static async getScheduleSlots(): Promise<ApiResponse<ScheduleSlot[]>> {
    return request<ScheduleSlot[]>('/schedules');
  }

  public static async getSections(): Promise<ApiResponse<SectionClassroom[]>> {
    return request<SectionClassroom[]>('/sections');
  }

  public static async getTeacherAvailability(): Promise<ApiResponse<TeacherAvailability[]>> {
    return request<TeacherAvailability[]>('/availability');
  }

  public static async toggleTeacherAvailability(id: string): Promise<ApiResponse<TeacherAvailability>> {
    const res = await request<TeacherAvailability>(`/availability/${id}/toggle`, {
      method: 'PATCH'
    });
    if (res.success) {
      ApiClient.notifyListeners();
    }
    return res;
  }

  public static async addTeacherAvailability(
    teacher: User,
    subjectCourseId: string,
    scheduleSlotId: string
  ): Promise<ApiResponse<TeacherAvailability>> {
    const res = await request<TeacherAvailability>('/availability', {
      method: 'POST',
      body: JSON.stringify({ teacherId: teacher.id, subjectCourseId, scheduleSlotId })
    });
    if (res.success) {
      ApiClient.notifyListeners();
    }
    return res;
  }

  public static async deleteTeacherAvailability(id: string, teacher: User): Promise<ApiResponse<boolean>> {
    const res = await request<boolean>(`/availability/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ teacherId: teacher.id })
    });
    if (res.success) {
      ApiClient.notifyListeners();
    }
    return res;
  }

  public static async setTeacherAvailabilityBatch(
    teacher: User,
    subjectCourseId: string,
    scheduleSlotIds: string[]
  ): Promise<ApiResponse<TeacherAvailability[]>> {
    const res = await request<TeacherAvailability[]>('/availability/batch', {
      method: 'POST',
      body: JSON.stringify({ teacherId: teacher.id, subjectCourseId, scheduleSlotIds })
    });
    if (res.success) {
      ApiClient.notifyListeners();
    }
    return res;
  }

  // --- TEACHER SUBJECTS (catálogo) ---
  public static async getTeacherSubjects(teacherId: string): Promise<ApiResponse<SubjectCourse[]>> {
    return request<SubjectCourse[]>(`/teachers/${teacherId}/subjects`);
  }

  public static async setTeacherSubjects(
    teacherId: string,
    subjectIds: string[],
    actor: User
  ): Promise<ApiResponse<SubjectCourse[]>> {
    const res = await request<SubjectCourse[]>(`/teachers/${teacherId}/subjects`, {
      method: 'PUT',
      body: JSON.stringify({ actorId: actor.id, subjectIds })
    });
    if (res.success) {
      ApiClient.notifyListeners();
    }
    return res;
  }

  public static async updateTeacherProfile(
    teacherId: string,
    dto: { fullName?: string; email?: string; careerId?: string; subjectIds?: string[] },
    admin: User
  ): Promise<ApiResponse<User>> {
    const res = await request<User>(`/teachers/${teacherId}`, {
      method: 'PUT',
      body: JSON.stringify({ adminId: admin.id, ...dto })
    });
    if (res.success) {
      ApiClient.notifyListeners();
    }
    return res;
  }

  // --- USERS ---
  public static async getUsers(): Promise<ApiResponse<User[]>> {
    return request<User[]>('/users');
  }

  public static async updateUserProfile(
    userId: string,
    data: { photoUrl?: string | null; alias?: string },
    actor: User
  ): Promise<ApiResponse<User>> {
    const res = await request<User>(`/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (res.success && res.data) {
      db.updateUserProfile(userId, res.data);
      try {
        const stored = localStorage.getItem('gt_auth_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.id === userId) {
            localStorage.setItem('gt_auth_user', JSON.stringify(res.data));
          }
        }
      } catch {}
      ApiClient.notifyListeners();
    }
    return res;
  }

  public static async toggleUserActive(userId: string, adminUser: User): Promise<ApiResponse<User>> {
    const res = await request<User>(`/users/${userId}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ adminId: adminUser.id })
    });
    if (res.success) {
      ApiClient.notifyListeners();
    }
    return res;
  }

  public static async deleteUser(userId: string, adminUser: User): Promise<ApiResponse<User>> {
    const res = await request<User>(`/users/${userId}`, {
      method: 'DELETE',
      body: JSON.stringify({ adminId: adminUser.id })
    });
    if (res.success) {
      ApiClient.notifyListeners();
    }
    return res;
  }

  // --- NOTIFICATIONS ---
  public static async getNotifications(userId: string): Promise<ApiResponse<Notification[]>> {
    return request<Notification[]>(`/notifications/${userId}`);
  }

  public static async markNotificationRead(id: string): Promise<ApiResponse<void>> {
    const res = await request<void>(`/notifications/${id}/read`, {
      method: 'PATCH'
    });
    if (res.success) {
      ApiClient.notifyListeners();
    }
    return res;
  }

  public static async markAllNotificationsRead(userId: string): Promise<ApiResponse<void>> {
    const res = await request<void>(`/notifications/read-all/${userId}`, {
      method: 'POST'
    });
    if (res.success) {
      ApiClient.notifyListeners();
    }
    return res;
  }

  // --- BINNACLE ---
  public static async getBinnacle(): Promise<ApiResponse<BinnacleEntry[]>> {
    return request<BinnacleEntry[]>('/binnacle');
  }

  // --- INSTITUTION ---
  public static async getInstitution(): Promise<ApiResponse<InstitutionInfo>> {
    return request<InstitutionInfo>('/institution');
  }

  public static async updateInstitution(info: Partial<InstitutionInfo>, user: User): Promise<ApiResponse<InstitutionInfo>> {
    const res = await request<InstitutionInfo>('/institution', {
      method: 'PUT',
      body: JSON.stringify({ ...info, adminId: user.id })
    });
    if (res.success) {
      ApiClient.notifyListeners();
    }
    return res;
  }

  // --- ANALYTICS ---
  public static async getAnalytics(): Promise<ApiResponse<any>> {
    return request<any>('/analytics');
  }

  // --- TESTS ---
  public static runTests() {
    return runBusinessRulesTests();
  }
}
