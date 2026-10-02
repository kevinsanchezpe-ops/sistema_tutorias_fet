import React, { useState, Fragment } from 'react';
import {
  BinnacleEntry,
  Career,
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
  SlidersHorizontal,
  List,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Plus,
  BarChart3,
  ListOrdered,
  CalendarDays
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
  careers,
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
    'overview' | 'careers' | 'subjects' | 'teachers' | 'tutorings' | 'users' | 'binnacle' | 'institution'
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
  const [demandViewMode, setDemandViewMode] = useState<'chart' | 'ranking'>('chart');
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
  const dashCareerRows = careers.map((c) => ({
    careerId: c.id,
    careerName: c.name,
    subjectCount: subjects.filter((s) => s.careerId === c.id).length,
    studentCount: users.filter((u) => u.role === UserRole.STUDENT && u.careerId === c.id).length,
    tutoringCount: tutorings.filter((t) => subjectCareerMap.get(t.subjectCourseId) === c.id).length
  }));

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

  // Institution Edit Form
  const [instName, setInstName] = useState(institution.name);
  const [instMission, setInstMission] = useState(institution.mission);
  const [instVision, setInstVision] = useState(institution.vision);
  const [instPhone, setInstPhone] = useState(institution.phone);
  const [instEmail, setInstEmail] = useState(institution.email);
  const [instAddress, setInstAddress] = useState(institution.address);
  const [instSavedMsg, setInstSavedMsg] = useState(false);

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
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Sidebar Navigation */}
        <aside className="w-full lg:w-64 shrink-0 bg-white rounded-2xl border border-stone-200 p-4 space-y-5 shadow-xs">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Menú Principal
          </div>
          <nav className="space-y-1">
            <button
              id="tab-admin-overview"
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#11770e] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-[#eaf8ea] hover:text-[#11770e]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>Métricas y Panel</span>
              </div>
            </button>

            <button
              id="tab-admin-subjects"
              onClick={() => setActiveTab('subjects')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'subjects'
                  ? 'bg-[#11770e] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-[#eaf8ea] hover:text-[#11770e]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4" />
                <span>Asignaturas</span>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'subjects' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {subjects.length}
              </span>
            </button>

            <button
              id="tab-admin-careers"
              onClick={() => setActiveTab('careers')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'careers'
                  ? 'bg-[#11770e] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-[#eaf8ea] hover:text-[#11770e]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-4 h-4" />
                <span>Carreras</span>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'careers' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {careers.length}
              </span>
            </button>

            <button
              id="tab-admin-teachers"
              onClick={() => setActiveTab('teachers')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'teachers'
                  ? 'bg-[#11770e] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-[#eaf8ea] hover:text-[#11770e]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-4 h-4" />
                <span>Docentes</span>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'teachers' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {users.filter((u) => u.role === UserRole.TEACHER).length}
              </span>
            </button>

            <button
              id="tab-admin-tutorings"
              onClick={() => setActiveTab('tutorings')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'tutorings'
                  ? 'bg-[#11770e] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-[#eaf8ea] hover:text-[#11770e]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4" />
                <span>Solicitudes</span>
              </div>
              {tutorings.filter((t) => t.status === TutoringStatus.PENDING).length > 0 && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    activeTab === 'tutorings'
                      ? 'bg-white text-[#11770e]'
                      : 'bg-[#eaf8ea] text-[#11770e] border border-[#bce6bc]'
                  }`}
                >
                  {tutorings.filter((t) => t.status === TutoringStatus.PENDING).length} pend.
                </span>
              )}
            </button>

            <button
              id="tab-admin-users"
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-[#11770e] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-[#eaf8ea] hover:text-[#11770e]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Estudiantes y Cuentas</span>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {users.length}
              </span>
            </button>
          </nav>
        </div>

        <div className="pt-3 border-t border-stone-200">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Sistema y Auditoría
          </div>
          <nav className="space-y-1">
            <button
              id="tab-admin-binnacle"
              onClick={() => setActiveTab('binnacle')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'binnacle'
                  ? 'bg-[#11770e] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-[#eaf8ea] hover:text-[#11770e]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Bitácora de Auditoría</span>
            </button>

            <button
              id="tab-admin-institution"
              onClick={() => setActiveTab('institution')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'institution'
                  ? 'bg-[#11770e] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-[#eaf8ea] hover:text-[#11770e]'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Configuración Institucional</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 w-full min-w-0 space-y-6">
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
              color: '#475569'
            }
          ];

          const statusData = !filterActive && analytics?.statusDistribution ? analytics.statusDistribution : [
            { name: 'Pendientes', count: pendingTuts, color: '#F59E0B' },
            { name: 'Aprobadas', count: approvedTuts, color: '#7ce200' },
            { name: 'En Proceso', count: inProgTuts, color: '#3B82F6' },
            { name: 'Finalizadas', count: completedTuts, color: '#11770e' },
            { name: 'Canceladas', count: cancelledTuts, color: '#EF4444' }
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
                subject: s.name.length > 20 ? s.name.substring(0, 18) + '...' : s.name,
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
            { stars: '5 Estrellas', count: dashTutoringsFiltered.filter((t) => t.score >= 5).length, color: '#10B981' },
            { stars: '4 Estrellas', count: dashTutoringsFiltered.filter((t) => t.score === 4).length, color: '#3B82F6' },
            { stars: '3 Estrellas', count: dashTutoringsFiltered.filter((t) => t.score === 3).length, color: '#F59E0B' },
            { stars: '2 Estrellas', count: dashTutoringsFiltered.filter((t) => t.score === 2).length, color: '#F97316' },
            { stars: '1 Estrella', count: dashTutoringsFiltered.filter((t) => t.score === 1).length, color: '#EF4444' }
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
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Top Greeting & Action Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      Hola, {currentUser.fullName}
                    </h2>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#11770e] animate-pulse" title="Sistema Activo" />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Panel institucional de gestión y métricas académicas FET en tiempo real.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={onRefresh}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-stone-200 hover:border-stone-300 hover:bg-[#fffaed] text-stone-700 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                    title="Actualizar datos desde la base de datos"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#11770e]" />
                    <span>Actualizar</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('tutorings')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#11770e] hover:bg-[#0d5c0b] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <span>Ver Solicitudes</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 70/30 Split Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* Left 70% Column */}
                <div className="xl:col-span-8 space-y-6">
                  {/* Hero Featured Card & 2x2 Metric Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Featured Hero Card */}
                    <div className="md:col-span-5 bg-gradient-to-br from-[#11770e] to-[#0d5c0b] text-white p-5 rounded-2xl flex flex-col justify-between shadow-xs relative overflow-hidden">
                      <div className="space-y-2">
                        <span className="inline-block px-2.5 py-1 bg-white/20 backdrop-blur-xs text-white text-[11px] font-bold rounded-lg uppercase tracking-wider">
                          ¡Ciclo Académico Activo!
                        </span>
                        <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                          Gestión Integral de Tutorías FET
                        </h3>
                        <p className="text-xs text-white/90 leading-relaxed">
                          Supervisa el progreso de las tutorías presenciales y virtuales en tiempo real.
                        </p>
                      </div>

                      <div className="pt-4 mt-2 flex items-center justify-between border-t border-white/15 text-xs">
                        <div>
                          <span className="font-black text-lg">{pendingTuts}</span>
                          <span className="text-white/80 ml-1.5 text-[11px]">pendientes</span>
                        </div>
                        <button
                          onClick={() => setActiveTab('tutorings')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-[#11770e] rounded-xl text-xs font-bold hover:bg-[#fffaed] transition-colors cursor-pointer shadow-xs"
                        >
                          <span>Gestionar</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 2x2 Metric Cards */}
                    <div className="md:col-span-7 grid grid-cols-2 gap-3">
                      {/* KPI 1: Total Solicitudes */}
                      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-col justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Total Solicitudes
                        </span>
                        <div className="text-2xl font-black text-slate-900 my-1">{totalTuts}</div>
                        <div className="text-[11px] text-slate-500">
                          <span className="text-[#11770e] font-bold">{pendingTuts + approvedTuts + inProgTuts}</span> activas
                        </div>
                      </div>

                      {/* KPI 2: Docentes Tutores */}
                      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-col justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Docentes Tutores
                        </span>
                        <div className="text-2xl font-black text-slate-900 my-1">
                          {dashUsers.filter((u) => u.role === UserRole.TEACHER).length}
                        </div>
                        <div className="text-[11px] text-slate-500">Docentes habilitados</div>
                      </div>

                      {/* KPI 3: Asistencia */}
                      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-col justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Asistencia Promedio
                        </span>
                        <div className="text-2xl font-black text-slate-900 my-1">{attRate}%</div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-[#11770e] h-1.5 rounded-full" style={{ width: `${attRate}%` }} />
                        </div>
                      </div>

                      {/* KPI 4: Tasa de Éxito */}
                      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-col justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Tasa de Éxito
                        </span>
                        <div className="text-2xl font-black text-[#11770e] my-1">{compRate}%</div>
                        <div className="text-[11px] text-slate-500">{completedTuts} concluidas</div>
                      </div>
                    </div>
                  </div>

                  {/* Rendimiento y Demanda por Asignatura */}
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                    {/* Header Row: Title & View Switcher */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            Rendimiento y Demanda por Asignatura
                          </h4>
                          <span className="text-[11px] font-semibold text-[#11770e] bg-[#eaf8ea] px-2 py-0.5 rounded-md border border-[#bce6bc]/60 shrink-0">
                            {totalDemandRequests} {totalDemandRequests === 1 ? 'solicitud' : 'solicitudes'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Monitoreo de materias con mayor interés de tutoría académica
                        </p>
                      </div>

                      {/* View Switcher: Gráfico vs Ranking */}
                      <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setDemandViewMode('chart')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                            demandViewMode === 'chart'
                              ? 'bg-white text-[#11770e] shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Vista Gráfico de Barras"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Gráfico</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDemandViewMode('ranking')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                            demandViewMode === 'ranking'
                              ? 'bg-white text-[#11770e] shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Vista Ranking Detallado"
                        >
                          <ListOrdered className="w-3.5 h-3.5" />
                          <span>Ranking</span>
                        </button>
                      </div>
                    </div>

                    {/* Filter Strip Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#fafaf7] p-2.5 rounded-xl border border-stone-200/80">
                      <div className="flex items-center gap-1.5 text-xs text-stone-600 font-semibold">
                        <Filter className="w-3.5 h-3.5 text-[#11770e]" />
                        <span>Filtrar por Programa y Nivel:</span>
                      </div>

                      <CareerSemesterFilter
                        careers={careers}
                        selectedCareer={selectedDashCareer}
                        careerFilter={dashCareerFilter}
                        semesterFilter={dashSemesterFilter}
                        onCareerChange={setDashCareerFilter}
                        onSemesterChange={setDashSemesterFilter}
                      />
                    </div>

                    {/* Mini KPI Demand Summary Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      {/* Top Materia */}
                      <div className="bg-[#fafaf7] border border-stone-200/80 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#11770e]/10 text-[#11770e] flex items-center justify-center shrink-0">
                          <Award className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                            Mayor Demanda
                          </span>
                          <span className="text-xs font-bold text-slate-800 truncate block">
                            {topSubject ? topSubject.fullName : 'Sin solicitudes'}
                          </span>
                          {topSubject && (
                            <span className="text-[11px] font-semibold text-[#11770e]">
                              {topSubject.count} {topSubject.count === 1 ? 'tutoría' : 'tutorías'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Materias Solicitadas */}
                      <div className="bg-[#fafaf7] border border-stone-200/80 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                            Materias con Solicitudes
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {subjectsWithDemandCount} de {activeSubjects.length} activas
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {activeSubjects.length > 0
                              ? Math.round((subjectsWithDemandCount / activeSubjects.length) * 100)
                              : 0}% con demanda
                          </span>
                        </div>
                      </div>

                      {/* Promedio Solicitudes */}
                      <div className="bg-[#fafaf7] border border-stone-200/80 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                            Promedio por Materia
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {avgDemandPerSubject} tutorías
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            por asignatura registrada
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Chart View */}
                    {demandViewMode === 'chart' && (
                      <div className="pt-2">
                        {totalDemandRequests === 0 ? (
                          <div className="py-12 px-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs font-semibold text-slate-600">
                              No hay tutorías registradas para los filtros seleccionados
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Cambia el filtro de carrera o semestre para explorar otros periodos.
                            </p>
                          </div>
                        ) : (
                          <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={courseData.slice(0, 10)}
                                margin={{ top: 15, right: 15, left: -20, bottom: 35 }}
                              >
                                <XAxis
                                  dataKey="subject"
                                  tick={{ fontSize: 11, fill: '#475569' }}
                                  angle={-20}
                                  textAnchor="end"
                                />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: '#FFFFFF',
                                    fontSize: '12px',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                                  }}
                                  formatter={(val: any) => [`${val} tutorías`, 'Demanda']}
                                  labelFormatter={(label: any) => {
                                    const match = courseData.find((c) => c.subject === label || c.fullName === label);
                                    return match ? match.fullName : label;
                                  }}
                                />
                                <Bar
                                  dataKey="count"
                                  fill="#11770e"
                                  radius={[6, 6, 0, 0]}
                                  name="Tutorías Solicitadas"
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ranking View */}
                    {demandViewMode === 'ranking' && (
                      <div className="pt-2">
                        {courseData.length === 0 ? (
                          <div className="py-12 px-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs font-semibold text-slate-600">
                              No hay asignaturas activas en este filtro
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-hidden rounded-xl border border-stone-200">
                            <div className="max-h-72 overflow-y-auto divide-y divide-stone-100">
                              {courseData.map((item, idx) => {
                                const percentOfMax = Math.round((item.count / maxSubjectCount) * 100);
                                return (
                                  <div
                                    key={item.id}
                                    className="p-3 bg-white hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3 text-xs"
                                  >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      {/* Rank Badge */}
                                      <span
                                        className={`w-6 h-6 rounded-lg text-[11px] font-extrabold flex items-center justify-center shrink-0 ${
                                          idx === 0 && item.count > 0
                                            ? 'bg-[#11770e] text-white'
                                            : idx < 3 && item.count > 0
                                            ? 'bg-[#eaf8ea] text-[#11770e] border border-[#bce6bc]'
                                            : 'bg-slate-100 text-slate-500'
                                        }`}
                                      >
                                        #{idx + 1}
                                      </span>

                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-800 truncate">
                                            {item.fullName}
                                          </span>
                                          {item.semester && (
                                            <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                                              Sem. {item.semester}
                                            </span>
                                          )}
                                          {item.careerCode && (
                                            <span className="text-[10px] font-mono text-slate-400">
                                              ({item.careerCode})
                                            </span>
                                          )}
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden max-w-md">
                                          <div
                                            className="bg-[#11770e] h-1.5 rounded-full transition-all duration-300"
                                            style={{ width: `${item.count > 0 ? Math.max(percentOfMax, 5) : 0}%` }}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Count Badge */}
                                    <div className="text-right shrink-0">
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${
                                          item.count > 0
                                            ? 'bg-[#eaf8ea] text-[#11770e] border border-[#bce6bc]/60'
                                            : 'bg-slate-100 text-slate-400'
                                        }`}
                                      >
                                        {item.count} {item.count === 1 ? 'solicitud' : 'solicitudes'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Flujo / Pipeline de Estados */}
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Flujo de Estados de las Tutorías</h3>
                        <p className="text-xs text-slate-500">Distribución de las solicitudes a lo largo del ciclo</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {totalTuts} Totales
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 text-xs">
                      {/* Pendientes */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                        <div className="flex items-center justify-between text-slate-700 font-semibold">
                          <span>Pendientes</span>
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{pendingTuts}</div>
                        <div className="text-[11px] text-slate-500">
                          {totalTuts > 0 ? Math.round((pendingTuts / totalTuts) * 100) : 0}% del total
                        </div>
                      </div>

                      {/* Programadas */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                        <div className="flex items-center justify-between text-slate-700 font-semibold">
                          <span>Programadas</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{approvedTuts}</div>
                        <div className="text-[11px] text-slate-500">
                          {totalTuts > 0 ? Math.round((approvedTuts / totalTuts) * 100) : 0}% del total
                        </div>
                      </div>

                      {/* En Proceso */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                        <div className="flex items-center justify-between text-slate-700 font-semibold">
                          <span>En Proceso</span>
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{inProgTuts}</div>
                        <div className="text-[11px] text-slate-500">
                          {totalTuts > 0 ? Math.round((inProgTuts / totalTuts) * 100) : 0}% del total
                        </div>
                      </div>

                      {/* Finalizadas */}
                      <div className="bg-[#eaf8ea] border border-[#bce6bc] rounded-xl p-3.5 space-y-1">
                        <div className="flex items-center justify-between text-[#11770e] font-semibold">
                          <span>Finalizadas</span>
                          <span className="w-2 h-2 rounded-full bg-[#11770e]" />
                        </div>
                        <div className="text-2xl font-bold text-[#0d5c0b]">{completedTuts}</div>
                        <div className="text-[11px] text-[#11770e]">
                          {totalTuts > 0 ? Math.round((completedTuts / totalTuts) * 100) : 0}% del total
                        </div>
                      </div>

                      {/* Canceladas */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1 col-span-2 sm:col-span-1">
                        <div className="flex items-center justify-between text-slate-700 font-semibold">
                          <span>Canceladas</span>
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{cancelledTuts}</div>
                        <div className="text-[11px] text-slate-500">
                          {totalTuts > 0 ? Math.round((cancelledTuts / totalTuts) * 100) : 0}% del total
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resumen por Carrera y Semestre */}
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Resumen por Carrera y Semestre</h4>
                        <p className="text-xs text-slate-500">
                          Asignaturas activas, estudiantes y tutorías registradas
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {dashCareerFilter !== 'all'
                          ? (selectedDashCareer?.name || 'Carrera específica')
                          : 'Todas las carreras'}
                      </span>
                    </div>

                    <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-xl border border-slate-100">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="px-4 py-3">Carrera</th>
                            <th className="px-4 py-3">Semestre</th>
                            <th className="px-4 py-3 text-center">Asignaturas</th>
                            <th className="px-4 py-3 text-center">Estudiantes</th>
                            <th className="px-4 py-3 text-center">Tutorías</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {careers.map((c) => {
                            if (dashCareerFilter !== 'all' && c.id !== dashCareerFilter) return null;
                            const rows = dashPerSemesterRows.filter(
                              (r) =>
                                r.careerId === c.id &&
                                (dashSemesterFilter === 'all' || r.sem === Number(dashSemesterFilter))
                            );
                            const totals = dashCareerRows.find((r) => r.careerId === c.id);
                            if (rows.length === 0 || !totals) return null;
                            return (
                              <Fragment key={c.id}>
                                <tr className="bg-[#fafaf7]">
                                  <td colSpan={5} className="px-4 py-2 font-extrabold text-slate-800">
                                    {c.name}{' '}
                                    <span className="text-[10px] font-semibold text-slate-400">({c.codePrefix})</span>
                                  </td>
                                </tr>
                                {rows.map((r) => (
                                  <tr key={`${c.id}-${r.sem}`} className="hover:bg-slate-50/70">
                                    <td className="px-4 py-2 text-slate-500">—</td>
                                    <td className="px-4 py-2 font-semibold text-slate-700">Semestre {r.sem}</td>
                                    <td className="px-4 py-2 text-center">{r.subjectCount}</td>
                                    <td className="px-4 py-2 text-center">{r.studentCount}</td>
                                    <td className="px-4 py-2 text-center">{r.tutoringCount}</td>
                                  </tr>
                                ))}
                                <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                                  <td className="px-4 py-2 text-slate-800">Totales</td>
                                  <td className="px-4 py-2 text-slate-500 font-normal">{c.numberOfSemesters} semestres</td>
                                  <td className="px-4 py-2 text-center text-[#11770e]">{totals.subjectCount}</td>
                                  <td className="px-4 py-2 text-center text-blue-700">{totals.studentCount}</td>
                                  <td className="px-4 py-2 text-center text-indigo-700">{totals.tutoringCount}</td>
                                </tr>
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

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
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          scheduleTab === 'schedule'
                            ? 'bg-white text-[#11770e] shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Horario</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#eaf8ea] text-[#11770e] font-black">
                          {weekTotalTutorings}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setScheduleTab('events')}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          scheduleTab === 'events'
                            ? 'bg-white text-[#11770e] shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <CalendarCheck className="w-3.5 h-3.5" />
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
                          <div className="flex items-center gap-1 bg-[#fafaf7] p-0.5 rounded-lg border border-stone-200/80">
                            <button
                              type="button"
                              onClick={() => setWeekOffset((prev) => prev - 1)}
                              className="p-1 rounded-md hover:bg-white hover:text-[#11770e] text-slate-600 cursor-pointer transition-colors"
                              title="Semana anterior"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setWeekOffset(0);
                                setSelectedScheduleDay('all');
                              }}
                              className={`px-2.5 py-0.5 text-[11px] rounded-md font-bold cursor-pointer transition-colors ${
                                weekOffset === 0
                                  ? 'bg-[#11770e] text-white shadow-2xs'
                                  : 'hover:bg-white text-slate-700'
                              }`}
                              title="Ir a semana actual"
                            >
                              Hoy
                            </button>
                            <button
                              type="button"
                              onClick={() => setWeekOffset((prev) => prev + 1)}
                              className="p-1 rounded-md hover:bg-white hover:text-[#11770e] text-slate-600 cursor-pointer transition-colors"
                              title="Semana siguiente"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
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
                        <div className="grid grid-cols-7 gap-1 bg-[#fafaf7] p-1 rounded-xl border border-stone-200/80">
                          <button
                            type="button"
                            onClick={() => setSelectedScheduleDay('all')}
                            className={`py-1 text-center rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              selectedScheduleDay === 'all'
                                ? 'bg-[#11770e] text-white shadow-2xs'
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
                                className={`py-1 text-center rounded-lg text-[10px] transition-all relative cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#11770e] text-white font-black shadow-2xs'
                                    : isToday
                                    ? 'bg-[#eaf8ea] text-[#11770e] font-bold border border-[#bce6bc]'
                                    : 'text-slate-600 hover:bg-white font-medium'
                                }`}
                              >
                                <span className="block leading-none text-[9px] uppercase">{d.dayName}</span>
                                <span className="block leading-tight font-bold text-xs mt-0.5">{d.dayNumber}</span>
                                {hasSessions && !isSelected && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#11770e] mx-auto mt-0.5 block" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Day-by-Day Session Cards */}
                        <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-0.5">
                          {selectedScheduleDay === 'all' && weekTotalTutorings === 0 ? (
                            <div className="py-8 px-4 text-center bg-[#fafaf7] rounded-xl border border-dashed border-stone-200">
                              <Calendar className="w-7 h-7 text-stone-300 mx-auto mb-1.5" />
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
                                    className={`p-3 rounded-xl border transition-all ${
                                      isToday
                                        ? 'bg-[#eaf8ea]/40 border-[#bce6bc]'
                                        : 'bg-[#fafaf7] border-stone-200/80'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                                            isToday
                                              ? 'bg-[#11770e] text-white'
                                              : 'bg-white text-slate-700 border border-slate-200'
                                          }`}
                                        >
                                          {day.dayNumber}
                                        </span>
                                        <span className="text-xs font-bold text-slate-800">
                                          {day.dayName}, {day.dayNumber} {day.monthName}
                                        </span>
                                        {isToday && (
                                          <span className="text-[10px] bg-[#11770e] text-white px-1.5 py-0.2 rounded font-bold">
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
                                            className="p-2.5 bg-white rounded-xl border border-stone-200 hover:border-[#11770e] hover:shadow-2xs transition-all cursor-pointer text-xs space-y-1.5"
                                          >
                                            <div className="flex items-start justify-between gap-2">
                                              <span className="font-bold text-slate-800 leading-tight">
                                                {tut.subjectCourseName || tut.subject}
                                              </span>
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#eaf8ea] text-[#11770e] border border-[#bce6bc]/60 shrink-0">
                                                <Clock className="w-3 h-3" />
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
                                                    <MapPin className="w-3 h-3 text-[#11770e]" />
                                                    Presencial
                                                  </>
                                                ) : (
                                                  <>
                                                    <Video className="w-3 h-3 text-indigo-600" />
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
                          <span className="font-semibold text-[#11770e]">
                            {upcomingTutorings.length} en total
                          </span>
                        </div>

                        {upcomingTutorings.length === 0 ? (
                          <div className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
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
                                  className="p-3 bg-white rounded-xl border border-stone-200 hover:border-[#11770e] hover:shadow-2xs transition-all cursor-pointer text-xs space-y-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                        isToday
                                          ? 'bg-[#11770e] text-white'
                                          : 'bg-stone-100 text-stone-700'
                                      }`}
                                    >
                                      <Calendar className="w-3 h-3" />
                                      {isToday ? '¡Hoy!' : dt.formattedDate}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#eaf8ea] text-[#11770e] border border-[#bce6bc]/60">
                                      <Clock className="w-3 h-3" />
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
                                          <MapPin className="w-3 h-3 text-[#11770e]" />
                                          {tut.space || 'Presencial'}
                                        </>
                                      ) : (
                                        <>
                                          <Video className="w-3 h-3 text-indigo-600" />
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
                      <div className="p-2.5 rounded-xl bg-[#eaf8ea] border border-[#bce6bc] flex flex-col justify-between">
                        <div className="font-bold text-[#11770e] text-[11px]">Presencial</div>
                        <div className="text-lg font-black text-[#0d5c0b] mt-1">{presencialCount}</div>
                        <div className="text-[10px] text-[#11770e]">
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
                      <span className="text-[11px] text-[#11770e] font-bold">Top</span>
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
                              <span className="w-5 h-5 rounded-md bg-[#eaf8ea] text-[#11770e] font-bold text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-slate-800 truncate">{t.name}</span>
                            </div>
                            <span className="font-semibold text-[#11770e] bg-[#eaf8ea] px-2 py-0.5 rounded-md text-[11px] shrink-0">
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
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Aprobación y Gestión de Solicitudes de Tutoría
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Revise, apruebe espacios físicos o virtuales y supervise el ciclo de vida de cada tutoría solicitada.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 bg-stone-100 px-3 py-1.5 rounded-xl">
                {filteredTutorings.length} solicitudes
              </span>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pendientes</span>
              <div className="text-2xl font-black text-amber-600">
                {dashTutoringsFiltered.filter((t) => t.status === TutoringStatus.PENDING).length}
              </div>
              <div className="text-[11px] text-slate-400">Por asignar espacio</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Programadas</span>
              <div className="text-2xl font-black text-emerald-600">
                {dashTutoringsFiltered.filter((t) => t.status === TutoringStatus.APPROVED).length}
              </div>
              <div className="text-[11px] text-slate-400">Con aula / enlace</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">En Proceso</span>
              <div className="text-2xl font-black text-blue-600">
                {dashTutoringsFiltered.filter((t) => t.status === TutoringStatus.IN_PROGRESS).length}
              </div>
              <div className="text-[11px] text-slate-400">Sesión activa</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Finalizadas</span>
              <div className="text-2xl font-black text-[#11770e]">
                {dashTutoringsFiltered.filter((t) => t.status === TutoringStatus.COMPLETED).length}
              </div>
              <div className="text-[11px] text-[#11770e] font-semibold">Completadas con éxito</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Canceladas</span>
              <div className="text-2xl font-black text-rose-600">
                {dashTutoringsFiltered.filter((t) => t.status === TutoringStatus.CANCELLED).length}
              </div>
              <div className="text-[11px] text-slate-400">Rechazadas o anuladas</div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden space-y-4">
            <div className="p-4 bg-stone-50/70 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    id="search-admin-tutorings"
                    type="text"
                    value={tutoringSearch}
                    onChange={(e) => setTutoringSearch(e.target.value)}
                    placeholder="Buscar por código, alumno, materia..."
                    className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 w-60 focus:ring-2 focus:ring-[#11770e] bg-white text-slate-900"
                  />
                </div>

                <select
                  id="select-filter-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs rounded-xl border border-stone-300 py-1.5 px-3 bg-white font-semibold text-slate-700 focus:ring-2 focus:ring-[#11770e]"
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

              <div className="flex items-center gap-1.5 bg-stone-200/70 p-1 rounded-xl text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setDisplayMode('list')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    displayMode === 'list'
                      ? 'bg-white text-[#11770e] shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Lista
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('calendar')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    displayMode === 'calendar'
                      ? 'bg-white text-[#11770e] shadow-2xs font-bold'
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
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-stone-200 text-[11px]">
                    <tr>
                      <th className="px-4 py-3.5">Código</th>
                      <th className="px-4 py-3.5">Solicitante</th>
                      <th className="px-4 py-3.5">Materia y Asunto</th>
                      <th className="px-4 py-3.5">Docente</th>
                      <th className="px-4 py-3.5">Fecha y Hora</th>
                      <th className="px-4 py-3.5">Espacio Asignado</th>
                      <th className="px-4 py-3.5 text-center">Estado</th>
                      <th className="px-4 py-3.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTutorings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                          No se encontraron solicitudes con los filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredTutorings.map((tut) => (
                        <tr key={tut.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 font-mono font-bold">
                            <span className="bg-stone-100 text-slate-800 border border-stone-200 px-2 py-0.5 rounded-md text-[11px]">
                              {tut.code}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900">{tut.petitionerStudentName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{tut.petitionerAccount}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-800">{tut.subject}</div>
                            <div className="text-[11px] text-slate-500">{tut.subjectCourseName}</div>
                            {tut.attachmentUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingAttachment({
                                    fileName: tut.attachmentName || 'Archivo adjunto',
                                    fileUrl: tut.attachmentUrl!
                                  })
                                }
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#11770e] hover:text-[#0d5c0b] hover:underline bg-[#eaf8ea] border border-[#bce6bc] px-2 py-0.5 rounded-md cursor-pointer transition-colors"
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
                          <td className="px-4 py-3.5 text-slate-700 font-medium">{tut.teacherName}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {(() => {
                              const dt = formatTutoringDateTime(tut.reservDate, tut.scheduleLabel, tut.reservTime);
                              return (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                    <Calendar className="w-3.5 h-3.5 text-[#11770e] shrink-0" />
                                    <span>{dt.formattedDate}</span>
                                  </div>
                                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#11770e] bg-[#eaf8ea] border border-[#bce6bc] px-2 py-0.5 rounded-md w-fit">
                                    <Clock className="w-3 h-3 text-[#11770e] shrink-0" />
                                    <span>{dt.timeDisplay}</span>
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 max-w-[150px] truncate" title={tut.block ? `${tut.space} (Bloque ${tut.block})` : tut.space}>{tut.space}{tut.block ? ` — Bl. ${tut.block}` : ''}</td>
                          <td className="px-4 py-3.5 text-center">
                            <StatusBadge status={tut.status} size="sm" />
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                id={`btn-view-detail-${tut.id}`}
                                onClick={() => setSelectedDetailTutoring(tut)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                title="Ver detalle de la solicitud"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Detalle
                              </button>
                              {tut.status === TutoringStatus.PENDING && (
                                <>
                                  <button
                                    id={`btn-open-approve-${tut.id}`}
                                    onClick={() => {
                                      setApprovingTutoring(tut);
                                      setAssignedSpace(
                                        tut.modality === TutoringModality.PRESENCIAL
                                          ? tut.space && tut.space !== 'Pendiente aula' ? tut.space : ''
                                          : 'https://meet.google.com/gt-tutoria-live'
                                      );
                                      setAssignedBlock(tut.block || '');
                                    }}
                                    className="px-2.5 py-1 bg-[#11770e] hover:bg-[#0d5c0b] text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                    title="Aprobar y asignar aula o enlace"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Aprobar
                                  </button>

                                  <button
                                    id={`btn-open-cancel-${tut.id}`}
                                    onClick={() => setCancellingTutoring(tut)}
                                    className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-stone-200 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
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
                                  className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-stone-200 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
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
            )}
          </div>
        </div>
      )}

      {/* TAB 3: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Gestión de Estudiantes y Usuarios
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Administración de cuentas estudiantiles, docentes y administradores registrados en la plataforma.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-admin-add-user"
                onClick={onOpenRegister}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#11770e] hover:bg-[#0d5c0b] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Nuevo Estudiante</span>
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Usuarios
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">{users.length}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Cuentas institucionales</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Estudiantes Activos
              </span>
              <div className="text-2xl font-black text-[#11770e] mt-1">
                {users.filter((u) => u.role === UserRole.STUDENT && u.isActive).length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Habilitados para solicitar tutorías</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Docentes y Personal
              </span>
              <div className="text-2xl font-black text-slate-700 mt-1">
                {users.filter((u) => u.role === UserRole.TEACHER || u.role === UserRole.ADMIN).length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Tutores y coordinadores</div>
            </div>
          </div>

          {deleteUserSuccess && (
            <div className="p-3.5 bg-[#eaf8ea] border border-[#bce6bc] rounded-xl flex items-center gap-2.5 text-xs text-[#0d5c0b] animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-[#11770e] shrink-0" />
              <span className="font-semibold">{deleteUserSuccess}</span>
            </div>
          )}

          {/* Users Table Card */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden space-y-4">
            <div className="p-4 bg-stone-50/70 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    id="search-admin-users"
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Buscar por nombre o carnet..."
                    className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 w-60 focus:ring-2 focus:ring-[#11770e] bg-white text-slate-900"
                  />
                </div>

                <select
                  id="select-filter-user-role"
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="text-xs rounded-xl border border-stone-300 py-1.5 px-3 bg-white font-semibold text-slate-700 focus:ring-2 focus:ring-[#11770e]"
                >
                  <option value="all">Todos los Roles</option>
                  <option value={UserRole.STUDENT}>Estudiantes</option>
                  <option value={UserRole.TEACHER}>Docentes</option>
                  <option value={UserRole.ADMIN}>Administradores</option>
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

              <span className="text-xs text-slate-500 font-medium">
                Mostrando {filteredUsers.length} usuarios
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-stone-200 text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">Nombre Completo</th>
                    <th className="px-4 py-3.5">Usuario</th>
                    <th className="px-4 py-3.5">Rol</th>
                    <th className="px-4 py-3.5">Carnet / Código</th>
                    <th className="px-4 py-3.5">Carrera / Semestre</th>
                    <th className="px-4 py-3.5">Correo</th>
                    <th className="px-4 py-3.5 text-center">Estado</th>
                    <th className="px-4 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                        No se encontraron usuarios con los criterios de búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar user={u} size="sm" className="border border-[#bce6bc]/40 shadow-2xs shrink-0" />
                            <span className="font-bold text-slate-900">{u.fullName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 font-mono">@{u.username}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === UserRole.STUDENT
                                ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                : u.role === UserRole.TEACHER
                                ? 'bg-[#eaf8ea] text-[#11770e] border border-[#bce6bc]'
                                : 'bg-purple-50 text-purple-800 border border-purple-200'
                            }`}
                          >
                            {u.role === UserRole.STUDENT
                              ? 'Estudiante'
                              : u.role === UserRole.TEACHER
                              ? 'Docente'
                              : 'Administrador'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-700 font-bold">{u.account}</td>
                        <td className="px-4 py-3.5">
                          {u.careerId ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-700 truncate max-w-[150px]">
                                {careers.find((c) => c.id === u.careerId)?.name || u.careerId}
                              </span>
                              {u.role === UserRole.STUDENT && u.semester ? (
                                <span className="bg-[#eaf8ea] text-[#11770e] border border-[#bce6bc] rounded-md px-1.5 py-0.5 text-[10px] font-bold">
                                  S{u.semester}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{u.email}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.isActive
                                ? 'bg-[#eaf8ea] text-[#11770e] border border-[#bce6bc]'
                                : 'bg-stone-100 text-stone-500 border border-stone-200'
                            }`}
                          >
                            {u.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {u.id !== currentUser.id && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                id={`btn-toggle-user-${u.id}`}
                                onClick={() => handleToggleUserActive(u.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                  u.isActive
                                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                    : 'bg-[#eaf8ea] text-[#11770e] border-[#bce6bc] hover:bg-[#bce6bc]/40'
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
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-stone-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
                                title={
                                  u.role === UserRole.STUDENT
                                    ? 'Eliminar estudiante definitivamente'
                                    : 'Eliminar usuario'
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>Eliminar</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BINNACLE */}
      {activeTab === 'binnacle' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Bitácora de Auditoría y Seguridad
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Trazabilidad y registro inmutable de transacciones académicas y administrativas.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-stone-100 px-3 py-1.5 rounded-xl">
              {binnacle.length} eventos registrados
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-stone-200 text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">Fecha y Hora</th>
                    <th className="px-4 py-3.5">Tipo de Evento</th>
                    <th className="px-4 py-3.5">Descripción de la Acción</th>
                    <th className="px-4 py-3.5">Usuario Responsable</th>
                    <th className="px-4 py-3.5">Dirección IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {binnacle.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                        No hay eventos registrados en la bitácora.
                      </td>
                    </tr>
                  ) : (
                    binnacle.map((b) => {
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
                        <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-medium text-slate-800">
                              <Calendar className="w-3.5 h-3.5 text-[#11770e]" />
                              <span>{formattedDate || 'Fecha sin registrar'}</span>
                            </div>
                            {hourStr && (
                              <div className="flex items-center gap-1 text-[10px] text-stone-500 font-mono mt-0.5 pl-5">
                                <Clock className="w-3 h-3 text-stone-400" />
                                <span>{hourStr}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#eaf8ea] text-[#11770e] border border-[#bce6bc]/70">
                              {eventType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-800 font-medium leading-relaxed">
                            {b.description}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              @{b.username}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            {b.ipAddress || '127.0.0.1'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: INSTITUTION SETTINGS */}
      {activeTab === 'institution' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Configuración Institucional FET
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Parámetros oficiales del centro educativo reflejados en actas, constancias y notificaciones.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 max-w-3xl">
            {instSavedMsg && (
              <div className="mb-4 p-3.5 bg-[#eaf8ea] border border-[#bce6bc] text-[#0d5c0b] rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in">
                <Check className="w-4 h-4 text-[#11770e] shrink-0" />
                <span className="font-semibold">Información institucional guardada exitosamente.</span>
              </div>
            )}

            <form onSubmit={handleSaveInstitution} className="space-y-5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Institucional *
                </label>
                <input
                  type="text"
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  required
                  className="w-full text-xs rounded-xl border border-stone-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-[#11770e]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Misión Institucional
                  </label>
                  <textarea
                    rows={4}
                    value={instMission}
                    onChange={(e) => setInstMission(e.target.value)}
                    className="w-full text-xs rounded-xl border border-stone-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-[#11770e]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Visión Institucional
                  </label>
                  <textarea
                    rows={4}
                    value={instVision}
                    onChange={(e) => setInstVision(e.target.value)}
                    className="w-full text-xs rounded-xl border border-stone-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-[#11770e]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={instPhone}
                    onChange={(e) => setInstPhone(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-[#11770e]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={instEmail}
                    onChange={(e) => setInstEmail(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-[#11770e]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Dirección del Campus
                  </label>
                  <input
                    type="text"
                    value={instAddress}
                    onChange={(e) => setInstAddress(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-[#11770e]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  id="btn-save-institution"
                  type="submit"
                  className="px-5 py-2.5 bg-[#11770e] hover:bg-[#0d5c0b] text-white rounded-xl font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Guardar Cambios Institucionales
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>

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
                <div className="flex items-center gap-2 pt-1 text-slate-700">
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#11770e]" />
                    {formatTutoringDateTime(approvingTutoring.reservDate, approvingTutoring.scheduleLabel, approvingTutoring.reservTime).formattedDate}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-[#11770e] flex items-center gap-1 bg-[#eaf8ea] border border-[#bce6bc] px-2 py-0.5 rounded-md">
                    <Clock className="w-3 h-3" />
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
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      id="input-approve-block"
                      type="text"
                      value={assignedBlock}
                      onChange={(e) => setAssignedBlock(e.target.value)}
                      required
                      maxLength={50}
                      placeholder="Bloque o edificio"
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-emerald-500"
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
      className="rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] transition-all cursor-pointer shadow-2xs text-xs max-w-[200px] truncate"
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
      className="rounded-xl border border-stone-200 bg-white px-2 py-1.5 text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] transition-all cursor-pointer shadow-2xs text-xs w-auto max-w-[135px] disabled:opacity-50 disabled:bg-stone-50 disabled:cursor-not-allowed"
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
