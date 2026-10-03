import React, { useState, Fragment } from 'react';
import {
  BinnacleEntry,
  Career,
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
import { AdminCareersTab } from './AdminCareersTab';
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
  Legend,
  CartesianGrid
} from 'recharts';
import {
  YafaPageHeader,
  YafaCard,
  YafaStatus,
  YafaChartSkeleton,
  YAFA_ACCENTS
} from './admin/yafaDashboard';
import {
  LayoutDashboard,
  CheckCircle,
  XCircle,
  Users,
  Shield,
  FileText,
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
  SlidersHorizontal,
  List,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Plus,
  CalendarDays,
  ExternalLink
} from 'lucide-react';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import { TutoringCalendarView } from './TutoringCalendarView';
import { TutoringDetailModal } from './TutoringDetailModal';
import { UserAvatar } from './UserAvatar';

interface AdminDashboardProps {
  currentUser: User;
  tutorings: Tutoring[];
  users: User[];
  sections: SectionClassroom[];
  subjects: SubjectCourse[];
  careers: Career[];
  schedules?: ScheduleSlot[];
  availabilities?: TeacherAvailability[];
  binnacle: BinnacleEntry[];
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
  careers,
  schedules = [],
  availabilities = [],
  binnacle,
  analytics,
  onRefresh,
  onOpenRegister,
  onOpenTests
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'careers' | 'subjects' | 'teachers' | 'tutorings' | 'users' | 'binnacle'
  >('overview');

  // Filter for tutorings list
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tutoringSearch, setTutoringSearch] = useState<string>('');
  const [displayMode, setDisplayMode] = useState<'list' | 'calendar'>('list');
  const [selectedCalendarTutoring, setSelectedCalendarTutoring] = useState<Tutoring | null>(null);
  const [selectedDetailTutoring, setSelectedDetailTutoring] = useState<Tutoring | null>(null);
  const [viewingAttachment, setViewingAttachment] = useState<{ fileName: string; fileUrl: string } | null>(null);
  const [scheduleTab, setScheduleTab] = useState<'schedule' | 'events'>('schedule');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [selectedScheduleDay, setSelectedScheduleDay] = useState<string>('all');

  // Dashboard filters (por carrera y semestre)
  const [dashCareerFilter, setDashCareerFilter] = useState<string>(currentUser.careerId || 'all');
  const [dashSemesterFilter, setDashSemesterFilter] = useState<string>('all');
  const selectedDashCareer = careers.find((c) => c.id === dashCareerFilter);

  const subjectCareerMap = new Map(subjects.map((s) => [s.id, s.careerId]));
  const subjectSemesterMap = new Map(subjects.map((s) => [s.id, s.semester]));

  const dashTutorings = tutorings.filter((t) => {
    if (dashCareerFilter === 'all') return true;
    return subjectCareerMap.get(t.subjectCourseId) === dashCareerFilter;
  });
  const dashTutoringsFiltered =
    dashSemesterFilter === 'all'
      ? dashTutorings
      : dashTutorings.filter((t) => {
          const sem = subjectSemesterMap.get(t.subjectCourseId);
          return !sem || Number(sem) === Number(dashSemesterFilter);
        });
  const dashUsers =
    dashCareerFilter === 'all' ? users : users.filter((u) => u.careerId === dashCareerFilter);
  const dashSubjects = subjects.filter((s) => {
    if (dashCareerFilter !== 'all' && s.careerId !== dashCareerFilter) return false;
    if (dashSemesterFilter !== 'all' && s.semester && Number(s.semester) !== Number(dashSemesterFilter)) return false;
    return true;
  });

  const dashPerSemesterRows = careers.flatMap((c) =>
    Array.from({ length: c.numberOfSemesters || 1 }, (_, i) => i + 1).map((sem) => ({
      careerId: c.id,
      careerName: c.name,
      sem,
      subjectCount: subjects.filter((s) => s.careerId === c.id && s.semester === sem).length,
      studentCount: users.filter(
        (u) => u.role === UserRole.STUDENT && u.careerId === c.id && u.semester === sem
      ).length,
      tutoringCount: tutorings.filter(
        (t) =>
          subjectCareerMap.get(t.subjectCourseId) === c.id &&
          subjectSemesterMap.get(t.subjectCourseId) === sem
      ).length
    }))
  );
  // Approval Modal State
  const [approvingTutoring, setApprovingTutoring] = useState<Tutoring | null>(null);
  const [assignedSpace, setAssignedSpace] = useState<string>('');
  const [assignedBlock, setAssignedBlock] = useState<string>('');
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

  const formatTutoringDateTime = (dateStr: string, timeLabel?: string, reservTime?: string) => {
    let dayName = '';
    let formattedDate = dateStr || 'Fecha sin definir';
    let shortDate = dateStr || '';

    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        const rawDay = d.toLocaleDateString('es-CO', { weekday: 'short' });
        dayName = rawDay.charAt(0).toUpperCase() + rawDay.slice(1);
        const rawMonth = d.toLocaleDateString('es-CO', { month: 'short' });
        formattedDate = `${dayName}, ${day} ${rawMonth} ${year}`;
        shortDate = `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
      }
    }

    const timeDisplay = reservTime || timeLabel || 'Horario por asignar';

    return {
      dayName,
      formattedDate,
      shortDate,
      timeDisplay
    };
  };

  // Filtered Tutorings
  const filteredTutorings = dashTutoringsFiltered.filter((t) => {
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
  const filteredUsers = dashUsers.filter((u) => {
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesSemester =
      dashSemesterFilter === 'all' ||
      u.role !== UserRole.STUDENT ||
      (u.semester != null && Number(u.semester) === Number(dashSemesterFilter));
    const matchesQuery =
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.account.toLowerCase().includes(userSearch.toLowerCase());
    return matchesRole && matchesSemester && matchesQuery;
  });

  // Handle Approve Tutoring
  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingTutoring) return;
    setApprovalError(null);
    setApproving(true);

    const res = await ApiClient.approveTutoring(approvingTutoring.id, assignedSpace, currentUser, assignedBlock);
    setApproving(false);

    if (res.success) {
      setApprovingTutoring(null);
      setAssignedSpace('');
      setAssignedBlock('');
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

  const adminNavItems: { id: typeof activeTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Métricas', icon: <LayoutDashboard aria-hidden="true" className="h-4 w-4" /> },
    { id: 'subjects', label: 'Asignaturas', icon: <BookOpen aria-hidden="true" className="h-4 w-4" />, count: subjects.length },
    { id: 'careers', label: 'Carreras', icon: <GraduationCap aria-hidden="true" className="h-4 w-4" />, count: careers.length },
    { id: 'teachers', label: 'Docentes', icon: <Briefcase aria-hidden="true" className="h-4 w-4" />, count: users.filter((u) => u.role === UserRole.TEACHER).length },
    { id: 'tutorings', label: 'Solicitudes', icon: <CheckCircle aria-hidden="true" className="h-4 w-4" />, count: tutorings.filter((t) => t.status === TutoringStatus.PENDING).length },
    { id: 'users', label: 'Estudiantes y cuentas', icon: <Users aria-hidden="true" className="h-4 w-4" />, count: users.filter((u) => u.role === UserRole.STUDENT).length },
    { id: 'binnacle', label: 'Bitácora', icon: <FileText aria-hidden="true" className="h-4 w-4" /> },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 pb-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
      <header className="overflow-hidden rounded-xl border border-[#e2e6e2] bg-white lg:sticky lg:top-4">
        <div className="p-3">
          <div className="flex min-w-0 items-center gap-3 rounded-xl bg-stone-50/70 p-3">
            <UserAvatar user={currentUser} size="sm" className="shrink-0 border border-stone-200" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-700">Administrador</p>
              <h1 className="mt-0.5 truncate text-xs font-semibold tracking-tight text-slate-900" title={currentUser.fullName}>{currentUser.fullName}</h1>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 px-1">
            <span className="text-[10px] text-stone-500">Panel FET</span>
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Actualizar datos del panel"
              title="Actualizar datos"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav aria-label="Paneles de administración" className="flex gap-1 overflow-x-auto border-t border-stone-100 px-2 py-2 lg:flex-col lg:overflow-visible lg:px-2 lg:pb-3">
          {adminNavItems.map((item) => {
            const selected = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-admin-${item.id}`}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={selected ? 'page' : undefined}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-lg px-3 text-left text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 lg:w-full ${
                  selected ? 'bg-brand-50 text-brand-800 font-semibold' : 'text-stone-600 hover:bg-stone-50 hover:text-slate-900'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className={`ml-auto min-w-5 rounded-md px-1.5 py-0.5 text-center text-[10px] tabular-nums ${selected ? 'bg-white text-brand-700' : 'bg-stone-100 text-stone-500'}`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content Area */}
      <div className="min-w-0 space-y-4 lg:pt-1">
        {/* TAB: CARRERAS */}
        {activeTab === 'careers' && (
          <AdminCareersTab
            currentUser={currentUser}
            careers={careers}
            onRefresh={onRefresh}
          />
        )}

        {/* TAB: ASIGNATURAS */}
        {activeTab === 'subjects' && (
          <AdminSubjectsTab
            currentUser={currentUser}
            subjects={subjects}
            careers={careers}
            onRefresh={onRefresh}
          />
        )}

        {/* TAB: DOCENTES */}
        {activeTab === 'teachers' && (
          <AdminTeachersTab
            currentUser={currentUser}
            users={users}
            subjects={subjects}
            careers={careers}
            schedules={schedules}
            availabilities={availabilities}
            onRefresh={onRefresh}
          />
        )}

        {/* TAB 1: OVERVIEW & CHARTS */}
        {activeTab === 'overview' && (() => {
          // Fallback or enriched stats from real-time props (filtered por carrera/semestre)
          const filterActive = dashCareerFilter !== 'all' || dashSemesterFilter !== 'all';
          const totalTuts = dashTutoringsFiltered.length;
          const pendingTuts = dashTutoringsFiltered.filter((t) => t.status === TutoringStatus.PENDING).length;
          const approvedTuts = dashTutoringsFiltered.filter((t) => t.status === TutoringStatus.APPROVED).length;
          const inProgTuts = dashTutoringsFiltered.filter((t) => t.status === TutoringStatus.IN_PROGRESS).length;
          const completedTuts = dashTutoringsFiltered.filter((t) => t.status === TutoringStatus.COMPLETED).length;
          const cancelledTuts = dashTutoringsFiltered.filter((t) => t.status === TutoringStatus.CANCELLED).length;

          const ratedList = dashTutoringsFiltered.filter((t) => t.score > 0);
          const realAvgScore =
            ratedList.length > 0
              ? Number((ratedList.reduce((acc, t) => acc + t.score, 0) / ratedList.length).toFixed(1))
              : 5.0;
          const avgScore =
            !filterActive && analytics?.averageRating != null ? analytics.averageRating : realAvgScore;

          const compRate =
            !filterActive && analytics?.completionRate != null
              ? analytics.completionRate
              : totalTuts > 0 ? Math.round((completedTuts / totalTuts) * 100) : 0;

          const attRate = !filterActive && analytics?.attendanceRate != null ? analytics.attendanceRate : 95;

          const presencialCount = dashTutoringsFiltered.filter((t) => t.modality === TutoringModality.PRESENCIAL).length;
          const virtualCount = dashTutoringsFiltered.filter((t) => t.modality === TutoringModality.VIRTUAL).length;

          const modalityData = !filterActive && analytics?.modalityDistribution ? analytics.modalityDistribution : [
            {
              name: 'Presencial',
              count: presencialCount,
              percentage: totalTuts > 0 ? Math.round((presencialCount / totalTuts) * 100) : 0,
              color: '#11770e'
            },
            {
              name: 'Virtual',
              count: virtualCount,
              percentage: totalTuts > 0 ? Math.round((virtualCount / totalTuts) * 100) : 0,
              color: '#2563eb'
            }
          ];

          const statusData = !filterActive && analytics?.statusDistribution ? analytics.statusDistribution : [
            { name: 'Pendientes', count: pendingTuts, color: '#D97706' },
            { name: 'Aprobadas', count: approvedTuts, color: '#2E9E34' },
            { name: 'En Proceso', count: inProgTuts, color: '#0284C7' },
            { name: 'Finalizadas', count: completedTuts, color: '#11770e' },
            { name: 'Canceladas', count: cancelledTuts, color: '#BE123C' }
          ];

          const activeSubjects = dashSubjects.filter((s) => s.isActive);
          const courseData = activeSubjects
            .map((s) => {
              const count = dashTutoringsFiltered.filter(
                (t) =>
                  t.subjectCourseId === s.id ||
                  (t.subjectCourseName && t.subjectCourseName.trim().toLowerCase() === s.name.trim().toLowerCase())
              ).length;
              const careerObj = careers.find((c) => c.id === s.careerId);
              return {
                id: s.id,
                subject: s.name.length > 20 ? s.name.substring(0, 18) + '…' : s.name,
                fullName: s.name,
                semester: s.semester,
                careerName: careerObj?.name || '',
                careerCode: careerObj?.codePrefix || '',
                count
              };
            })
            .sort((a, b) => b.count - a.count);

          const totalDemandRequests = courseData.reduce((acc, c) => acc + c.count, 0);
          const subjectsWithDemandCount = courseData.filter((c) => c.count > 0).length;
          const maxSubjectCount = courseData.length > 0 ? Math.max(...courseData.map((c) => c.count), 1) : 1;
          const avgDemandPerSubject = activeSubjects.length > 0 ? (totalDemandRequests / activeSubjects.length).toFixed(1) : '0';

          const ratingData = !filterActive && analytics?.ratingDistribution ? analytics.ratingDistribution : [
            { stars: '5 Estrellas', count: dashTutoringsFiltered.filter((t) => t.score >= 5).length, color: '#11770e' },
            { stars: '4 Estrellas', count: dashTutoringsFiltered.filter((t) => t.score === 4).length, color: '#0284C7' },
            { stars: '3 Estrellas', count: dashTutoringsFiltered.filter((t) => t.score === 3).length, color: '#D97706' },
            { stars: '2 Estrellas', count: dashTutoringsFiltered.filter((t) => t.score === 2).length, color: '#EA580C' },
            { stars: '1 Estrella', count: dashTutoringsFiltered.filter((t) => t.score === 1).length, color: '#BE123C' }
          ];

          const teacherWorkload = !filterActive && analytics?.teacherWorkload
            ? analytics.teacherWorkload
            : dashUsers
                .filter((u) => u.role === UserRole.TEACHER)
                .map((t) => ({
                  name: t.fullName,
                  total: dashTutoringsFiltered.filter((tut) => tut.teacherId === t.id).length,
                  completed: dashTutoringsFiltered.filter((tut) => tut.teacherId === t.id && tut.status === TutoringStatus.COMPLETED).length,
                  avgRating: 5.0
                }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 5);

          const topSubject = courseData.length > 0 && courseData[0].count > 0
            ? courseData[0]
            : null;

          // Weekly schedule calculation based on weekOffset
          const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
          const now = new Date();
          const currentDay = now.getDay();
          const mondayDiff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1) + weekOffset * 7;
          const mondayDate = new Date(now.getFullYear(), now.getMonth(), mondayDiff);
          const weekDays = Array.from({ length: 6 }, (_, i) => {
            const d = new Date(mondayDate);
            d.setDate(mondayDate.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const dayTutorings = dashTutoringsFiltered.filter(
              (t) => t.reservDate === dateStr && t.status !== TutoringStatus.CANCELLED
            );
            return {
              dayName: dayNames[i],
              date: d,
              dateStr,
              dayNumber: d.getDate(),
              monthName: d.toLocaleDateString('es-CO', { month: 'short' }),
              tutorings: dayTutorings
            };
          });
          const weekRangeLabel = `${weekDays[0].dayNumber} ${weekDays[0].monthName} - ${weekDays[5].dayNumber} ${weekDays[5].monthName}`;
          const weekTotalTutorings = weekDays.reduce((acc, d) => acc + d.tutorings.length, 0);

          // Upcoming tutorings for events tab
          const todayIso = new Date().toISOString().split('T')[0];
          const upcomingTutorings = dashTutoringsFiltered
            .filter((t) => t.status !== TutoringStatus.CANCELLED)
            .sort((a, b) => (a.reservDate || '').localeCompare(b.reservDate || ''));

          return (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200 min-w-0">
              <header className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <p className="text-xs font-medium text-brand-700">Panel de administración</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Métricas académicas</h2>
                  <p className="mt-1 text-sm text-stone-500">Resumen de solicitudes, actividad y resultados institucionales.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-stone-200 px-3 text-xs font-medium text-stone-600">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand-600" /> Sistema activo
                  </span>
                  <button
                    onClick={onRefresh}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                    title="Actualizar datos desde la base de datos"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" /> Actualizar
                  </button>
                  <button
                    onClick={() => setActiveTab('tutorings')}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-700 px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    Ver solicitudes <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </header>

              {/* Filtros globales en banda compacta rectangular (ruta-específicos van al contenido) */}
              <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-700">
                  <Filter className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  <span>Filtrar métricas</span>
                </div>
                <CareerSemesterFilter
                  careers={careers}
                  selectedCareer={selectedDashCareer}
                  careerFilter={dashCareerFilter}
                  semesterFilter={dashSemesterFilter}
                  onCareerChange={setDashCareerFilter}
                  onSemesterChange={setDashSemesterFilter}
                />
                {(dashCareerFilter !== 'all' || dashSemesterFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setDashCareerFilter('all');
                      setDashSemesterFilter('all');
                    }}
                    className="inline-flex h-9 items-center rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:ml-auto"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" role="region" aria-label="Indicadores clave">
                {[
                  { title: 'Solicitudes', value: totalTuts, detail: `${pendingTuts + approvedTuts + inProgTuts} activas`, color: 'text-slate-900' },
                  { title: 'Docentes tutores', value: dashUsers.filter((u) => u.role === UserRole.TEACHER).length, detail: 'Docentes habilitados', color: 'text-slate-900' },
                  { title: 'Asistencia promedio', value: `${attRate}%`, detail: 'En tutorías finalizadas', color: 'text-brand-700' },
                  { title: 'Tasa de éxito', value: `${compRate}%`, detail: `${completedTuts} tutorías concluidas`, color: 'text-brand-700' }
                ].map((metric) => (
                  <article key={metric.title} className="min-w-0 rounded-xl border border-stone-200 bg-white px-4 py-3.5">
                    <h3 className="text-xs font-medium text-stone-500">{metric.title}</h3>
                    <p className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${metric.color}`}>{metric.value}</p>
                    <p className="mt-1 truncate text-xs text-stone-500" title={metric.detail}>{metric.detail}</p>
                    {metric.title === 'Asistencia promedio' && (
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100" aria-label={`Asistencia ${attRate}%`} role="img">
                        <span className="block h-full rounded-full bg-brand-600" style={{ width: `${attRate}%` }} />
                      </div>
                    )}
                  </article>
                ))}
              </div>

              {/* 70/30 Split Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 items-start">
                {/* Left 70% Column */}
                <div className="xl:col-span-8 space-y-4 sm:space-y-6 min-w-0">

                  <section aria-labelledby="demand-by-subject-title" className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                    <header className="flex flex-col gap-1 border-b border-stone-200 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
                      <div>
                        <h3 id="demand-by-subject-title" className="text-sm font-semibold text-slate-900">Demanda por asignatura</h3>
                        <p className="mt-0.5 text-xs text-stone-500">Solicitudes recibidas según las asignaturas activas.</p>
                      </div>
                      <span className="text-xs font-medium text-stone-500">{totalDemandRequests} solicitudes</span>
                    </header>
                    <div className="p-4 sm:p-5">
                      <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                        <div className="rounded-lg bg-stone-50 px-3 py-2.5"><dt className="text-[11px] text-stone-500">Mayor demanda</dt><dd className="mt-1 truncate text-xs font-semibold text-slate-800" title={topSubject?.fullName}>{topSubject?.fullName || 'Sin solicitudes'}</dd>{topSubject && <dd className="mt-0.5 text-[11px] text-brand-700">{topSubject.count} {topSubject.count === 1 ? 'solicitud' : 'solicitudes'}</dd>}</div>
                        <div className="rounded-lg bg-stone-50 px-3 py-2.5"><dt className="text-[11px] text-stone-500">Asignaturas con demanda</dt><dd className="mt-1 text-xs font-semibold text-slate-800">{subjectsWithDemandCount} de {activeSubjects.length}</dd><dd className="mt-0.5 text-[11px] text-stone-500">{activeSubjects.length > 0 ? Math.round((subjectsWithDemandCount / activeSubjects.length) * 100) : 0}% de las activas</dd></div>
                        <div className="rounded-lg bg-stone-50 px-3 py-2.5"><dt className="text-[11px] text-stone-500">Promedio por asignatura</dt><dd className="mt-1 text-xs font-semibold text-slate-800">{avgDemandPerSubject} tutorías</dd><dd className="mt-0.5 text-[11px] text-stone-500">En el periodo filtrado</dd></div>
                      </dl>
                      {courseData.length === 0 ? (
                        <div className="mt-4 rounded-lg border border-dashed border-stone-200 px-4 py-8 text-center">
                          <BookOpen aria-hidden="true" className="mx-auto h-5 w-5 text-stone-300" />
                          <p className="mt-2 text-xs font-medium text-slate-700">No hay asignaturas activas para este filtro</p>
                        </div>
                      ) : (
                        <ol className="mt-4 max-h-80 divide-y divide-stone-100 overflow-y-auto" aria-label="Asignaturas ordenadas por demanda">
                          {courseData.map((item, index) => {
                            const demandPercent = Math.round((item.count / maxSubjectCount) * 100);
                            return (
                              <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-[10px] font-semibold tabular-nums text-stone-600">{index + 1}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-medium text-slate-800" title={item.fullName}>{item.fullName}</p>
                                      <p className="mt-0.5 truncate text-[10px] text-stone-500">{[item.careerName, item.semester ? `Semestre ${item.semester}` : ''].filter(Boolean).join(' · ') || 'Sin programa asociado'}</p>
                                    </div>
                                    <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-700">{item.count}</span>
                                  </div>
                                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100" aria-hidden="true"><span className="block h-full rounded-full bg-brand-600" style={{ width: `${item.count > 0 ? Math.max(demandPercent, 4) : 0}%` }} /></div>
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </div>
                  </section>

                  <section aria-labelledby="tutoring-status-title" className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                    <header className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-4 sm:px-5">
                      <div>
                        <h3 id="tutoring-status-title" className="text-sm font-semibold text-slate-900">Solicitudes por estado</h3>
                        <p className="mt-0.5 text-xs text-stone-500">Distribución del ciclo de tutoría.</p>
                      </div>
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium tabular-nums text-stone-600">{totalTuts} total</span>
                    </header>
                    <dl className="space-y-4 p-4 sm:p-5">
                      {statusData.map((status) => {
                        const percent = totalTuts > 0 ? Math.round((status.count / totalTuts) * 100) : 0;
                        return (
                          <div key={status.name}>
                            <div className="flex items-center justify-between gap-3 text-xs">
                              <dt className="flex min-w-0 items-center gap-2 font-medium text-slate-700"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />{status.name}</dt>
                              <dd className="shrink-0 tabular-nums text-stone-500"><span className="font-semibold text-slate-800">{status.count}</span><span className="ml-2">{percent}%</span></dd>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100" aria-hidden="true"><span className="block h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: status.color }} /></div>
                          </div>
                        );
                      })}
                      {statusData.length === 0 && <p className="text-xs text-stone-500">No hay estados para mostrar.</p>}
                    </dl>
                  </section>

                  <section aria-labelledby="career-semester-summary-title" className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                    <header className="flex flex-col gap-1 border-b border-stone-200 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
                      <div>
                        <h3 id="career-semester-summary-title" className="text-sm font-semibold text-slate-900">Resumen por carrera y semestre</h3>
                        <p className="mt-0.5 text-xs text-stone-500">Asignaturas, estudiantes y tutorías del filtro actual.</p>
                      </div>
                      <span className="text-xs text-stone-500">{dashCareerFilter !== 'all' ? selectedDashCareer?.name || 'Carrera seleccionada' : 'Todas las carreras'}</span>
                    </header>
                    <div className="max-h-[26rem] space-y-3 overflow-y-auto p-3 sm:p-4">
                      {careers.map((career) => {
                        if (dashCareerFilter !== 'all' && career.id !== dashCareerFilter) return null;
                        const semesterRows = dashPerSemesterRows.filter((row) => row.careerId === career.id && (dashSemesterFilter === 'all' || row.sem === Number(dashSemesterFilter)));
                        if (semesterRows.length === 0) return null;
                        const totals = semesterRows.reduce((sum, row) => ({ subjectCount: sum.subjectCount + row.subjectCount, studentCount: sum.studentCount + row.studentCount, tutoringCount: sum.tutoringCount + row.tutoringCount }), { subjectCount: 0, studentCount: 0, tutoringCount: 0 });
                        return (
                          <section key={career.id} aria-label={`Resumen de ${career.name}`} className="overflow-hidden rounded-lg border border-stone-200">
                            <header className="flex flex-col gap-2 bg-stone-50/70 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0"><h4 className="truncate text-xs font-semibold text-slate-800" title={career.name}>{career.name}</h4><p className="mt-0.5 text-[10px] text-stone-500">{career.codePrefix} · {semesterRows.length} {semesterRows.length === 1 ? 'semestre' : 'semestres'}</p></div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-stone-500"><span><strong className="font-semibold text-slate-800">{totals.subjectCount}</strong> asignaturas</span><span><strong className="font-semibold text-slate-800">{totals.studentCount}</strong> estudiantes</span><span><strong className="font-semibold text-brand-700">{totals.tutoringCount}</strong> tutorías</span></div>
                            </header>
                            <ul className="divide-y divide-stone-100">
                              {semesterRows.map((row) => (
                                <li key={`${career.id}-${row.sem}`} className="grid grid-cols-[minmax(0,1fr)_repeat(3,auto)] items-center gap-3 px-3.5 py-2.5 text-xs">
                                  <span className="font-medium text-slate-700">Semestre {row.sem}</span>
                                  <span className="text-right tabular-nums text-stone-500"><strong className="font-medium text-slate-800">{row.subjectCount}</strong><span className="hidden sm:inline"> asignaturas</span></span>
                                  <span className="text-right tabular-nums text-stone-500"><strong className="font-medium text-slate-800">{row.studentCount}</strong><span className="hidden sm:inline"> estudiantes</span></span>
                                  <span className="text-right tabular-nums text-stone-500"><strong className="font-medium text-brand-700">{row.tutoringCount}</strong><span className="hidden sm:inline"> tutorías</span></span>
                                </li>
                              ))}
                            </ul>
                          </section>
                        );
                      })}
                    </div>
                  </section>                </div>

                {/* Right 30% Column */}
                <div className="xl:col-span-4 space-y-6">
                  {/* Horario y Eventos Timeline */}
                  {/* Horario y Eventos Timeline */}
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3.5">
                    {/* Mode Selector Tabs (Full Width Grid) */}
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setScheduleTab('schedule')}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          scheduleTab === 'schedule'
                            ? 'bg-white text-brand-700 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Calendar aria-hidden="true" className="w-3.5 h-3.5" />
                        <span>Horario</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-50 text-brand-700 font-black">
                          {weekTotalTutorings}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setScheduleTab('events')}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          scheduleTab === 'events'
                            ? 'bg-white text-brand-700 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <CalendarCheck aria-hidden="true" className="w-3.5 h-3.5" />
                        <span>Eventos</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-black">
                          {upcomingTutorings.length}
                        </span>
                      </button>
                    </div>

                    {/* VISTA 1: HORARIO SEMANAL */}
                    {scheduleTab === 'schedule' && (
                      <div className="space-y-3">
                        {/* Week Navigator Bar */}
                        <div className="flex items-center justify-between pt-0.5">
                          {/* Week Navigation Buttons */}
                          <div className="flex items-center gap-1 bg-stone-50 p-0.5 rounded-lg border border-stone-200/80">
                            <button
                              type="button"
                              onClick={() => setWeekOffset((prev) => prev - 1)}
                              className="p-1 rounded-md hover:bg-white hover:text-brand-700 text-slate-600 cursor-pointer transition-colors"
                              title="Semana anterior"
                            >
                              <ChevronLeft aria-hidden="true" className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setWeekOffset(0);
                                setSelectedScheduleDay('all');
                              }}
                              className={`px-2.5 py-0.5 text-[11px] rounded-md font-bold cursor-pointer transition-colors ${
                                weekOffset === 0
                                  ? 'bg-brand-600 text-white shadow-2xs'
                                  : 'hover:bg-white text-slate-700'
                              }`}
                              title="Ir a semana actual"
                            >
                              Hoy
                            </button>
                            <button
                              type="button"
                              onClick={() => setWeekOffset((prev) => prev + 1)}
                              className="p-1 rounded-md hover:bg-white hover:text-brand-700 text-slate-600 cursor-pointer transition-colors"
                              title="Semana siguiente"
                            >
                              <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Week Range Label */}
                          <div className="text-right leading-tight">
                            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-tight block">
                              {weekRangeLabel}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 block">
                              {weekTotalTutorings} {weekTotalTutorings === 1 ? 'tutoría' : 'tutorías'} esta semana
                            </span>
                          </div>
                        </div>

                        {/* Interactive Day Filter Strip */}
                        <div className="grid grid-cols-7 gap-1 bg-stone-50 p-1 rounded-xl border border-stone-200/80">
                          <button
                            type="button"
                            onClick={() => setSelectedScheduleDay('all')}
                            className={`py-1 text-center rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                              selectedScheduleDay === 'all'
                                ? 'bg-brand-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-white'
                            }`}
                          >
                            Todos
                          </button>
                          {weekDays.map((d) => {
                            const isSelected = selectedScheduleDay === d.dateStr;
                            const isToday = todayIso === d.dateStr;
                            const hasSessions = d.tutorings.length > 0;
                            return (
                              <button
                                key={d.dateStr}
                                type="button"
                                onClick={() => setSelectedScheduleDay(isSelected ? 'all' : d.dateStr)}
                                className={`py-1 text-center rounded-lg text-[10px] transition-colors relative cursor-pointer ${
                                  isSelected
                                    ? 'bg-brand-600 text-white font-black shadow-2xs'
                                    : isToday
                                    ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200'
                                    : 'text-slate-600 hover:bg-white font-medium'
                                }`}
                              >
                                <span className="block leading-none text-[9px] uppercase">{d.dayName}</span>
                                <span className="block leading-tight font-bold text-xs mt-0.5">{d.dayNumber}</span>
                                {hasSessions && !isSelected && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-brand-600 mx-auto mt-0.5 block" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Day-by-Day Session Cards */}
                        <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-0.5">
                          {selectedScheduleDay === 'all' && weekTotalTutorings === 0 ? (
                            <div className="py-8 px-4 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200">
                              <Calendar aria-hidden="true" className="w-7 h-7 text-stone-300 mx-auto mb-1.5" />
                              <p className="text-xs font-semibold text-slate-700">
                                Sin tutorías programadas esta semana
                              </p>
                              <p className="text-[11px] text-stone-400 mt-0.5">
                                Usa los botones &lt; &gt; para navegar entre semanas.
                              </p>
                            </div>
                          ) : (
                            weekDays
                              .filter((day) => {
                                if (selectedScheduleDay !== 'all') return day.dateStr === selectedScheduleDay;
                                return day.tutorings.length > 0;
                              })
                              .map((day) => {
                                const isToday = todayIso === day.dateStr;
                                return (
                                  <div
                                    key={day.dateStr}
                                    className={`p-3 rounded-xl border transition-colors ${
                                      isToday
                                        ? 'bg-brand-50/40 border-brand-200'
                                        : 'bg-stone-50 border-stone-200/80'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                                            isToday
                                              ? 'bg-brand-600 text-white'
                                              : 'bg-white text-slate-700 border border-slate-200'
                                          }`}
                                        >
                                          {day.dayNumber}
                                        </span>
                                        <span className="text-xs font-bold text-slate-800">
                                          {day.dayName}, {day.dayNumber} {day.monthName}
                                        </span>
                                        {isToday && (
                                          <span className="text-[10px] bg-brand-600 text-white px-1.5 py-0.2 rounded font-bold">
                                            Hoy
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[11px] font-semibold text-slate-400">
                                        {day.tutorings.length}{' '}
                                        {day.tutorings.length === 1 ? 'sesión' : 'sesiones'}
                                      </span>
                                    </div>

                                    {day.tutorings.length === 0 ? (
                                      <div className="text-[11px] text-slate-400 italic py-1 pl-8">
                                        Sin sesiones programadas
                                      </div>
                                    ) : (
                                      <div className="space-y-2 pl-1">
                                        {day.tutorings.map((tut) => (
                                          <div
                                            key={tut.id}
                                            onClick={() => setSelectedCalendarTutoring(tut)}
                                            className="p-2.5 bg-white rounded-xl border border-stone-200 hover:border-brand-600 hover:shadow-2xs transition-[color,background-color,border-color,box-shadow] cursor-pointer text-xs space-y-1.5"
                                          >
                                            <div className="flex items-start justify-between gap-2">
                                              <span className="font-bold text-slate-800 leading-tight">
                                                {tut.subjectCourseName || tut.subject}
                                              </span>
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200/60 shrink-0">
                                                <Clock aria-hidden="true" className="w-3 h-3" />
                                                {tut.reservTime || tut.scheduleLabel}
                                              </span>
                                            </div>

                                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                              <span className="truncate max-w-[140px] font-medium text-slate-700">
                                                {tut.teacherName}
                                              </span>
                                              <span className="flex items-center gap-1 text-[10px] font-semibold text-stone-600">
                                                {tut.modality === TutoringModality.PRESENCIAL ? (
                                                  <>
                                                    <MapPin aria-hidden="true" className="w-3 h-3 text-brand-700" />
                                                    Presencial
                                                  </>
                                                ) : (
                                                  <>
                                                    <Video aria-hidden="true" className="w-3 h-3 text-info" />
                                                    Virtual
                                                  </>
                                                )}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>
                    )}

                    {/* VISTA 2: PRÓXIMOS EVENTOS Y CITAS */}
                    {scheduleTab === 'events' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-stone-500 uppercase tracking-wider">
                            Agenda y Citas Confirmadas
                          </span>
                          <span className="font-semibold text-brand-700">
                            {upcomingTutorings.length} en total
                          </span>
                        </div>

                        {upcomingTutorings.length === 0 ? (
                          <div className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <CalendarCheck aria-hidden="true" className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs font-semibold text-slate-600">
                              No hay tutorías o eventos programados
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Las solicitudes aprobadas aparecerán aquí cronológicamente.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-0.5">
                            {upcomingTutorings.slice(0, 10).map((tut) => {
                              const dt = formatTutoringDateTime(tut.reservDate, tut.scheduleLabel, tut.reservTime);
                              const isToday = tut.reservDate === todayIso;
                              return (
                                <div
                                  key={tut.id}
                                  onClick={() => setSelectedCalendarTutoring(tut)}
                                  className="p-3 bg-white rounded-xl border border-stone-200 hover:border-brand-600 hover:shadow-2xs transition-[color,background-color,border-color,box-shadow] cursor-pointer text-xs space-y-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                        isToday
                                          ? 'bg-brand-600 text-white'
                                          : 'bg-stone-100 text-stone-700'
                                      }`}
                                    >
                                      <Calendar aria-hidden="true" className="w-3 h-3" />
                                      {isToday ? '¡Hoy!' : dt.formattedDate}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200/60">
                                      <Clock aria-hidden="true" className="w-3 h-3" />
                                      {dt.timeDisplay}
                                    </span>
                                  </div>

                                  <div>
                                    <h5 className="font-bold text-slate-900 leading-tight">
                                      {tut.subjectCourseName || tut.subject}
                                    </h5>
                                    {tut.subject && tut.subjectCourseName && tut.subject !== tut.subjectCourseName && (
                                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                        {tut.subject}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1.5 border-t border-slate-100">
                                    <span className="truncate max-w-[130px] text-slate-700">
                                      {tut.teacherName}
                                    </span>
                                    <span className="flex items-center gap-1 text-[10px] font-semibold text-stone-600">
                                      {tut.modality === TutoringModality.PRESENCIAL ? (
                                        <>
                                          <MapPin aria-hidden="true" className="w-3 h-3 text-brand-700" />
                                          {tut.space || 'Presencial'}
                                        </>
                                      ) : (
                                        <>
                                          <Video aria-hidden="true" className="w-3 h-3 text-info" />
                                          Virtual
                                        </>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Modalidad de Tutoría */}
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Modalidad de Tutoría</h4>
                        <p className="text-xs text-slate-500">Presencial vs Virtual</p>
                      </div>
                    </div>

                    <div className="h-44 w-full flex items-center justify-center relative">
                      <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-black text-slate-900 tabular-nums">{totalTuts}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">tutorías</span>
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={modalityData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
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

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-brand-50 border border-brand-200 flex flex-col justify-between">
                        <div className="font-bold text-brand-700 text-[11px]">Presencial</div>
                        <div className="text-lg font-black text-brand-800 mt-1">{presencialCount}</div>
                        <div className="text-[10px] text-brand-700">
                          {totalTuts > 0 ? Math.round((presencialCount / totalTuts) * 100) : 0}%
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                        <div className="font-bold text-slate-700 text-[11px]">Virtual</div>
                        <div className="text-lg font-black text-slate-900 mt-1">{virtualCount}</div>
                        <div className="text-[10px] text-slate-500">
                          {totalTuts > 0 ? Math.round((virtualCount / totalTuts) * 100) : 0}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Docentes Tutores */}
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">Docentes con Mayor Actividad</h4>
                      <span className="text-[11px] text-brand-700 font-bold">Top</span>
                    </div>

                    {teacherWorkload.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-400">
                        No hay registros de docentes aún.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {teacherWorkload.map((t, idx) => (
                          <div
                            key={t.name}
                            className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-brand-50 text-brand-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-slate-800 truncate">{t.name}</span>
                            </div>
                            <span className="font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md text-[11px] shrink-0">
                              {t.total} {t.total === 1 ? 'tutoría' : 'tutorías'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* TAB 2: TUTORING REQUESTS MANAGEMENT */}
      {activeTab === 'tutorings' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium text-brand-700">Gestión académica</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Solicitudes de tutoría</h2>
              <p className="mt-1 text-sm text-stone-500">Revisa cada solicitud, asigna un espacio y sigue su estado.</p>
            </div>
            <span className="text-xs font-medium text-stone-500">{filteredTutorings.length} {filteredTutorings.length === 1 ? 'resultado' : 'resultados'}</span>
          </header>

          {/* Resumen del estado de solicitudes */}
          <dl className="grid grid-cols-2 divide-x divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white sm:grid-cols-3 sm:divide-y-0 xl:grid-cols-5">
            <div className="p-3.5 sm:p-4"><dt className="text-xs text-stone-500">Pendientes</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-amber-700">{dashTutoringsFiltered.filter((t) => t.status === TutoringStatus.PENDING).length}</dd></div>
            <div className="p-3.5 sm:p-4"><dt className="text-xs text-stone-500">Programadas</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-brand-700">{dashTutoringsFiltered.filter((t) => t.status === TutoringStatus.APPROVED).length}</dd></div>
            <div className="p-3.5 sm:p-4"><dt className="text-xs text-stone-500">En curso</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-sky-700">{dashTutoringsFiltered.filter((t) => t.status === TutoringStatus.IN_PROGRESS).length}</dd></div>
            <div className="p-3.5 sm:p-4"><dt className="text-xs text-stone-500">Finalizadas</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{dashTutoringsFiltered.filter((t) => t.status === TutoringStatus.COMPLETED).length}</dd></div>
            <div className="p-3.5 sm:p-4"><dt className="text-xs text-stone-500">Canceladas</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-stone-500">{dashTutoringsFiltered.filter((t) => t.status === TutoringStatus.CANCELLED).length}</dd></div>
          </dl>

          {/* Search & Filter Bar */}
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-stone-100 bg-stone-50/60 p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    id="search-admin-tutorings"
                    type="text"
                    value={tutoringSearch}
                    onChange={(e) => setTutoringSearch(e.target.value)}
                    placeholder="Buscar por código, alumno, materia…"
                    aria-label="Buscar solicitudes"
                    className="h-10 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 sm:w-60"
                  />
                </div>

                <select
                  id="select-filter-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filtrar solicitudes por estado"
                  className="h-10 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                >
                  <option value="all">Todos los Estados</option>
                  <option value={String(TutoringStatus.PENDING)}>Pendientes</option>
                  <option value={String(TutoringStatus.APPROVED)}>Programadas</option>
                  <option value={String(TutoringStatus.IN_PROGRESS)}>En Proceso</option>
                  <option value={String(TutoringStatus.COMPLETED)}>Finalizadas</option>
                  <option value={String(TutoringStatus.CANCELLED)}>Canceladas</option>
                </select>

                <CareerSemesterFilter
                  careers={careers}
                  selectedCareer={selectedDashCareer}
                  careerFilter={dashCareerFilter}
                  semesterFilter={dashSemesterFilter}
                  onCareerChange={setDashCareerFilter}
                  onSemesterChange={setDashSemesterFilter}
                />
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-1 text-xs font-medium shrink-0">
                <button
                  type="button"
                  onClick={() => setDisplayMode('list')}
                  className={`inline-flex min-h-10 items-center rounded-md px-3 transition-colors cursor-pointer ${
                    displayMode === 'list'
                      ? 'bg-white text-brand-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Lista
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('calendar')}
                  className={`inline-flex min-h-10 items-center rounded-md px-3 transition-colors cursor-pointer ${
                    displayMode === 'calendar'
                      ? 'bg-white text-brand-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Calendario
                </button>
              </div>
            </div>

            {displayMode === 'calendar' ? (
              <div className="p-4">
                <TutoringCalendarView
                  tutorings={filteredTutorings}
                  currentUser={currentUser}
                  onSelectTutoring={(tut) => setSelectedCalendarTutoring(tut)}
                />
              </div>
            ) : (
              <section aria-label="Solicitudes registradas" className="p-4 sm:p-5">
                {filteredTutorings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-14 text-center">
                    <FileText aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-stone-300" />
                    <p className="text-sm font-semibold text-slate-800">No hay solicitudes para mostrar</p>
                    <p className="mt-1 text-sm text-stone-500">Cambia los filtros para revisar otras tutorías.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTutorings.map((tut) => {
                      const dt = formatTutoringDateTime(tut.reservDate, tut.scheduleLabel, tut.reservTime);
                      const requester = users.find((user) => user.id === tut.petitionerStudentId || user.fullName === tut.petitionerStudentName);
                      const teacher = users.find((user) => user.id === tut.teacherId || user.fullName === tut.teacherName);
                      const participants = tut.assistants?.length || 0;
                      const hasMeetLink = tut.modality === TutoringModality.VIRTUAL && Boolean(tut.space?.startsWith('http'));
                      return (
                        <article key={tut.id} className="rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-stone-300 sm:p-5">
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-md border border-stone-200 bg-stone-50 px-2 py-1 font-mono text-[11px] font-medium text-stone-600">{tut.code}</span>
                                <StatusBadge status={tut.status} size="sm" />
                              </div>
                              <h3 className="mt-2 text-base font-semibold text-slate-900">{tut.subjectCourseName || tut.subject}</h3>
                              {tut.subject && tut.subjectCourseName && tut.subject !== tut.subjectCourseName && <p className="mt-0.5 text-sm text-stone-500">Tema: {tut.subject}</p>}

                              <dl className="mt-4 grid grid-cols-1 gap-x-5 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                                <div className="flex min-w-0 items-start gap-2.5">
                                  <Users aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                                  <div className="min-w-0"><dt className="text-xs text-stone-500">Solicitante</dt><dd className="mt-0.5 truncate font-medium text-slate-800">{tut.petitionerStudentName}</dd><dd className="mt-0.5 text-[11px] text-stone-500">{tut.petitionerAccount || requester?.account || '—'}{participants > 1 ? ` · ${participants} participantes` : ''}</dd></div>
                                </div>
                                <div className="flex min-w-0 items-start gap-2.5">
                                  <GraduationCap aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                                  <div className="min-w-0"><dt className="text-xs text-stone-500">Docente</dt><dd className="mt-0.5 truncate font-medium text-slate-800">{tut.teacherName || teacher?.fullName || 'Por asignar'}</dd></div>
                                </div>
                                <div className="flex min-w-0 items-start gap-2.5">
                                  <Calendar aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                                  <div className="min-w-0"><dt className="text-xs text-stone-500">Fecha y hora</dt><dd className="mt-0.5 font-medium text-slate-800">{dt.formattedDate}</dd><dd className="mt-0.5 text-xs text-stone-500">{dt.timeDisplay}</dd></div>
                                </div>
                                <div className="flex min-w-0 items-start gap-2.5">
                                  {tut.modality === TutoringModality.PRESENCIAL ? <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" /> : <Video aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />}
                                  <div className="min-w-0"><dt className="text-xs text-stone-500">{tut.modality === TutoringModality.PRESENCIAL ? 'Espacio' : 'Modalidad'}</dt><dd className="mt-0.5 break-words font-medium text-slate-800">
                                    {hasMeetLink ? <a href={tut.space} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 underline">Abrir Meet <ExternalLink aria-hidden="true" className="h-3 w-3" /></a> : tut.space ? `${tut.space}${tut.block ? ` · Bloque ${tut.block}` : ''}` : tut.modality === TutoringModality.PRESENCIAL ? 'Por asignar' : 'Virtual · Enlace pendiente'}
                                  </dd></div>
                                </div>
                              </dl>

                              {tut.attachmentName && (
                                <div className="mt-3">
                                  {tut.attachmentUrl ? (
                                    <button type="button" onClick={() => setViewingAttachment({ fileName: tut.attachmentName || 'Archivo adjunto', fileUrl: tut.attachmentUrl! })} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"><Paperclip aria-hidden="true" className="h-3.5 w-3.5 text-stone-500" />Ver adjunto</button>
                                  ) : <span className="inline-flex items-center gap-1.5 text-xs text-stone-500"><Paperclip aria-hidden="true" className="h-3.5 w-3.5" />{tut.attachmentName}</span>}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3 xl:max-w-[310px] xl:justify-end xl:border-l xl:pt-0 xl:pl-4">
                              <button
                                type="button"
                                id={`btn-view-detail-${tut.id}`}
                                onClick={() => setSelectedDetailTutoring(tut)}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-stone-200 px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                                title="Ver detalle de la solicitud"
                              ><FileText aria-hidden="true" className="h-3.5 w-3.5" />Detalle</button>
                              {tut.status === TutoringStatus.PENDING && (
                                <>
                                  <button
                                    type="button"
                                    id={`btn-open-approve-${tut.id}`}
                                    onClick={() => {
                                      setApprovingTutoring(tut);
                                      setAssignedSpace(tut.modality === TutoringModality.PRESENCIAL ? tut.space && tut.space !== 'Pendiente aula' ? tut.space : '' : 'https://meet.google.com/gt-tutoria-live');
                                      setAssignedBlock(tut.block || '');
                                    }}
                                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-brand-700 px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                                    title="Aprobar y asignar aula o enlace"
                                  ><Check aria-hidden="true" className="h-3.5 w-3.5" />Aprobar</button>
                                  <button type="button" id={`btn-open-cancel-${tut.id}`} onClick={() => setCancellingTutoring(tut)} className="inline-flex min-h-10 items-center rounded-lg border border-stone-200 px-3 text-xs font-medium text-danger transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger">Rechazar</button>
                                </>
                              )}
                              {tut.status === TutoringStatus.APPROVED && <button type="button" id={`btn-open-cancel-approved-${tut.id}`} onClick={() => setCancellingTutoring(tut)} className="inline-flex min-h-10 items-center rounded-lg border border-stone-200 px-3 text-xs font-medium text-danger transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger">Cancelar</button>}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <YafaPageHeader
            icon={<Users aria-hidden="true" className="h-[18px] w-[18px]" />}
            title="Estudiantes y cuentas"
            subtitle="Administra perfiles, roles y acceso a la plataforma."
            right={<button
                id="btn-admin-add-user"
                onClick={onOpenRegister}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-[#11770e] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#0d5c0b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#11770e]"
              >
                <Plus aria-hidden="true" className="w-4 h-4" />
                <span>Registrar estudiante</span>
              </button>}
          />

          {/* Resumen compacto de cuentas */}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: 'Cuentas registradas', value: users.length },
              { label: 'Estudiantes activos', value: users.filter((u) => u.role === UserRole.STUDENT && u.isActive).length },
              { label: 'Personal institucional', value: users.filter((u) => u.role === UserRole.TEACHER || u.role === UserRole.ADMIN).length }
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                <dt className="text-xs font-medium text-stone-500">{item.label}</dt>
                <dd className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>

          {deleteUserSuccess && (
            <div className="p-3.5 bg-brand-50 border border-brand-200 rounded-xl flex items-center gap-2.5 text-xs text-brand-800 animate-in fade-in">
              <CheckCircle aria-hidden="true" className="w-4 h-4 text-brand-700 shrink-0" />
              <span className="font-semibold">{deleteUserSuccess}</span>
            </div>
          )}

          {/* Directorio con filtros y fichas adaptables */}
          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="border-b border-stone-200 px-4 py-4 sm:px-5">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Directorio de cuentas</h2>
                  <p className="mt-0.5 text-xs text-stone-500">Consulta perfiles, roles y estado de acceso.</p>
                </div>
                <p className="text-xs text-stone-500" aria-live="polite">{filteredUsers.length} resultados</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_auto_auto]">
                <label className="relative block">
                  <span className="sr-only">Buscar usuario por nombre, carnet o correo</span>
                  <Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  <input
                    id="search-admin-users"
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Buscar por nombre, carnet o correo…"
                    className="h-10 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  />
                </label>
                <label>
                  <span className="sr-only">Filtrar por rol</span>
                  <select
                    id="select-filter-user-role"
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 sm:min-w-44"
                  >
                    <option value="all">Todos los roles</option>
                    <option value={UserRole.STUDENT}>Estudiantes</option>
                    <option value={UserRole.TEACHER}>Docentes</option>
                    <option value={UserRole.ADMIN}>Administradores</option>
                  </select>
                </label>
                <CareerSemesterFilter
                  careers={careers}
                  selectedCareer={selectedDashCareer}
                  careerFilter={dashCareerFilter}
                  semesterFilter={dashSemesterFilter}
                  onCareerChange={setDashCareerFilter}
                  onSemesterChange={setDashSemesterFilter}
                />
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <Users aria-hidden="true" className="mx-auto h-8 w-8 text-stone-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">No hay cuentas para mostrar</p>
                <p className="mt-1 text-xs text-stone-500">Prueba cambiando los filtros o el texto de búsqueda.</p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-3 bg-stone-50/60 p-3 sm:grid-cols-2 xl:grid-cols-3 sm:p-4">
                {filteredUsers.map((u) => {
                  const roleLabel = u.role === UserRole.STUDENT ? 'Estudiante' : u.role === UserRole.TEACHER ? 'Docente' : 'Administrador';
                  const careerName = u.careerId ? careers.find((c) => c.id === u.careerId)?.name || u.careerId : null;
                  return (
                    <li key={u.id} className="flex min-w-0 flex-col rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-stone-300">
                      <div className="flex min-w-0 items-start gap-3">
                        <UserAvatar user={u} size="md" className="shrink-0 border border-stone-200" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-slate-900" title={u.fullName}>{u.fullName}</h3>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${u.role === UserRole.STUDENT ? 'border-sky-200 bg-sky-50 text-sky-800' : u.role === UserRole.TEACHER ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-violet-200 bg-violet-50 text-violet-800'}`}>
                              {roleLabel}
                            </span>
                          </div>
                          <p className="mt-1 break-all text-xs text-stone-500">{u.email}</p>
                        </div>
                      </div>

                      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-stone-100 pt-3 text-xs">
                        <div className="min-w-0">
                          <dt className="text-stone-500">Carnet / código</dt>
                          <dd className="mt-0.5 truncate font-medium text-slate-800" title={u.account}>{u.account || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-stone-500">Acceso</dt>
                          <dd className={`mt-0.5 font-medium ${u.isActive ? 'text-brand-700' : 'text-stone-500'}`}>{u.isActive ? 'Activo' : 'Inactivo'}</dd>
                        </div>
                        <div className="col-span-2 min-w-0">
                          <dt className="text-stone-500">Carrera{u.role === UserRole.STUDENT ? ' · semestre' : ''}</dt>
                          <dd className="mt-0.5 truncate font-medium text-slate-800" title={careerName || undefined}>
                            {careerName || '—'}{u.role === UserRole.STUDENT && u.semester ? ` · Semestre ${u.semester}` : ''}
                          </dd>
                        </div>
                      </dl>

                      {u.id !== currentUser.id && (
                        <div className="mt-4 flex gap-2 border-t border-stone-100 pt-3">
                          <button
                            id={`btn-toggle-user-${u.id}`}
                            onClick={() => handleToggleUserActive(u.id)}
                            className={`min-h-10 flex-1 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${u.isActive ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100' : 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100'}`}
                          >
                            {u.isActive ? 'Desactivar acceso' : 'Activar acceso'}
                          </button>
                          <button
                            id={`btn-delete-user-${u.id}`}
                            onClick={() => { setDeletingUser(u); setDeleteUserError(null); }}
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-200 px-3 text-xs font-semibold text-slate-600 transition-colors hover:border-danger-border hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                            title={u.role === UserRole.STUDENT ? 'Eliminar estudiante definitivamente' : 'Eliminar usuario'}
                            aria-label={`Eliminar cuenta de ${u.fullName}`}
                          >
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* TAB 4: BINNACLE */}
      {activeTab === 'binnacle' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <YafaPageHeader
            icon={<ShieldCheck aria-hidden="true" className="h-[18px] w-[18px]" />}
            title="Bitácora de auditoría"
            subtitle="Actividad académica y administrativa registrada en la plataforma."
            right={<span className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600">{binnacle.length} eventos</span>}
          />

          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="flex flex-col gap-1 border-b border-stone-200 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Actividad reciente</h2>
                <p className="mt-0.5 text-xs text-stone-500">Cada registro conserva fecha, responsable, descripción y origen.</p>
              </div>
              <span className="text-xs text-stone-500">Más recientes primero</span>
            </div>

            {binnacle.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <ShieldCheck aria-hidden="true" className="mx-auto h-8 w-8 text-stone-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">Aún no hay actividad registrada</p>
                <p className="mt-1 text-xs text-stone-500">Los eventos aparecerán aquí cuando se realicen acciones en la plataforma.</p>
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {binnacle.map((b) => {
                  const eventType = b.typeEvent || (b as any).eventType || 'Evento';
                  const dateStr = b.dateEvent || (b as any).date || '';
                  const hourStr = b.hourEvent || (b as any).hour || (b as any).time || '';

                  let formattedDate = dateStr;
                  if (dateStr && dateStr.includes('-')) {
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                      const year = parseInt(parts[0], 10);
                      const month = parseInt(parts[1], 10) - 1;
                      const day = parseInt(parts[2], 10);
                      const d = new Date(year, month, day);
                      const rawMonth = d.toLocaleDateString('es-CO', { month: 'short' });
                      formattedDate = `${day} ${rawMonth} ${year}`;
                    }
                  }

                  return (
                    <li key={b.id} className="grid gap-3 px-4 py-4 transition-colors hover:bg-stone-50/70 sm:grid-cols-[150px_minmax(0,1fr)] sm:px-5">
                      <div className="flex items-center gap-2 text-xs text-stone-600 sm:items-start sm:pt-0.5">
                        <Calendar aria-hidden="true" className="h-4 w-4 shrink-0 text-stone-400" />
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:block">
                          <p className="font-medium text-slate-700">{formattedDate || 'Fecha sin registrar'}</p>
                          {hourStr && <p className="font-mono text-[11px] text-stone-500 sm:mt-1">{hourStr}</p>}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-700">{eventType}</span>
                          <span className="text-xs text-stone-500">@{b.username || 'usuario desconocido'}</span>
                        </div>
                        <p className="mt-2 break-words text-sm leading-5 text-slate-800">{b.description}</p>
                        <p className="mt-2 font-mono text-[11px] text-stone-400">IP de origen · {b.ipAddress || '127.0.0.1'}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      </div>

      {/* MODAL: APPROVE TUTORING */}
      {approvingTutoring && (
        <div
          id="modal-approve-backdrop"
          onClick={(event) => { if (event.target === event.currentTarget) setApprovingTutoring(null); }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div
            id="modal-approve-card"
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
          >
            <div className="px-5 py-4 bg-brand-50 border-b border-brand-100 flex items-center justify-between">
              <h3 className="font-bold text-brand-900 text-sm flex items-center gap-1.5">
                <Check aria-hidden="true" className="w-4 h-4 text-brand-700" />
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
                <div className="flex items-center gap-2 pt-1 text-slate-700">
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <Calendar aria-hidden="true" className="w-3.5 h-3.5 text-brand-700" />
                    {formatTutoringDateTime(approvingTutoring.reservDate, approvingTutoring.scheduleLabel, approvingTutoring.reservTime).formattedDate}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-brand-700 flex items-center gap-1 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md">
                    <Clock aria-hidden="true" className="w-3 h-3" />
                    {approvingTutoring.reservTime || approvingTutoring.scheduleLabel}
                  </span>
                </div>
                <div className="text-slate-700 font-medium pt-0.5">
                  Modalidad:{' '}
                  <span className="font-bold text-slate-900">
                    {approvingTutoring.modality === TutoringModality.PRESENCIAL
                      ? 'Presencial (Aula física)'
                      : 'Virtual (Enlace web)'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  {approvingTutoring.modality === TutoringModality.PRESENCIAL
                    ? 'Asignar Aula Física (Sección)'
                    : 'Asignar Enlace de Videollamada (Meet / Zoom)'}
                </label>
                {approvingTutoring.modality === TutoringModality.PRESENCIAL ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      id="input-approve-classroom"
                      type="text"
                      value={assignedSpace}
                      onChange={(e) => setAssignedSpace(e.target.value)}
                      required
                      maxLength={200}
                      placeholder="Salón o aula"
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                    />
                    <input
                      id="input-approve-block"
                      type="text"
                      value={assignedBlock}
                      onChange={(e) => setAssignedBlock(e.target.value)}
                      required
                      maxLength={50}
                      placeholder="Bloque o edificio"
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                    />
                  </div>
                ) : (
                  <input
                    id="input-approve-link"
                    type="url"
                    value={assignedSpace}
                    onChange={(e) => setAssignedSpace(e.target.value)}
                    required
                    placeholder="Enlace de videollamada (Google Meet, Zoom, etc.)"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  />
                )}
              </div>

              {approvalError && (
                <div role="alert" className="p-2.5 bg-danger-soft border border-danger-border text-danger rounded-lg text-xs">
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
                  className="px-4 py-1.5 bg-brand-700 hover:bg-brand-800 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {approving ? 'Guardando…' : 'Confirmar Aprobación'}
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
          onClick={(event) => { if (event.target === event.currentTarget) setCancellingTutoring(null); }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div
            id="modal-cancel-card"
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
          >
            <div className="px-5 py-4 bg-danger-soft border-b border-danger-border flex items-center justify-between">
              <h3 className="font-bold text-danger text-sm flex items-center gap-1.5">
                <Ban aria-hidden="true" className="w-4 h-4 text-danger" />
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
                <div className="text-slate-600">
                  Alumno: {cancellingTutoring.petitionerStudentName} | Docente: {cancellingTutoring.teacherName}
                </div>
                <div className="flex items-center gap-2 pt-1 text-slate-500 text-[11px]">
                  <span>
                    Fecha: <strong>{formatTutoringDateTime(cancellingTutoring.reservDate, cancellingTutoring.scheduleLabel, cancellingTutoring.reservTime).formattedDate}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Horario: <strong>{cancellingTutoring.reservTime || cancellingTutoring.scheduleLabel}</strong>
                  </span>
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
                  placeholder="Motivo de la cancelación"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-danger"
                />
              </div>

              {cancelError && (
                <div role="alert" className="p-2.5 bg-danger-soft border border-danger-border text-danger rounded-lg text-xs">
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
                  className="px-4 py-1.5 bg-gradient-to-b from-danger to-rose-800 hover:from-rose-800 hover:to-rose-900 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {cancelling ? 'Cancelando…' : 'Confirmar Cancelación'}
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
          onClick={(event) => { if (event.target === event.currentTarget && !deleteUserLoading) setDeletingUser(null); }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div
            id="modal-delete-user-card"
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
          >
            <div className="px-5 py-4 bg-danger-soft border-b border-danger-border flex items-center justify-between">
              <h3 className="font-bold text-danger text-sm flex items-center gap-2">
                <Trash2 aria-hidden="true" className="w-4 h-4 text-danger" />
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
                  <span className="font-mono bg-info-soft text-info border border-info-border px-1.5 py-0.2 rounded font-bold">
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
                <div id="alert-delete-user-error" role="alert" className="p-3 bg-danger-soft border border-danger-border rounded-xl flex items-start gap-2 text-xs text-danger">
                  <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deleteUserError}</span>
                </div>
              )}

              <div className="p-2.5 bg-warning-soft border border-warning-border rounded-lg text-[11px] text-amber-800">
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
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-b from-danger to-rose-800 hover:from-rose-800 hover:to-rose-900 rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {deleteUserLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Eliminando…</span>
                    </>
                  ) : (
                    <>
                      <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
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

      {selectedCalendarTutoring && (
        <TutoringDetailModal
          tutoring={selectedCalendarTutoring}
          currentUser={currentUser}
          onClose={() => setSelectedCalendarTutoring(null)}
        />
      )}

      {selectedDetailTutoring && (
        <TutoringDetailModal
          tutoring={selectedDetailTutoring}
          currentUser={currentUser}
          onClose={() => setSelectedDetailTutoring(null)}
          variant="admin-requests"
        />
      )}
    </div>
  );
};

const CareerSemesterFilter: React.FC<{
  careers: Career[];
  selectedCareer?: Career;
  careerFilter: string;
  semesterFilter: string;
  onCareerChange: (v: string) => void;
  onSemesterChange: (v: string) => void;
}> = ({ careers, selectedCareer, careerFilter, semesterFilter, onCareerChange, onSemesterChange }) => (
  <div className="flex items-center gap-2 text-xs flex-wrap sm:flex-nowrap">
    <select
      id="dash-filter-career"
      value={careerFilter}
      onChange={(e) => {
        onCareerChange(e.target.value);
        onSemesterChange('all');
      }}
      className="rounded-md border border-[#8792a2] bg-white px-2.5 h-8 text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/40 focus:border-[#11770e] transition-colors cursor-pointer text-xs max-w-[200px] truncate"
    >
      <option value="all">Todas las carreras</option>
      {careers.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
    <select
      id="dash-filter-semester"
      value={semesterFilter}
      onChange={(e) => onSemesterChange(e.target.value)}
      disabled={careerFilter === 'all'}
      className="rounded-md border border-[#8792a2] bg-white px-2 h-8 text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/40 focus:border-[#11770e] transition-colors cursor-pointer text-xs w-auto max-w-[135px] disabled:opacity-50 disabled:bg-stone-50 disabled:cursor-not-allowed"
    >
      <option value="all">Todos los semestres</option>
      {Array.from({ length: selectedCareer?.numberOfSemesters || 10 }, (_, i) => i + 1).map((n) => (
        <option key={n} value={n}>
          Semestre {n}
        </option>
      ))}
    </select>
  </div>
);
