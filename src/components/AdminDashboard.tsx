import React, { useState } from 'react';
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
} from '../core/types';
import { ApiClient } from '../core/presentation/api-client';
import { StatusBadge } from './StatusBadge';
import { AdminSubjectsTab } from './AdminSubjectsTab';
import { AdminTeachersTab } from './AdminTeachersTab';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  LayoutDashboard,
  CheckCircle,
  XCircle,
  Users,
  Shield,
  FileText,
  Building,
  Check,
  AlertCircle,
  Search,
  CheckCheck,
  Ban,
  ShieldCheck,
  Calendar,
  Clock,
  Filter,
  BookOpen,
  Briefcase,
  Trash2,
  GraduationCap,
  Star,
  Video,
  MapPin,
  CheckCircle2,
  TrendingUp,
  Award,
  RefreshCw,
  Sparkles,
  Activity,
  CalendarCheck,
  Paperclip
} from 'lucide-react';
import { AttachmentViewerModal } from './AttachmentViewerModal';

interface AdminDashboardProps {
  currentUser: User;
  tutorings: Tutoring[];
  users: User[];
  sections: SectionClassroom[];
  subjects: SubjectCourse[];
  schedules?: ScheduleSlot[];
  availabilities?: TeacherAvailability[];
  binnacle: BinnacleEntry[];
  institution: InstitutionInfo;
  analytics: {
    totalTutorings: number;
    pendingCount: number;
    approvedCount: number;
    inProgressCount: number;
    completedCount: number;
    cancelledCount: number;
    averageRating: number;
    totalStudents: number;
    totalTeachers: number;
    attendanceRate?: number;
    completionRate?: number;
    cancellationRate?: number;
    totalReviews?: number;
    modalityDistribution?: { name: string; count: number; percentage: number; color: string }[];
    statusDistribution: { name: string; count: number; color: string }[];
    courseFrequency: { subject: string; fullName?: string; count: number }[];
    ratingDistribution: { stars: string; count: number; color?: string }[];
    teacherWorkload?: { name: string; total: number; completed: number; avgRating: number }[];
    timeline?: { date: string; count: number }[];
  } | null;
  onRefresh: () => void;
  onOpenRegister: () => void;
  onOpenTests: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  tutorings,
  users,
  sections,
  subjects,
  schedules = [],
  availabilities = [],
  binnacle,
  institution,
  analytics,
  onRefresh,
  onOpenRegister,
  onOpenTests
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'subjects' | 'teachers' | 'tutorings' | 'users' | 'binnacle' | 'institution'
  >('overview');

  // Filter for tutorings list
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tutoringSearch, setTutoringSearch] = useState<string>('');
  const [viewingAttachment, setViewingAttachment] = useState<{ fileName: string; fileUrl: string } | null>(null);

  // Approval Modal State
  const [approvingTutoring, setApprovingTutoring] = useState<Tutoring | null>(null);
  const [assignedSpace, setAssignedSpace] = useState<string>('');
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approving, setApproving] = useState<boolean>(false);

  // Cancellation Modal State
  const [cancellingTutoring, setCancellingTutoring] = useState<Tutoring | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<boolean>(false);

  // User Management filters
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userSearch, setUserSearch] = useState<string>('');

  // User Deletion state
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteUserLoading, setDeleteUserLoading] = useState<boolean>(false);
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);
  const [deleteUserSuccess, setDeleteUserSuccess] = useState<string | null>(null);

  // Institution Edit Form
  const [instName, setInstName] = useState(institution.name);
  const [instMission, setInstMission] = useState(institution.mission);
  const [instVision, setInstVision] = useState(institution.vision);
  const [instPhone, setInstPhone] = useState(institution.phone);
  const [instEmail, setInstEmail] = useState(institution.email);
  const [instAddress, setInstAddress] = useState(institution.address);
  const [instSavedMsg, setInstSavedMsg] = useState(false);

  // Filtered Tutorings
  const filteredTutorings = tutorings.filter((t) => {
    const matchesStatus = statusFilter === 'all' || String(t.status) === statusFilter;
    const matchesQuery =
      t.code.toLowerCase().includes(tutoringSearch.toLowerCase()) ||
      t.subject.toLowerCase().includes(tutoringSearch.toLowerCase()) ||
      t.petitionerStudentName.toLowerCase().includes(tutoringSearch.toLowerCase()) ||
      t.teacherName.toLowerCase().includes(tutoringSearch.toLowerCase()) ||
      t.subjectCourseName.toLowerCase().includes(tutoringSearch.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesQuery =
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.account.toLowerCase().includes(userSearch.toLowerCase());
    return matchesRole && matchesQuery;
  });

  // Handle Approve Tutoring
  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingTutoring) return;
    setApprovalError(null);
    setApproving(true);

    const res = await ApiClient.approveTutoring(approvingTutoring.id, assignedSpace, currentUser);
    setApproving(false);

    if (res.success) {
      setApprovingTutoring(null);
      setAssignedSpace('');
      onRefresh();
    } else {
      setApprovalError(res.error?.message || 'Error al aprobar la tutoría.');
    }
  };

  // Handle Cancel Tutoring
  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingTutoring) return;
    setCancelError(null);
    setCancelling(true);

    const res = await ApiClient.cancelTutoring(cancellingTutoring.id, cancelReason, currentUser);
    setCancelling(false);

    if (res.success) {
      setCancellingTutoring(null);
      setCancelReason('');
      onRefresh();
    } else {
      setCancelError(res.error?.message || 'Error al cancelar la tutoría.');
    }
  };

  // Toggle User Active/Inactive
  const handleToggleUserActive = async (userId: string) => {
    const res = await ApiClient.toggleUserActive(userId, currentUser);
    if (res.success) {
      onRefresh();
    } else {
      alert(res.error?.message || 'Error al cambiar estado.');
    }
  };

  // Delete User
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleteUserLoading(true);
    setDeleteUserError(null);
    const res = await ApiClient.deleteUser(deletingUser.id, currentUser);
    setDeleteUserLoading(false);
    if (res.success) {
      setDeleteUserSuccess(`El usuario "${deletingUser.fullName}" (@${deletingUser.username}) ha sido eliminado permanentemente.`);
      setDeletingUser(null);
      onRefresh();
      setTimeout(() => setDeleteUserSuccess(null), 4000);
    } else {
      setDeleteUserError(res.error?.message || 'Error al eliminar el usuario.');
    }
  };

  // Save Institution
  const handleSaveInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    setInstSavedMsg(false);
    const res = await ApiClient.updateInstitution(
      {
        name: instName,
        mission: instMission,
        vision: instVision,
        phone: instPhone,
        email: instEmail,
        address: instAddress
      },
      currentUser
    );
    if (res.success) {
      setInstSavedMsg(true);
      setTimeout(() => setInstSavedMsg(false), 3000);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-2">
        <button
          id="tab-admin-overview"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[#11770e] text-white shadow-xs'
              : 'text-stone-600 hover:bg-[#eaf8ea] hover:text-[#11770e]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Métricas y Estadísticas</span>
        </button>

        <button
          id="tab-admin-subjects"
          onClick={() => setActiveTab('subjects')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'subjects'
              ? 'bg-[#11770e] text-white shadow-xs'
              : 'text-stone-600 hover:bg-[#eaf8ea] hover:text-[#11770e]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Gestión de Asignaturas ({subjects.length})</span>
        </button>

        <button
          id="tab-admin-teachers"
          onClick={() => setActiveTab('teachers')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'teachers'
              ? 'bg-[#11770e] text-white shadow-xs'
              : 'text-stone-600 hover:bg-[#eaf8ea] hover:text-[#11770e]'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Gestión de Docentes ({users.filter((u) => u.role === UserRole.TEACHER).length})</span>
        </button>

        <button
          id="tab-admin-tutorings"
          onClick={() => setActiveTab('tutorings')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'tutorings'
              ? 'bg-[#11770e] text-white shadow-xs'
              : 'text-stone-600 hover:bg-[#eaf8ea] hover:text-[#11770e]'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>Aprobación de Solicitudes ({tutorings.filter((t) => t.status === TutoringStatus.PENDING).length})</span>
        </button>

        <button
          id="tab-admin-users"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'users'
              ? 'bg-[#11770e] text-white shadow-xs'
              : 'text-stone-600 hover:bg-[#eaf8ea] hover:text-[#11770e]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Estudiantes y Cuentas ({users.length})</span>
        </button>

        <button
          id="tab-admin-binnacle"
          onClick={() => setActiveTab('binnacle')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'binnacle'
              ? 'bg-[#11770e] text-white shadow-xs'
              : 'text-stone-600 hover:bg-[#eaf8ea] hover:text-[#11770e]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Bitácora de Auditoría</span>
        </button>

        <button
          id="tab-admin-institution"
          onClick={() => setActiveTab('institution')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'institution'
              ? 'bg-[#11770e] text-white shadow-xs'
              : 'text-stone-600 hover:bg-[#eaf8ea] hover:text-[#11770e]'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Configuración Institucional</span>
        </button>
      </div>

      {/* TAB: ASIGNATURAS */}
      {activeTab === 'subjects' && (
        <AdminSubjectsTab
          currentUser={currentUser}
          subjects={subjects}
          onRefresh={onRefresh}
        />
      )}

      {/* TAB: DOCENTES */}
      {activeTab === 'teachers' && (
        <AdminTeachersTab
          currentUser={currentUser}
          users={users}
          subjects={subjects}
          schedules={schedules}
          availabilities={availabilities}
          onRefresh={onRefresh}
        />
      )}

      {/* TAB 1: OVERVIEW & CHARTS */}
      {activeTab === 'overview' && (() => {
        // Fallback or enriched stats from real-time props
        const totalTuts = tutorings.length;
        const pendingTuts = tutorings.filter((t) => t.status === TutoringStatus.PENDING).length;
        const approvedTuts = tutorings.filter((t) => t.status === TutoringStatus.APPROVED).length;
        const inProgTuts = tutorings.filter((t) => t.status === TutoringStatus.IN_PROGRESS).length;
        const completedTuts = tutorings.filter((t) => t.status === TutoringStatus.COMPLETED).length;
        const cancelledTuts = tutorings.filter((t) => t.status === TutoringStatus.CANCELLED).length;

        const ratedList = tutorings.filter((t) => t.score > 0);
        const avgScore =
          analytics?.averageRating ??
          (ratedList.length > 0
            ? Number((ratedList.reduce((acc, t) => acc + t.score, 0) / ratedList.length).toFixed(1))
            : 5.0);

        const compRate =
          analytics?.completionRate ??
          (totalTuts > 0 ? Math.round((completedTuts / totalTuts) * 100) : 0);

        const attRate = analytics?.attendanceRate ?? 95;

        const presencialCount = tutorings.filter((t) => t.modality === TutoringModality.PRESENCIAL).length;
        const virtualCount = tutorings.filter((t) => t.modality === TutoringModality.VIRTUAL).length;

        const modalityData = analytics?.modalityDistribution || [
          {
            name: 'Presencial',
            count: presencialCount,
            percentage: totalTuts > 0 ? Math.round((presencialCount / totalTuts) * 100) : 0,
            color: '#0EA5E9'
          },
          {
            name: 'Virtual',
            count: virtualCount,
            percentage: totalTuts > 0 ? Math.round((virtualCount / totalTuts) * 100) : 0,
            color: '#8B5CF6'
          }
        ];

        const statusData = analytics?.statusDistribution || [
          { name: 'Pendientes', count: pendingTuts, color: '#F59E0B' },
          { name: 'Aprobadas', count: approvedTuts, color: '#7ce200' },
          { name: 'En Proceso', count: inProgTuts, color: '#3B82F6' },
          { name: 'Finalizadas', count: completedTuts, color: '#11770e' },
          { name: 'Canceladas', count: cancelledTuts, color: '#EF4444' }
        ];

        const activeSubjects = subjects.filter((s) => s.isActive);
        const courseData = activeSubjects
          .map((s) => {
            const count = tutorings.filter(
              (t) =>
                t.subjectCourseId === s.id ||
                (t.subjectCourseName && t.subjectCourseName.trim().toLowerCase() === s.name.trim().toLowerCase())
            ).length;
            return {
              subject: s.name.length > 22 ? s.name.substring(0, 20) + '...' : s.name,
              fullName: s.name,
              count
            };
          })
          .sort((a, b) => b.count - a.count);

        const ratingData = analytics?.ratingDistribution || [
          { stars: '5 Estrellas', count: tutorings.filter((t) => t.score >= 5).length, color: '#10B981' },
          { stars: '4 Estrellas', count: tutorings.filter((t) => t.score === 4).length, color: '#3B82F6' },
          { stars: '3 Estrellas', count: tutorings.filter((t) => t.score === 3).length, color: '#F59E0B' },
          { stars: '2 Estrellas', count: tutorings.filter((t) => t.score === 2).length, color: '#F97316' },
          { stars: '1 Estrella', count: tutorings.filter((t) => t.score === 1).length, color: '#EF4444' }
        ];

        const teacherWorkload = analytics?.teacherWorkload || users
          .filter((u) => u.role === UserRole.TEACHER)
          .map((t) => ({
            name: t.fullName,
            total: tutorings.filter((tut) => tut.teacherId === t.id).length,
            completed: tutorings.filter((tut) => tut.teacherId === t.id && tut.status === TutoringStatus.COMPLETED).length,
            avgRating: 5.0
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        const topSubject = courseData.length > 0 && courseData[0].count > 0
          ? courseData[0]
          : null;

        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Métricas y Rendimiento Académico</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="PostgreSQL Activo" />
                </h2>
                <p className="text-xs text-slate-500">
                  Monitoreo de tutorías, asistencia estudiantil y efectividad docente en tiempo real.
                </p>
              </div>

              <button
                onClick={onRefresh}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-stone-200 hover:border-stone-300 hover:bg-[#fffaed] text-stone-700 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer w-fit"
                title="Actualizar datos desde la base de datos"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#11770e]" />
                <span>Actualizar Métricas</span>
              </button>
            </div>

            {/* 2. TOP PRIMARY KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
              {/* Card 1: Total */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Total Solicitudes</span>
                  <div className="w-8 h-8 rounded-xl bg-[#eaf8ea] text-[#11770e] flex items-center justify-center">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-stone-900 mt-2">{totalTuts}</div>
                <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-1">
                  <span className="text-[#11770e] font-bold">{pendingTuts + approvedTuts + inProgTuts}</span> activas en curso
                </div>
              </div>

              {/* Card 2: Completion Rate */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tasa de Éxito</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-emerald-600 mt-2">{compRate}%</div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${compRate}%` }} />
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{completedTuts} tutorías concluidas</div>
              </div>

              {/* Card 3: Satisfaction */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Satisfacción</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                  </div>
                </div>
                <div className="text-3xl font-black text-amber-600 mt-2 flex items-baseline gap-1">
                  {avgScore}
                  <span className="text-xs font-semibold text-slate-400">/ 5.0</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {ratedList.length} {ratedList.length === 1 ? 'reseña recibida' : 'reseñas de alumnos'}
                </div>
              </div>

              {/* Card 4: Attendance */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Asistencia</span>
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-cyan-700 mt-2">{attRate}%</div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${attRate}%` }} />
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Estudiantes que asisten</div>
              </div>

              {/* Card 5: Docentes */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Docentes Tutores</span>
                  <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-violet-700 mt-2">
                  {users.filter((u) => u.role === UserRole.TEACHER).length}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Docentes habilitados</div>
              </div>

              {/* Card 6: Estudiantes */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estudiantes</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-blue-700 mt-2">
                  {users.filter((u) => u.role === UserRole.STUDENT).length}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Alumnos activos en FET</div>
              </div>
            </div>

            {/* 3. PIPELINE DE ESTADOS EN EL CICLO DE TUTORÍAS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Flujo de Estados de las Tutorías</h3>
                  <p className="text-xs text-slate-500">Distribución de las solicitudes a lo largo del ciclo académico</p>
                </div>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {totalTuts} Registros Totales
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                {/* Pendientes */}
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs text-amber-800 font-bold">
                    <span>Pendientes</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-amber-900">{pendingTuts}</div>
                  <div className="text-[11px] text-amber-700">
                    {totalTuts > 0 ? Math.round((pendingTuts / totalTuts) * 100) : 0}% del total
                  </div>
                </div>

                {/* Aprobadas */}
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs text-emerald-800 font-bold">
                    <span>Programadas</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-emerald-900">{approvedTuts}</div>
                  <div className="text-[11px] text-emerald-700">
                    {totalTuts > 0 ? Math.round((approvedTuts / totalTuts) * 100) : 0}% del total
                  </div>
                </div>

                {/* En Proceso */}
                <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs text-blue-800 font-bold">
                    <span>En Proceso</span>
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                  </div>
                  <div className="text-2xl font-black text-blue-900">{inProgTuts}</div>
                  <div className="text-[11px] text-blue-700">
                    {totalTuts > 0 ? Math.round((inProgTuts / totalTuts) * 100) : 0}% del total
                  </div>
                </div>

                {/* Finalizadas */}
                <div className="bg-[#eaf8ea] border border-[#bce6bc] rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs text-[#11770e] font-bold">
                    <span>Finalizadas</span>
                    <span className="w-2 h-2 rounded-full bg-[#11770e]" />
                  </div>
                  <div className="text-2xl font-black text-[#0d5c0b]">{completedTuts}</div>
                  <div className="text-[11px] text-[#11770e]">
                    {totalTuts > 0 ? Math.round((completedTuts / totalTuts) * 100) : 0}% del total
                  </div>
                </div>

                {/* Canceladas */}
                <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3.5 space-y-1 col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between text-xs text-rose-800 font-bold">
                    <span>Canceladas</span>
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                  </div>
                  <div className="text-2xl font-black text-rose-900">{cancelledTuts}</div>
                  <div className="text-[11px] text-rose-700">
                    {totalTuts > 0 ? Math.round((cancelledTuts / totalTuts) * 100) : 0}% del total
                  </div>
                </div>
              </div>
            </div>

            {/* 4. CHARTS SECTION - ROW 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Chart 1: Course Frequency */}
              <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Demanda por Asignatura</h4>
                    <p className="text-xs text-slate-500">Materias con mayor volumen de tutorías solicitadas</p>
                  </div>
                  {topSubject && (
                    <span className="text-[11px] font-semibold text-[#11770e] bg-[#eaf8ea] px-2.5 py-1 rounded-full border border-[#bce6bc]">
                      Top: {topSubject.subject}
                    </span>
                  )}
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={courseData} margin={{ top: 15, right: 15, left: -20, bottom: 25 }}>
                      <XAxis
                        dataKey="subject"
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        angle={-20}
                        textAnchor="end"
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#2b2b2b',
                          border: 'none',
                          borderRadius: '12px',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                        }}
                        itemStyle={{ color: '#7ce200' }}
                      />
                      <Bar dataKey="count" fill="#11770e" radius={[6, 6, 0, 0]} name="Tutorías Solicitadas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Status Distribution Donut */}
              <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Distribución de Estados</h4>
                  <p className="text-xs text-slate-500">Proporción actual del total de tutorías</p>
                </div>

                <div className="h-56 w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="count"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          border: 'none',
                          borderRadius: '12px',
                          color: '#FFFFFF',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center badge */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-slate-900">{totalTuts}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                  {statusData.map((s) => (
                    <div key={s.name} className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.name}:</span>
                      <strong className="text-slate-900">{s.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. CHARTS SECTION - ROW 2 (MODALITY & SATISFACTION) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Modality Donut */}
              <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Modalidad de Tutoría</h4>
                    <p className="text-xs text-slate-500">Preferencia entre sesiones presenciales y virtuales</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-sky-600" /> Presencial
                    </span>
                    <span className="mx-1">•</span>
                    <span className="flex items-center gap-1">
                      <Video className="w-3.5 h-3.5 text-purple-600" /> Virtual
                    </span>
                  </div>
                </div>

                <div className="h-52 w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={modalityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {modalityData.map((entry, index) => (
                          <Cell key={`modal-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          border: 'none',
                          borderRadius: '12px',
                          color: '#FFFFFF',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-sky-600" />
                      <div>
                        <div className="text-xs font-bold text-sky-950">Presencial</div>
                        <div className="text-[11px] text-sky-700">{presencialCount} tutorías</div>
                      </div>
                    </div>
                    <span className="text-sm font-extrabold text-sky-700">
                      {totalTuts > 0 ? Math.round((presencialCount / totalTuts) * 100) : 0}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-purple-600" />
                      <div>
                        <div className="text-xs font-bold text-purple-950">Virtual</div>
                        <div className="text-[11px] text-purple-700">{virtualCount} tutorías</div>
                      </div>
                    </div>
                    <span className="text-sm font-extrabold text-purple-700">
                      {totalTuts > 0 ? Math.round((virtualCount / totalTuts) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Ratings Distribution */}
              <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Evaluaciones de Estudiantes</h4>
                    <p className="text-xs text-slate-500">Desglose de calificaciones por nivel de satisfacción</p>
                  </div>
                  <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    Promedio: {avgScore} / 5.0
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  {ratingData.map((r) => {
                    const totalRatings = ratedList.length || 1;
                    const pct = Math.round((r.count / totalRatings) * 100);
                    return (
                      <div key={r.stars} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                            {r.stars}
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            {r.count} {r.count === 1 ? 'evaluación' : 'evaluaciones'} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: r.color || '#F59E0B' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 6. TEACHER WORKLOAD & EXECUTIVE INSIGHTS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Top Teachers */}
              <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Actividad Docente y Rendimiento</h4>
                    <p className="text-xs text-slate-500">Docentes con mayor volumen de atención tutorial</p>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Top tutores FET</span>
                </div>

                {teacherWorkload.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No hay registros de docentes aún.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {teacherWorkload.map((t, idx) => (
                      <div
                        key={t.name}
                        className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-[#eaf8ea] text-[#11770e] font-bold text-xs flex items-center justify-center border border-[#bce6bc]">
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{t.name}</div>
                            <div className="text-slate-500 text-[11px]">
                              {t.completed} de {t.total} sesiones completadas
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 text-[11px]">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                            {t.avgRating}
                          </span>
                          <span className="font-semibold text-[#11770e] bg-[#eaf8ea] px-2.5 py-0.5 rounded-lg text-xs border border-[#bce6bc]/60">
                            {t.total} {t.total === 1 ? 'tutoría' : 'tutorías'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Automated Executive Insights */}
              <div className="lg:col-span-5 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-5 rounded-2xl border border-indigo-100 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  <h4 className="text-sm font-bold text-slate-900">Resumen y Hallazgos Clave</h4>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-indigo-100/80 shadow-2xs space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      Eficiencia de Resolución
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      El <strong className="text-emerald-700 font-bold">{compRate}%</strong> de las solicitudes registradas se han impartido y finalizado exitosamente en el sistema.
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-indigo-100/80 shadow-2xs space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      Asignatura Líder
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      {topSubject ? (
                        <>
                          <strong className="text-indigo-700">{topSubject.fullName || topSubject.subject}</strong> encabeza las demandas con un total de <strong>{topSubject.count}</strong> tutorías solicitadas.
                        </>
                      ) : (
                        'No hay suficientes solicitudes de materias registradas aún.'
                      )}
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-indigo-100/80 shadow-2xs space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                      Calidad Percibida
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Los estudiantes han valorado la plataforma con un promedio general de <strong className="text-amber-700">{avgScore} sobre 5.0</strong>, reflejando un alto índice de satisfacción académica.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 2: TUTORING REQUESTS MANAGEMENT */}
      {activeTab === 'tutorings' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  id="search-admin-tutorings"
                  type="text"
                  value={tutoringSearch}
                  onChange={(e) => setTutoringSearch(e.target.value)}
                  placeholder="Buscar por código, alumno, materia..."
                  className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 w-64 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                id="select-filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 py-1.5 px-3 bg-white"
              >
                <option value="all">Todos los Estados</option>
                <option value={String(TutoringStatus.PENDING)}>Pendientes (-1)</option>
                <option value={String(TutoringStatus.APPROVED)}>Programadas (1)</option>
                <option value={String(TutoringStatus.IN_PROGRESS)}>En Proceso (0)</option>
                <option value={String(TutoringStatus.COMPLETED)}>Finalizadas (2)</option>
                <option value={String(TutoringStatus.CANCELLED)}>Canceladas (3)</option>
              </select>
            </div>

            <span className="text-xs text-slate-500">
              Mostrando {filteredTutorings.length} solicitudes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Solicitante</th>
                  <th className="px-4 py-3">Materia y Asunto</th>
                  <th className="px-4 py-3">Docente</th>
                  <th className="px-4 py-3">Fecha y Hora</th>
                  <th className="px-4 py-3">Espacio Asignado</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTutorings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      No se encontraron registros coincidentes.
                    </td>
                  </tr>
                ) : (
                  filteredTutorings.map((tut) => (
                    <tr key={tut.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5 font-bold text-indigo-700">{tut.code}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">{tut.petitionerStudentName}</div>
                        <div className="text-[11px] text-slate-400">{tut.petitionerAccount}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800">{tut.subject}</div>
                        <div className="text-[11px] text-slate-500">{tut.subjectCourseName}</div>
                        {tut.attachmentUrl ? (
                          <button
                            type="button"
                            onClick={() => setViewingAttachment({ fileName: tut.attachmentName || 'Archivo adjunto', fileUrl: tut.attachmentUrl! })}
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#11770e] hover:text-[#0d5c0b] hover:underline bg-[#eaf8ea] px-2 py-0.5 rounded cursor-pointer transition-colors"
                            title="Ver archivo adjunto"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span className="truncate max-w-[130px]">{tut.attachmentName || 'Ver adjunto'}</span>
                          </button>
                        ) : tut.attachmentName ? (
                          <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            <Paperclip className="w-3 h-3" />
                            <span className="truncate max-w-[130px]">{tut.attachmentName}</span>
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">{tut.teacherName}</td>
                      <td className="px-4 py-3.5 text-slate-600">
                        <div>{tut.reservDate}</div>
                        <div className="text-[11px] text-slate-400">{tut.scheduleLabel}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-[150px] truncate">{tut.space}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={tut.status} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {tut.status === TutoringStatus.PENDING && (
                            <>
                              <button
                                id={`btn-open-approve-${tut.id}`}
                                onClick={() => {
                                  setApprovingTutoring(tut);
                                  setAssignedSpace(
                                    tut.modality === TutoringModality.PRESENCIAL
                                      ? sections[0]?.name || 'Aula 101'
                                      : 'https://meet.google.com/gt-tutoria-live'
                                  );
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-xs transition-colors flex items-center gap-1 shadow-2xs"
                                title="Aprobar y asignar aula o enlace"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Aprobar
                              </button>

                              <button
                                id={`btn-open-cancel-${tut.id}`}
                                onClick={() => setCancellingTutoring(tut)}
                                className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-md font-medium text-xs transition-colors"
                                title="Rechazar solicitud"
                              >
                                Rechazar
                              </button>
                            </>
                          )}

                          {tut.status === TutoringStatus.APPROVED && (
                            <button
                              id={`btn-open-cancel-approved-${tut.id}`}
                              onClick={() => setCancellingTutoring(tut)}
                              className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-md font-medium text-xs transition-colors"
                              title="Cancelar tutoría programada"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  id="search-admin-users"
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Buscar usuario por nombre o cuenta..."
                  className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 w-64 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                id="select-filter-user-role"
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 py-1.5 px-3 bg-white"
              >
                <option value="all">Todos los Roles</option>
                <option value={UserRole.STUDENT}>Estudiantes</option>
                <option value={UserRole.TEACHER}>Docentes</option>
                <option value={UserRole.ADMIN}>Administradores</option>
              </select>
            </div>

            <button
              id="btn-admin-add-user"
              onClick={onOpenRegister}
              className="px-3.5 py-2 bg-[#11770e] hover:bg-[#0d5c0b] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              + Registrar Nuevo Estudiante
            </button>
          </div>

          {deleteUserSuccess && (
            <div className="m-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{deleteUserSuccess}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nombre Completo</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Cuenta Institucional</th>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-800">{u.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">@{u.username}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.account}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.id !== currentUser.id && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`btn-toggle-user-${u.id}`}
                            onClick={() => handleToggleUserActive(u.id)}
                            className={`px-2 py-1 rounded text-xs font-semibold border transition-colors ${
                              u.isActive
                                ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {u.isActive ? 'Desactivar' : 'Activar'}
                          </button>

                          <button
                            id={`btn-delete-user-${u.id}`}
                            onClick={() => {
                              setDeletingUser(u);
                              setDeleteUserError(null);
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
                            title={u.role === UserRole.STUDENT ? 'Eliminar estudiante definitivamente' : 'Eliminar usuario'}
                          >
                            <Trash2 className="w-3 h-3 text-rose-500" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BINNACLE */}
      {activeTab === 'binnacle' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">
              Bitácora de Auditoría del Sistema (Original `binnacle.php`)
            </h3>
            <span className="text-xs text-slate-500">{binnacle.length} eventos registrados</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Fecha y Hora</th>
                  <th className="px-4 py-3">Tipo de Evento</th>
                  <th className="px-4 py-3">Descripción de la Acción</th>
                  <th className="px-4 py-3">Usuario Responsable</th>
                  <th className="px-4 py-3">Dirección IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {binnacle.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{b.timestamp}</td>
                    <td className="px-4 py-2.5 font-bold text-indigo-700">{b.eventType}</td>
                    <td className="px-4 py-2.5 text-slate-800 font-sans text-xs">{b.description}</td>
                    <td className="px-4 py-2.5 text-slate-600">{b.username}</td>
                    <td className="px-4 py-2.5 text-slate-400">{b.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: INSTITUTION SETTINGS */}
      {activeTab === 'institution' && (
        <div className="max-w-3xl bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Datos Institucionales del Centro Educativo (Original `institution.php`)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Parámetros de cabecera mostrados en constancias y notificaciones del sistema.
            </p>
          </div>

          <form onSubmit={handleSaveInstitution} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Nombre Institucional</label>
              <input
                type="text"
                value={instName}
                onChange={(e) => setInstName(e.target.value)}
                required
                className="w-full text-sm rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Misión Institucional</label>
                <textarea
                  rows={3}
                  value={instMission}
                  onChange={(e) => setInstMission(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Visión Institucional</label>
                <textarea
                  rows={3}
                  value={instVision}
                  onChange={(e) => setInstVision(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Teléfono</label>
                <input
                  type="text"
                  value={instPhone}
                  onChange={(e) => setInstPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={instEmail}
                  onChange={(e) => setInstEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Dirección del Campus</label>
                <input
                  type="text"
                  value={instAddress}
                  onChange={(e) => setInstAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {instSavedMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                Información institucional guardada exitosamente.
              </div>
            )}

            <button
              id="btn-save-institution"
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs shadow-xs"
            >
              Guardar Cambios
            </button>
          </form>
        </div>
      )}

      {/* MODAL: APPROVE TUTORING */}
      {approvingTutoring && (
        <div
          id="modal-approve-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div
            id="modal-approve-card"
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
          >
            <div className="px-5 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <h3 className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                Aprobar y Programar Tutoría {approvingTutoring.code}
              </h3>
              <button
                onClick={() => setApprovingTutoring(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApprove} className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                <div className="font-semibold text-slate-800">{approvingTutoring.subject}</div>
                <div className="text-slate-600">
                  Estudiante: {approvingTutoring.petitionerStudentName} ({approvingTutoring.petitionerAccount})
                </div>
                <div className="text-slate-600">Docente: {approvingTutoring.teacherName}</div>
                <div className="text-slate-500">
                  Fecha: {approvingTutoring.reservDate} ({approvingTutoring.scheduleLabel})
                </div>
                <div className="text-indigo-700 font-medium">
                  Modalidad:{' '}
                  {approvingTutoring.modality === TutoringModality.PRESENCIAL
                    ? 'Presencial (Aula física)'
                    : 'Virtual (Enlace web)'}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  {approvingTutoring.modality === TutoringModality.PRESENCIAL
                    ? 'Asignar Aula Física (Sección)'
                    : 'Asignar Enlace de Videollamada (Meet / Zoom)'}
                </label>
                {approvingTutoring.modality === TutoringModality.PRESENCIAL ? (
                  <select
                    id="select-approve-section"
                    value={assignedSpace}
                    onChange={(e) => setAssignedSpace(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    {sections.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} (Capacidad: {s.capacity} alumnos)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="input-approve-link"
                    type="url"
                    value={assignedSpace}
                    onChange={(e) => setAssignedSpace(e.target.value)}
                    required
                    placeholder="https://meet.google.com/xyz-abcd-efg"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>

              {approvalError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  {approvalError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovingTutoring(null)}
                  className="px-3 py-1.5 text-slate-700 bg-white border border-slate-300 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-approve"
                  type="submit"
                  disabled={approving}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {approving ? 'Guardando...' : 'Confirmar Aprobación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CANCEL TUTORING */}
      {cancellingTutoring && (
        <div
          id="modal-cancel-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div
            id="modal-cancel-card"
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
          >
            <div className="px-5 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <h3 className="font-bold text-rose-950 text-sm flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-rose-600" />
                Cancelar Solicitud {cancellingTutoring.code}
              </h3>
              <button
                onClick={() => setCancellingTutoring(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCancel} className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                <div className="font-semibold text-slate-800">{cancellingTutoring.subject}</div>
                <div className="text-slate-600">
                  Alumno: {cancellingTutoring.petitionerStudentName} | Docente: {cancellingTutoring.teacherName}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  Motivo de Cancelación o Rechazo (Obligatorio)
                </label>
                <textarea
                  id="input-cancel-reason"
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                  minLength={5}
                  placeholder="Especifique el motivo por el cual la solicitud no puede ser atendida..."
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {cancelError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  {cancelError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingTutoring(null)}
                  className="px-3 py-1.5 text-slate-700 bg-white border border-slate-300 rounded-lg font-medium"
                >
                  Regresar
                </button>
                <button
                  id="btn-confirm-cancel"
                  type="submit"
                  disabled={cancelling}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {cancelling ? 'Cancelando...' : 'Confirmar Cancelación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE USER (STUDENT / TEACHER) */}
      {deletingUser && (
        <div
          id="modal-delete-user-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div
            id="modal-delete-user-card"
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
          >
            <div className="px-5 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <h3 className="font-bold text-rose-950 text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>
                  Confirmar Eliminación de {deletingUser.role === UserRole.STUDENT ? 'Estudiante' : 'Usuario'}
                </span>
              </h3>
              <button
                id="btn-close-delete-user-modal"
                onClick={() => setDeletingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <p className="text-slate-600 leading-relaxed">
                ¿Estás seguro de que deseas eliminar permanentemente a este usuario del sistema?
              </p>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900 text-sm">{deletingUser.fullName}</div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-bold">
                    {deletingUser.account}
                  </span>
                  <span>•</span>
                  <span>@{deletingUser.username}</span>
                  <span>•</span>
                  <span className="capitalize font-semibold text-slate-700">{deletingUser.role}</span>
                </div>
                <div className="text-slate-500">{deletingUser.email}</div>
              </div>

              {deleteUserError && (
                <div id="alert-delete-user-error" className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deleteUserError}</span>
                </div>
              )}

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                Esta acción removerá de forma irreversible al usuario. No se puede eliminar a un usuario que tenga solicitudes de tutorías activas (pendientes, aprobadas o en curso).
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingUser(null)}
                  disabled={deleteUserLoading}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-delete-user"
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={deleteUserLoading}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {deleteUserLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar Permanentemente</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingAttachment && (
        <AttachmentViewerModal
          fileName={viewingAttachment.fileName}
          fileUrl={viewingAttachment.fileUrl}
          onClose={() => setViewingAttachment(null)}
        />
      )}
    </div>
  );
};
