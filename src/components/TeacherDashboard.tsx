import React, { useState, Fragment } from 'react';
import {
  ScheduleSlot,
  Section,
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
import {
  Play,
  Square,
  Calendar,
  Clock,
  Users,
  Star,
  Award,
  BookOpen,
  Check,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Plus,
  Trash2,
  Filter,
  Sparkles,
  CheckCircle2,
  Video,
  MapPin,
  X,
  Ban,
  Paperclip,
  FileText,
  GraduationCap,
  List,
  Search,
  ExternalLink,
  History
} from 'lucide-react';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import { TutoringCalendarView } from './TutoringCalendarView';
import { TutoringDetailModal } from './TutoringDetailModal';
import { UserAvatar } from './UserAvatar';
import { db } from '../core/infrastructure/database/database';

interface TeacherDashboardProps {
  currentUser: User;
  tutorings: Tutoring[];
  availabilities: TeacherAvailability[];
  schedules: ScheduleSlot[];
  subjects?: SubjectCourse[];
  sections?: Section[];
  onRefresh: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentUser,
  tutorings,
  availabilities,
  schedules,
  subjects = [],
  sections = [],
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<
    'tutorings' | 'availability' | 'subjects' | 'evaluations'
  >('tutorings');

  const [selectedTutoringId, setSelectedTutoringId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'list' | 'calendar'>('list');
  const [selectedDetailTutoring, setSelectedDetailTutoring] = useState<Tutoring | null>(null);
  const [tutoringSearch, setTutoringSearch] = useState<string>('');
  const [tutoringStatusFilter, setTutoringStatusFilter] = useState<string>('all');
  const [viewingAttachment, setViewingAttachment] = useState<{ fileName: string; fileUrl: string } | null>(null);

  // Approval state for teachers
  const [approvingTutoring, setApprovingTutoring] = useState<Tutoring | null>(null);
  const [assignedSpace, setAssignedSpace] = useState<string>('');
  const [assignedBlock, setAssignedBlock] = useState<string>('');
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approvalSuccess, setApprovalSuccess] = useState<string | null>(null);

  const openApproveModal = (tut: Tutoring) => {
    setApprovingTutoring(tut);
    setApprovalError(null);
    if (tut.modality === TutoringModality.PRESENCIAL) {
      setAssignedSpace(tut.space && tut.space !== 'Pendiente aula' ? tut.space : '');
      setAssignedBlock(tut.block || '');
    } else {
      setAssignedSpace('https://meet.google.com/docente-tutoria');
      setAssignedBlock('');
    }
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingTutoring) return;
    setApproving(true);
    setApprovalError(null);

    const res = await ApiClient.approveTutoring(approvingTutoring.id, assignedSpace, currentUser, assignedBlock);
    setApproving(false);

    if (res.success) {
      setApprovingTutoring(null);
      setApprovalSuccess(`¡Tutoría ${approvingTutoring.code} aprobada con éxito!`);
      setTimeout(() => setApprovalSuccess(null), 4000);
      onRefresh();
    } else {
      setApprovalError(res.error?.message || 'Error al aprobar la tutoría.');
    }
  };

  // Cancel/reject state for teachers
  const [cancellingTutoring, setCancellingTutoring] = useState<Tutoring | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  const openCancelModal = (tut: Tutoring) => {
    setCancellingTutoring(tut);
    setCancelReason('');
    setCancelError(null);
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingTutoring) return;
    setCancelError(null);
    setCancelling(true);

    const res = await ApiClient.cancelTutoring(
      cancellingTutoring.id,
      cancelReason.trim(),
      currentUser
    );
    setCancelling(false);

    if (res.success) {
      setCancellingTutoring(null);
      setCancelSuccess(`Tutoría ${cancellingTutoring.code} rechazada.`);
      setTimeout(() => setCancelSuccess(null), 4000);
      onRefresh();
    } else {
      setCancelError(res.error?.message || 'Error al rechazar la tutoría.');
    }
  };

  // Filter items for current teacher
  const myTutorings = tutorings.filter(
    (t) =>
      t.teacherId === currentUser.id ||
      t.teacherName?.toLowerCase() === currentUser.fullName?.toLowerCase()
  );

  const myAvailabilities = availabilities.filter(
    (a) =>
      a.teacherId === currentUser.id ||
      a.teacherName?.toLowerCase() === currentUser.fullName?.toLowerCase()
  );

  // Active tutoring in detail/execution modal
  const activeTutoring = selectedTutoringId
    ? tutorings.find((t) => t.id === selectedTutoringId) || myTutorings.find((t) => t.id === selectedTutoringId) || null
    : null;

  // Attendance state
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [teacherComment, setTeacherComment] = useState('');
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  React.useEffect(() => {
    if (activeTutoring) {
      const initialMap: Record<string, boolean> = {};
      (activeTutoring.assistants || []).forEach((a) => {
        initialMap[a.id] = a.hasAttended;
      });
      setAttendanceMap(initialMap);
      setTeacherComment(activeTutoring.teacherComment || '');
      setActionError(null);
    }
  }, [activeTutoring?.id]);

  const handleStart = async (tutoringId: string) => {
    setActionError(null);
    const res = await ApiClient.startTutoring(tutoringId, currentUser);
    if (res.success) {
      onRefresh();
    } else {
      setActionError(res.error?.message || 'Error al iniciar tutoría');
    }
  };

  const handleFinish = async (tutoringId: string) => {
    setActionError(null);
    try {
      const records = Object.entries(attendanceMap).map(([astId, hasAttended]) => ({
        assistantId: astId,
        hasAttended: Boolean(hasAttended)
      }));
      await ApiClient.recordAssistance(tutoringId, records, currentUser);
      const res = await ApiClient.finishTutoring(tutoringId, currentUser, teacherComment);
      if (res.success) {
        onRefresh();
      } else {
        setActionError(res.error?.message || 'Error al finalizar tutoría');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error al finalizar tutoría');
    }
  };

  const handleSaveAttendance = async () => {
    if (!activeTutoring) return;
    setSavingAttendance(true);
    setActionError(null);
    try {
      const records = Object.entries(attendanceMap).map(([astId, hasAttended]) => ({
        assistantId: astId,
        hasAttended: Boolean(hasAttended)
      }));
      const res = await ApiClient.recordAssistance(activeTutoring.id, records, currentUser);
      if (res.success) {
        onRefresh();
      } else {
        setActionError(res.error?.message || 'Error al guardar asistencia');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error al guardar asistencia');
    } finally {
      setSavingAttendance(false);
    }
  };

  // Availability Management State
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState<string>('');
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [addingSlot, setAddingSlot] = useState(false);
  const [availabilityFilterSubject, setAvailabilityFilterSubject] = useState<string>('all');
  const [addSlotSemesterFilter, setAddSlotSemesterFilter] = useState<string>('all');
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);
  const [availabilitySuccessMsg, setAvailabilitySuccessMsg] = useState<string | null>(null);
  const [availabilityErrorMsg, setAvailabilityErrorMsg] = useState<string | null>(null);

  // Teacher Subject Catalog State
  const [teacherCatalog, setTeacherCatalog] = useState<SubjectCourse[]>([]);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [catalogMsg, setCatalogMsg] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogSemesterFilter, setCatalogSemesterFilter] = useState<string>('all');

  const subjectsInCareer = currentUser.careerId
    ? subjects.filter((s) => s.careerId === currentUser.careerId)
    : subjects;

  const allAvailableSubjects = subjectsInCareer.length > 0 ? subjectsInCareer : subjects;

  const catalogSemesters = Array.from(
    new Set(allAvailableSubjects.map((s) => s.semester).filter((sem): sem is number => Boolean(sem)))
  ).sort((a, b) => a - b);

  const subjectsInCareerFiltered =
    catalogSemesterFilter === 'all'
      ? allAvailableSubjects
      : allAvailableSubjects.filter((s) => String(s.semester) === catalogSemesterFilter);

  const addSlotFilteredSubjects =
    addSlotSemesterFilter === 'all'
      ? teacherCatalog
      : teacherCatalog.filter((s) => String(s.semester) === addSlotSemesterFilter);

  const teacherCatalogSemesters = Array.from<number>(
    new Set(teacherCatalog.map((s) => s.semester).filter((sem): sem is number => typeof sem === 'number'))
  ).sort((a: number, b: number) => a - b);

  const handleAddSlotSemesterChange = (semester: string) => {
    setAddSlotSemesterFilter(semester);
    const filtered =
      semester === 'all'
        ? teacherCatalog
        : teacherCatalog.filter((s) => String(s.semester) === semester);
    if (filtered.length > 0 && !filtered.some((s) => s.id === newSubjectId)) {
      setNewSubjectId(filtered[0].id);
    }
  };

  const loadTeacherSubjects = async () => {
    if (!currentUser.id) return;
    const res = await ApiClient.getTeacherSubjects(currentUser.id);
    if (res.success && res.data) {
      setTeacherCatalog(res.data);
    }
  };

  React.useEffect(() => {
    loadTeacherSubjects();
  }, [currentUser.id]);

  React.useEffect(() => {
    if (teacherCatalog.length > 0 && (!newSubjectId || !teacherCatalog.some(s => s.id === newSubjectId))) {
      setNewSubjectId(teacherCatalog[0].id);
    }
  }, [teacherCatalog]);

  const handleToggleCatalogSubject = async (subjectId: string) => {
    setSavingCatalog(true);
    setCatalogMsg(null);
    setCatalogError(null);

    try {
      const isAssigned = teacherCatalog.some((s) => s.id === subjectId);
      let nextSubjects: SubjectCourse[];

      if (isAssigned) {
        nextSubjects = teacherCatalog.filter((s) => s.id !== subjectId);
      } else {
        const toAdd = allAvailableSubjects.find((s) => s.id === subjectId);
        if (toAdd) {
          nextSubjects = [...teacherCatalog, toAdd];
        } else {
          nextSubjects = teacherCatalog;
        }
      }

      const res = await ApiClient.setTeacherSubjects(
        currentUser.id,
        nextSubjects.map((s) => s.id),
        currentUser
      );

      if (res.success) {
        setTeacherCatalog(nextSubjects);
        setCatalogMsg('Asignaturas actualizadas correctamente.');
        setTimeout(() => setCatalogMsg(null), 3000);
        onRefresh();
      } else {
        setCatalogError(res.error?.message || 'Error al guardar asignaturas.');
      }
    } catch (err: any) {
      setCatalogError(err.message || 'Error al actualizar asignaturas.');
    } finally {
      setSavingCatalog(false);
    }
  };

  const handleSaveAvailability = async () => {
    if (!newSubjectId || selectedSlotIds.length === 0) {
      setAvailabilityErrorMsg('Seleccione una asignatura y al menos una franja horaria.');
      return;
    }

    setAddingSlot(true);
    setAvailabilityErrorMsg(null);
    setAvailabilitySuccessMsg(null);

    try {
      const selectedSubject = teacherCatalog.find((s) => s.id === newSubjectId) || allAvailableSubjects.find((s) => s.id === newSubjectId);

      for (const slotId of selectedSlotIds) {
        const slot = schedules.find((s) => s.id === slotId);
        if (!slot) continue;

        const exists = myAvailabilities.some(
          (a) => a.subjectCourseId === newSubjectId && a.scheduleSlotId === slotId
        );
        if (exists) continue;

        await ApiClient.addTeacherAvailability(
          currentUser,
          newSubjectId,
          slot.id
        );
      }

      setAvailabilitySuccessMsg('¡Franjas horarias registradas exitosamente!');
      setTimeout(() => setAvailabilitySuccessMsg(null), 4000);
      setShowAddSlot(false);
      setSelectedSlotIds([]);
      onRefresh();
    } catch (err: any) {
      setAvailabilityErrorMsg(err.message || 'Error al registrar franjas.');
    } finally {
      setAddingSlot(false);
    }
  };

  const handleToggleSlot = async (avId: string) => {
    const slot = myAvailabilities.find((a) => a.id === avId);
    if (!slot) return;
    try {
      const res = await ApiClient.toggleTeacherAvailability(avId);
      if (res.success) {
        onRefresh();
      } else {
        setAvailabilityErrorMsg(res.error?.message || 'Error al actualizar estado.');
      }
    } catch (err: any) {
      setAvailabilityErrorMsg(err.message || 'Error al actualizar estado.');
    }
  };

  const handleDeleteSlot = async (avId: string) => {
    if (!confirm('¿Está seguro de eliminar esta franja de disponibilidad?')) return;
    setDeleteSlotId(avId);
    try {
      const res = await ApiClient.deleteTeacherAvailability(avId, currentUser);
      if (res.success) {
        setAvailabilitySuccessMsg('Franja eliminada correctamente.');
        setTimeout(() => setAvailabilitySuccessMsg(null), 3000);
        onRefresh();
      } else {
        setAvailabilityErrorMsg(res.error?.message || 'Error al eliminar franja.');
      }
    } catch (err: any) {
      setAvailabilityErrorMsg(err.message || 'Error al eliminar franja.');
    } finally {
      setDeleteSlotId(null);
    }
  };

  const formatTutoringDateTime = (
    dateStr?: string,
    scheduleLabel?: string,
    reservTime?: string
  ): { formattedDate: string; timeDisplay: string; dayName: string } => {
    const timeDisplay = reservTime || scheduleLabel || 'Horario por acordar';
    if (!dateStr) {
      return { formattedDate: 'Fecha pendiente', timeDisplay, dayName: '' };
    }

    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);

        if (!isNaN(d.getTime())) {
          const dayName = d.toLocaleDateString('es-CO', { weekday: 'short' });
          const monthName = d.toLocaleDateString('es-CO', { month: 'short' });
          const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
          const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

          return {
            formattedDate: `${capitalizedDay}, ${day} ${capitalizedMonth} ${year}`,
            timeDisplay,
            dayName: capitalizedDay
          };
        }
      }
    } catch {
      // Fallback
    }
    return { formattedDate: dateStr, timeDisplay, dayName: '' };
  };

  const ratedTutorings = myTutorings.filter((t) => t.score > 0);

  // Tutorías completadas (historial)
  const completedTutorings = myTutorings.filter((t) => t.status === TutoringStatus.COMPLETED);

  // Tutorías activas (excluyendo COMPLETED)
  const activeTutorings = myTutorings.filter((t) => t.status !== TutoringStatus.COMPLETED);

  // Filtered tutorings list in Tab Tutorings (Tutorías Asignadas - sin COMPLETED)
  const filteredMyTutorings = activeTutorings.filter((t) => {
    if (tutoringStatusFilter !== 'all' && t.status !== tutoringStatusFilter) return false;
    if (tutoringSearch.trim()) {
      const q = tutoringSearch.toLowerCase();
      const matchCode = t.code?.toLowerCase().includes(q);
      const matchSub = t.subject?.toLowerCase().includes(q);
      const matchCourse = t.subjectCourseName?.toLowerCase().includes(q);
      const matchPet = t.petitionerStudentName?.toLowerCase().includes(q);
      return matchCode || matchSub || matchCourse || matchPet;
    }
    return true;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start pb-12">
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-full lg:w-72 xl:w-80 shrink-0 bg-white rounded-2xl border border-stone-200/90 shadow-xs p-5 space-y-6">
        {/* Teacher Profile Card */}
        <div className="p-4 bg-gradient-to-b from-[#fffaed] to-[#fbf7ee] border border-stone-200/90 rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#11770e] text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
              {currentUser.fullName
                ? currentUser.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                : 'DC'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-slate-900 text-sm leading-snug">
                {currentUser.fullName}
              </div>
              <div className="text-[11px] text-stone-500 font-medium truncate mt-0.5">
                {currentUser.email}
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-stone-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Rol</span>
              <span className="font-bold text-stone-700 bg-white px-2.5 py-0.5 rounded-md border border-stone-200 shadow-2xs text-[11px] whitespace-nowrap">
                Docente Titular
              </span>
            </div>
            {currentUser.careerName && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider shrink-0 mt-0.5">
                  Programa
                </span>
                <span className="font-bold text-[#11770e] text-right text-xs leading-snug" title={currentUser.careerName}>
                  {currentUser.careerName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3">
            Módulos del Docente
          </div>
          <nav className="space-y-1.5">
            <button
              id="tab-teacher-tutorings"
              onClick={() => setActiveTab('tutorings')}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'tutorings'
                  ? 'bg-[#11770e] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-[#eaf8ea] hover:text-[#11770e]'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Tutorías Asignadas</span>
              </div>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'tutorings'
                    ? 'bg-white text-[#11770e]'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {activeTutorings.length}
              </span>
            </button>

            <button
              id="tab-teacher-history"
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#11770e] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-[#eaf8ea] hover:text-[#11770e]'
              }`}
            >
              <div className="flex items-center gap-3">
                <History className="w-4 h-4 shrink-0" />
                <span>Historial Tutorías</span>
              </div>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'history'
                    ? 'bg-white text-[#11770e]'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {completedTutorings.length}
              </span>
            </button>

            <button
              id="tab-teacher-availability"
              onClick={() => setActiveTab('availability')}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'availability'
                  ? 'bg-[#11770e] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-[#eaf8ea] hover:text-[#11770e]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Mi Disponibilidad</span>
              </div>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'availability'
                    ? 'bg-white text-[#11770e]'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {myAvailabilities.length}
              </span>
            </button>

            <button
              id="tab-teacher-subjects"
              onClick={() => setActiveTab('subjects')}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'subjects'
                  ? 'bg-[#11770e] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-[#eaf8ea] hover:text-[#11770e]'
              }`}
            >
              <div className="flex items-center gap-3">
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span>Mis Asignaturas</span>
              </div>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'subjects'
                    ? 'bg-white text-[#11770e]'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {teacherCatalog.length}
              </span>
            </button>

            <button
              id="tab-teacher-evaluations"
              onClick={() => setActiveTab('evaluations')}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'evaluations'
                  ? 'bg-[#11770e] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-[#eaf8ea] hover:text-[#11770e]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Award className="w-4 h-4 shrink-0" />
                <span>Evaluaciones</span>
              </div>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'evaluations'
                    ? 'bg-white text-[#11770e]'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {ratedTutorings.length}
              </span>
            </button>
          </nav>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 w-full min-w-0 space-y-6">
        {/* ONBOARDING NOTIFICATION IF NO AVAILABILITY */}
        {myAvailabilities.length === 0 && activeTab !== 'availability' && (
          <div className="p-5 rounded-2xl bg-[#fffaed] border border-amber-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#11770e] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Configure su disponibilidad horaria, Prof. {currentUser.fullName}
                </h3>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Para que los estudiantes puedan solicitarle asesorías, agregue sus franjas semanales disponibles en la pestaña de disponibilidad.
                </p>
              </div>
            </div>
            <button
              type="button"
              id="btn-onboarding-setup-availability"
              onClick={() => {
                setActiveTab('availability');
                setShowAddSlot(true);
              }}
              className="h-10 px-4 bg-[#11770e] hover:bg-[#0d5c0b] text-white text-xs font-bold rounded-xl shadow-xs shrink-0 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span>Configurar Horarios</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: TUTORINGS & RUNNER CONSOLE */}
        {activeTab === 'tutorings' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Toolbar: Search + Status Filter + View Mode */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Tutorías Asignadas
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Aprobación de solicitudes, ejecución en vivo y registro de asistencia.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search input */}
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar alumno, tema, código..."
                    value={tutoringSearch}
                    onChange={(e) => setTutoringSearch(e.target.value)}
                    className="h-10 pl-9 pr-3 text-xs rounded-xl border border-stone-200 bg-white text-slate-800 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] transition-all w-full sm:w-60"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={tutoringStatusFilter}
                  onChange={(e) => setTutoringStatusFilter(e.target.value)}
                  className="h-10 text-xs rounded-xl border border-stone-200 bg-white px-3.5 text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] transition-all cursor-pointer shadow-2xs"
                >
                  <option value="all">Todos los estados ({activeTutorings.length})</option>
                  <option value={TutoringStatus.PENDING}>Pendientes</option>
                  <option value={TutoringStatus.APPROVED}>Programadas</option>
                  <option value={TutoringStatus.IN_PROGRESS}>En Curso</option>
                  <option value={TutoringStatus.CANCELLED}>Rechazadas</option>
                </select>

                {/* Display Mode Switcher */}
                <div className="flex items-center h-10 bg-stone-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setDisplayMode('list')}
                    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg transition-all cursor-pointer ${
                      displayMode === 'list'
                        ? 'bg-white text-[#11770e] shadow-2xs font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Lista</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayMode('calendar')}
                    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg transition-all cursor-pointer ${
                      displayMode === 'calendar'
                        ? 'bg-white text-[#11770e] shadow-2xs font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Calendario</span>
                  </button>
                </div>
              </div>
            </div>

            {displayMode === 'calendar' ? (
              <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-xs">
                <TutoringCalendarView
                  tutorings={activeTutorings}
                  currentUser={currentUser}
                  onSelectTutoring={(tut) => setSelectedTutoringId(tut.id)}
                />
              </div>
            ) : (
              /* Full Width Tutorings Table */
              <div className="w-full bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#fafaf7] text-stone-600 font-bold uppercase tracking-wider border-b border-stone-200 text-[11px]">
                      <tr>
                        <th className="px-4 py-3.5 w-16 text-center">Código</th>
                        <th className="px-4 py-3.5 min-w-[160px]">Estudiante Solicitante</th>
                        <th className="px-4 py-3.5 min-w-[150px]">Fecha y Horario</th>
                        <th className="px-4 py-3.5 min-w-[180px]">Asignatura / Tema</th>
                        <th className="px-4 py-3.5 w-28 text-center">Estado</th>
                        <th className="px-4 py-3.5 w-28 text-right">Gestión</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredMyTutorings.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-16 text-stone-400">
                            <BookOpen className="w-10 h-10 text-stone-300 mx-auto mb-2.5" />
                            <p className="font-bold text-slate-700 text-sm">No hay tutorías registradas</p>
                            <p className="text-xs text-stone-500 mt-1">Ajuste los filtros de búsqueda o consulte más tarde.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredMyTutorings.map((tut) => {
                          const dt = formatTutoringDateTime(tut.reservDate, tut.scheduleLabel, tut.reservTime);
                          return (
                            <tr
                              key={tut.id}
                              className="transition-colors hover:bg-[#fafaf7] group"
                            >
                              {/* 1. Código */}
                              <td className="px-4 py-3.5 text-center align-middle">
                                <span className="inline-block font-mono font-black text-xs text-[#11770e] bg-[#eaf8ea] px-2 py-1 rounded-lg border border-[#bce6bc]/70 shadow-2xs">
                                  {tut.code}
                                </span>
                              </td>

                              {/* 2. Estudiante Solicitante */}
                              <td className="px-4 py-3.5 align-middle">
                                <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                  {tut.petitionerStudentName}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium mt-0.5">
                                  <Users className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                  <span>
                                    {(tut.assistants || []).length} {(tut.assistants || []).length === 1 ? 'estudiante' : 'estudiantes'}
                                  </span>
                                </div>
                              </td>

                              {/* 3. Fecha y Horario */}
                              <td className="px-4 py-3.5 align-middle">
                                <div className="font-bold text-slate-800 text-xs sm:text-sm">
                                  {dt.formattedDate}
                                </div>
                                <div className="mt-1">
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#eaf8ea] text-[#11770e] border border-[#bce6bc]/60">
                                    <Clock className="w-3 h-3 text-[#11770e] shrink-0" />
                                    <span>{dt.timeDisplay}</span>
                                  </span>
                                </div>
                              </td>

                              {/* 4. Asignatura / Tema */}
                              <td className="px-4 py-3.5 align-middle">
                                <div className="font-bold text-slate-900 text-xs sm:text-sm" title={tut.subject}>
                                  {tut.subject}
                                </div>
                                <div className="text-[11px] sm:text-xs text-stone-500 font-medium mt-0.5" title={tut.subjectCourseName}>
                                  {tut.subjectCourseName}
                                </div>
                              </td>

                              {/* 5. Estado */}
                              <td className="px-4 py-3.5 text-center align-middle">
                                <div className="inline-flex justify-center">
                                  <StatusBadge status={tut.status} size="sm" />
                                </div>
                              </td>

                              {/* 6. Detalle / Gestión */}
                              <td className="px-4 py-3.5 text-right align-middle">
                                <button
                                  type="button"
                                  onClick={() => setSelectedTutoringId(tut.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-[#eaf8ea] text-[#11770e] hover:bg-[#11770e] hover:text-white border border-[#bce6bc]/70 hover:border-[#11770e] transition-all shadow-2xs group-hover:shadow-xs cursor-pointer whitespace-nowrap"
                                >
                                  <span>Gestionar</span>
                                  <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MODAL: TUTORING DETAIL & EXECUTION CONSOLE */}
            {activeTutoring && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
                <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                  {/* Header */}
                  <div className="px-6 py-4.5 bg-gradient-to-r from-[#fffaed] to-[#fbf7ee] border-b border-stone-200 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[#11770e] text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                        {activeTutoring.code || 'TUT'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-slate-900 text-base">
                            Tutoría {activeTutoring.code}
                          </span>
                          <StatusBadge status={activeTutoring.status} size="sm" />
                        </div>
                        <p className="text-xs text-stone-600 font-semibold truncate mt-0.5">
                          {activeTutoring.subjectCourseName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Action Buttons */}
                      {activeTutoring.status === TutoringStatus.PENDING && (
                        <>
                          <button
                            type="button"
                            onClick={() => openApproveModal(activeTutoring)}
                            className="h-9 px-3.5 rounded-xl bg-[#11770e] hover:bg-[#0d5c0b] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Aprobar y asignar espacio"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Aprobar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openCancelModal(activeTutoring)}
                            className="h-9 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Rechazar solicitud"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Rechazar</span>
                          </button>
                        </>
                      )}

                      {activeTutoring.status === TutoringStatus.APPROVED && (
                        <button
                          type="button"
                          id={`btn-start-tutoring-${activeTutoring.id}`}
                          onClick={() => handleStart(activeTutoring.id)}
                          className="h-9 px-4 rounded-xl bg-[#11770e] hover:bg-[#0d5c0b] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Iniciar la tutoría"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Iniciar Tutoría</span>
                        </button>
                      )}

                      {activeTutoring.status === TutoringStatus.IN_PROGRESS && (
                        <button
                          type="button"
                          id={`btn-finish-tutoring-${activeTutoring.id}`}
                          onClick={() => handleFinish(activeTutoring.id)}
                          className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer animate-pulse"
                          title="Concluir la sesión"
                        >
                          <Square className="w-3.5 h-3.5 fill-white" />
                          <span>Finalizar Tutoría</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedTutoringId(null)}
                        className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer ml-1 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-6 py-5 space-y-5 text-xs overflow-y-auto flex-1">
                    {/* Card 1: Tema y Solicitante */}
                    <div className="p-4 bg-gradient-to-b from-[#fafaf7] to-[#f5f5f0] rounded-2xl border border-stone-200/90 space-y-3 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-stone-200/80">
                        <div>
                          <span className="text-[10px] uppercase font-black text-[#11770e] tracking-wider block">
                            Tema de Consulta / Asunto
                          </span>
                          <h4 className="font-bold text-slate-900 text-base mt-0.5">{activeTutoring.subject}</h4>
                          <span className="text-xs text-stone-600 font-semibold block mt-0.5">
                            {activeTutoring.subjectCourseName}
                          </span>
                        </div>
                        {(() => {
                          const petitionerUser = db.users.find(
                            (u) => u.id === activeTutoring.petitionerStudentId || u.fullName === activeTutoring.petitionerStudentName
                          );
                          return (
                            <div className="flex items-center gap-3 shrink-0 bg-white px-3.5 py-2 rounded-xl border border-stone-200/90 shadow-2xs">
                              <UserAvatar
                                user={petitionerUser}
                                name={activeTutoring.petitionerStudentName}
                                photoUrl={petitionerUser?.photoUrl}
                                role={UserRole.STUDENT}
                                size="md"
                                className="border border-[#bce6bc]/60 shadow-2xs"
                              />
                              <div className="text-left">
                                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                                  Estudiante Solicitante
                                </span>
                                <span className="font-bold text-slate-900 text-xs block mt-0.5">
                                  {activeTutoring.petitionerStudentName}
                                </span>
                                {petitionerUser?.careerName && (
                                  <span className="text-[10px] text-stone-500 block truncate">
                                    {petitionerUser.careerName}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {activeTutoring.details && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block mb-1">
                            Descripción y Dudas Planteadas
                          </span>
                          <p className="text-slate-700 leading-relaxed bg-white p-3.5 rounded-xl border border-stone-200 text-xs">
                            {activeTutoring.details}
                          </p>
                        </div>
                      )}

                      {/* Grid de Información Clave */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="bg-white p-3 rounded-xl border border-stone-200 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#eaf8ea] text-[#11770e] flex items-center justify-center shrink-0">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">Fecha</span>
                            <span className="font-bold text-slate-800 text-xs">
                              {formatTutoringDateTime(activeTutoring.reservDate, activeTutoring.scheduleLabel, activeTutoring.reservTime).formattedDate}
                            </span>
                          </div>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-stone-200 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#eaf8ea] text-[#11770e] flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">Horario</span>
                            <span className="font-bold text-slate-800 text-xs">
                              {activeTutoring.reservTime || activeTutoring.scheduleLabel || 'Por acordar'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-stone-200 flex items-center gap-3 sm:col-span-2">
                          <div className="w-8 h-8 rounded-lg bg-[#eaf8ea] text-[#11770e] flex items-center justify-center shrink-0">
                            {activeTutoring.modality === TutoringModality.PRESENCIAL ? (
                              <MapPin className="w-4 h-4 text-[#11770e]" />
                            ) : (
                              <Video className="w-4 h-4 text-indigo-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">
                              Modalidad y Espacio
                            </span>
                            <div className="font-bold text-slate-800 text-xs truncate">
                              {activeTutoring.modality === TutoringModality.PRESENCIAL ? (
                                <span>Presencial • {activeTutoring.space || 'Aula / Laboratorio institucional'}</span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5">
                                  <span>Virtual • </span>
                                  {activeTutoring.space && activeTutoring.space.startsWith('http') ? (
                                    <a
                                      href={activeTutoring.space}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[#11770e] font-bold underline inline-flex items-center gap-1"
                                    >
                                      <span>Abrir Google Meet</span>
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  ) : (
                                    activeTutoring.space || 'Enlace pendiente'
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {(activeTutoring.startTime || activeTutoring.finishTime) && (
                        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-stone-200 text-xs">
                          {activeTutoring.startTime && (
                            <span className="text-[#11770e] font-bold flex items-center gap-1.5">
                              <Play className="w-3 h-3 fill-[#11770e]" />
                              <span>Inicio: {activeTutoring.startTime}</span>
                            </span>
                          )}
                          {activeTutoring.finishTime && (
                            <span className="text-slate-700 font-bold flex items-center gap-1.5">
                              <Square className="w-3 h-3 fill-slate-700" />
                              <span>Cierre: {activeTutoring.finishTime}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card 2: Documento Adjunto */}
                    {activeTutoring.attachmentName && (
                      <div className="p-4 bg-[#eaf8ea]/80 border border-[#bce6bc] rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-xl bg-[#11770e]/15 text-[#11770e] flex items-center justify-center shrink-0 font-bold">
                            <Paperclip className="w-5 h-5" />
                          </div>
                          <div className="truncate">
                            <span className="text-[10px] text-[#11770e] uppercase font-black block">Material de Apoyo Adjunto</span>
                            <span className="text-xs font-bold text-slate-900 truncate block">
                              {activeTutoring.attachmentName}
                            </span>
                          </div>
                        </div>
                        {activeTutoring.attachmentUrl && (
                          <button
                            type="button"
                            onClick={() => setViewingAttachment({
                              fileName: activeTutoring.attachmentName || 'Documento Adjunto',
                              fileUrl: activeTutoring.attachmentUrl!
                            })}
                            className="h-9 px-4 bg-[#11770e] hover:bg-[#0d5c0b] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Ver Archivo</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Card 3: Control de Asistencia */}
                    <div className="p-4 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#11770e]" />
                          <span className="font-bold text-slate-900 text-sm">
                            Control de Asistencia
                          </span>
                          <span className="text-[11px] font-bold bg-stone-100 text-stone-600 px-2.5 py-0.5 rounded-full">
                            {(activeTutoring.assistants || []).length}
                          </span>
                        </div>
                        {(activeTutoring.status === TutoringStatus.IN_PROGRESS ||
                          activeTutoring.status === TutoringStatus.COMPLETED) && (
                          <button
                            type="button"
                            id="btn-save-assistance"
                            onClick={handleSaveAttendance}
                            disabled={savingAttendance}
                            className="h-8 px-3.5 text-xs font-bold rounded-xl bg-[#11770e] text-white hover:bg-[#0d5c0b] shadow-2xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{savingAttendance ? 'Guardando...' : 'Guardar Asistencia'}</span>
                          </button>
                        )}
                      </div>

                      <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden bg-stone-50/40">
                        {(activeTutoring.assistants || []).map((ast) => {
                          const astUser = db.users.find(
                            (u) => u.id === ast.studentId || u.account === ast.studentAccount || u.fullName === ast.studentName
                          );
                          return (
                            <div
                              key={ast.id}
                              className="p-3.5 flex items-center justify-between hover:bg-white transition-colors gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <UserAvatar
                                  user={astUser}
                                  name={ast.studentName}
                                  photoUrl={astUser?.photoUrl}
                                  role={UserRole.STUDENT}
                                  size="sm"
                                  className="border border-[#bce6bc]/50 shadow-2xs shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                    <span className="truncate">{ast.studentName}</span>
                                    {ast.isPetitioner && (
                                      <span className="text-[10px] text-[#11770e] bg-[#eaf8ea] px-2 py-0.5 rounded-full font-bold border border-[#bce6bc]/60 shrink-0">
                                        Solicitante
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-stone-500 font-mono mt-0.5 truncate">
                                    Código: {ast.studentAccount} • Cel: {ast.studentPhone || 'No reg.'}
                                  </div>
                                </div>
                              </div>

                            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-stone-200 hover:border-[#11770e]/50 transition-colors shadow-2xs">
                              <input
                                type="checkbox"
                                checked={!!attendanceMap[ast.id]}
                                onChange={(e) =>
                                  setAttendanceMap({ ...attendanceMap, [ast.id]: e.target.checked })
                                }
                                disabled={
                                  activeTutoring.status !== TutoringStatus.IN_PROGRESS &&
                                  activeTutoring.status !== TutoringStatus.COMPLETED
                                }
                                className="rounded border-slate-300 text-[#11770e] focus:ring-[#11770e] w-4 h-4 cursor-pointer"
                              />
                              <span className={`text-[11px] font-bold ${
                                attendanceMap[ast.id] ? 'text-[#11770e]' : 'text-slate-400'
                              }`}>
                                {attendanceMap[ast.id] ? 'Presente' : 'Ausente'}
                              </span>
                            </label>
                          </div>
                        );
                      })}
                      </div>
                    </div>

                    {/* Card 4: Observaciones del Docente */}
                    {activeTutoring.status === TutoringStatus.IN_PROGRESS && (
                      <div className="p-4 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-2">
                        <label className="block font-bold text-slate-800 text-xs">
                          Observaciones Académicas sobre la Sesión:
                        </label>
                        <textarea
                          rows={3}
                          value={teacherComment}
                          onChange={(e) => setTeacherComment(e.target.value)}
                          placeholder="Temas reforzados y observaciones"
                          className="w-full rounded-xl border border-stone-200 p-3 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] transition-all"
                        />
                      </div>
                    )}

                    {/* Card 5: Evaluación del Estudiante */}
                    {activeTutoring.status === TutoringStatus.COMPLETED && activeTutoring.score > 0 && (
                      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between text-amber-950 font-bold">
                          <span>Calificación y Retroalimentación:</span>
                          <span className="flex items-center gap-1.5 text-amber-900 bg-white px-3 py-1 rounded-lg border border-amber-200 text-xs font-bold shadow-2xs">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                            {activeTutoring.score} / 5
                          </span>
                        </div>
                        {activeTutoring.studentComment && (
                          <p className="text-slate-700 italic text-xs bg-white/90 p-3 rounded-xl border border-amber-100 leading-relaxed">
                            "{activeTutoring.studentComment}"
                          </p>
                        )}
                      </div>
                    )}

                    {actionError && (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 font-semibold">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{actionError}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 bg-[#fafaf7] border-t border-stone-200 flex items-center justify-between shrink-0">
                    <div className="text-[11px] text-stone-500 font-mono">
                      ID: {activeTutoring.id}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTutoringId(null)}
                      className="h-9 px-5 text-xs font-bold rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 cursor-pointer shadow-2xs"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB HISTORY: HISTORIAL TUTORÍAS */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Historial de Tutorías Finalizadas
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Consulte el registro de tutorías concluidas, evaluaciones y observaciones académicas.
                  </p>
                </div>
                <span className="text-xs font-bold bg-amber-50 text-amber-700 px-3 py-1 rounded-xl border border-amber-200/60 w-fit">
                  {completedTutorings.length} finalizadas
                </span>
              </div>

              {completedTutorings.length === 0 ? (
                <div className="text-center py-16 text-stone-400">
                  <History className="w-10 h-10 text-stone-300 mx-auto mb-2.5" />
                  <p className="font-bold text-slate-700 text-sm">No hay tutorías finalizadas aún</p>
                  <p className="text-xs text-stone-500 mt-1">Las tutorías completadas aparecerán aquí automáticamente al finalizarlas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedTutorings
                    .sort((a, b) => new Date(b.reservDate).getTime() - new Date(a.reservDate).getTime())
                    .map((tut) => {
                      const dt = formatTutoringDateTime(tut.reservDate, tut.scheduleLabel, tut.reservTime);
                      return (
                        <div
                          key={tut.id}
                          className="p-5 rounded-2xl border border-stone-200 bg-white hover:border-stone-300 hover:shadow-xs transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono font-bold text-[10px] text-[#11770e] bg-[#eaf8ea] px-2 py-0.5 rounded-md border border-[#bce6bc]/60 mr-2">
                                {tut.code}
                              </span>
                              <span className="font-bold text-slate-900 text-sm">{tut.subject}</span>
                              <div className="text-xs text-stone-600 font-semibold mt-0.5">
                                {tut.subjectCourseName}
                              </div>
                            </div>
                            <StatusBadge status={tut.status} size="sm" />
                          </div>

                          <div className="pt-2 border-t border-stone-100 text-xs text-stone-600 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-[#11770e] shrink-0" />
                              <span><strong>Fecha:</strong> {dt.formattedDate}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-[#11770e] shrink-0" />
                              <span><strong>Horario:</strong> {dt.timeDisplay}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                              <span><strong>Solicitante:</strong> {tut.petitionerStudentName} ({(tut.assistants || []).length} participantes)</span>
                            </div>
                            {tut.teacherComment && (
                              <div className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                <span><strong>Observaciones:</strong> {tut.teacherComment}</span>
                              </div>
                            )}
                            {tut.score > 0 && (
                              <div className="flex items-center gap-2">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                                <span><strong>Calificación:</strong> {tut.score} / 5 {tut.studentComment ? `— "${tut.studentComment}"` : ''}</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setSelectedDetailTutoring(tut)}
                              className="h-9 px-4 rounded-xl bg-[#11770e] hover:bg-[#0d5c0b] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Ver Detalle</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: AVAILABILITY MANAGEMENT */}
        {activeTab === 'availability' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Notifications */}
            {availabilitySuccessMsg && (
              <div className="p-4 bg-[#eaf8ea] border border-[#bce6bc] text-[#11770e] rounded-2xl text-xs flex items-center gap-2 font-bold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-[#11770e] shrink-0" />
                <span>{availabilitySuccessMsg}</span>
              </div>
            )}
            {availabilityErrorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2 font-bold animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{availabilityErrorMsg}</span>
              </div>
            )}

            {/* Main Availability Card */}
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-5 sm:p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Mi Disponibilidad Horaria
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Defina los bloques en los que los estudiantes podrán agendar tutorías académicas con usted.
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-open-add-slot"
                  onClick={() => {
                    setShowAddSlot(!showAddSlot);
                    if (allAvailableSubjects.length > 0) {
                      const isValid = allAvailableSubjects.some((s) => s.id === newSubjectId);
                      if (!isValid) setNewSubjectId(allAvailableSubjects[0].id);
                    }
                    if (schedules.length > 0 && selectedSlotIds.length === 0) {
                      setSelectedSlotIds([schedules[0].id]);
                    }
                  }}
                  className="h-10 px-4 rounded-xl bg-[#11770e] hover:bg-[#0d5c0b] text-white text-xs font-bold shadow-xs cursor-pointer transition-colors shrink-0 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddSlot ? 'Cerrar Formulario' : '+ Configurar Nuevos Horarios'}</span>
                </button>
              </div>

              {/* FORM TO ADD AVAILABILITY */}
              {showAddSlot && (
                <div className="p-6 bg-[#fafaf7] border border-[#bce6bc] rounded-2xl space-y-5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#11770e] uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#11770e]" />
                      Asignar Materia y Franjas Horarias
                    </h3>
                    <span className="text-xs text-stone-600 font-bold bg-white px-2.5 py-1 rounded-md border border-stone-200">
                      {selectedSlotIds.length} franja{selectedSlotIds.length === 1 ? '' : 's'} seleccionada{selectedSlotIds.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2">
                        <label htmlFor="select-add-subject" className="block text-xs font-bold text-slate-800">
                          1. Seleccionar Asignatura a Impartir (de Mis Asignaturas):
                        </label>
                        
                        {/* Compact Semester Dropdown Filter for Teacher Catalog */}
                        {teacherCatalog.length > 0 && teacherCatalogSemesters.length > 1 && (
                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <label htmlFor="select-add-slot-semester" className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
                              <Filter className="w-3.5 h-3.5 text-[#11770e]" />
                              <span>Semestre:</span>
                            </label>
                            <select
                              id="select-add-slot-semester"
                              value={addSlotSemesterFilter}
                              onChange={(e) => handleAddSlotSemesterChange(e.target.value)}
                              className="h-8 text-xs font-semibold rounded-xl border border-stone-200 bg-white px-3 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] transition-all cursor-pointer shadow-2xs"
                            >
                              <option value="all">Todas mis materias ({teacherCatalog.length})</option>
                              {teacherCatalogSemesters.map((sem) => {
                                const count = teacherCatalog.filter((s) => s.semester === sem).length;
                                return (
                                  <option key={sem} value={String(sem)}>
                                    Semestre {sem} ({count} {count === 1 ? 'materia' : 'materias'})
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        )}
                      </div>

                      {teacherCatalog.length === 0 ? (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                          <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Aún no ha asignado materias en su perfil</span>
                          </div>
                          <p className="text-xs text-amber-800 leading-relaxed">
                            Para poder registrar disponibilidad horaria, primero seleccione en la pestaña <strong>"Mis Asignaturas"</strong> las materias que usted imparte.
                          </p>
                          <button
                            type="button"
                            onClick={() => setActiveTab('subjects')}
                            className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#11770e] hover:bg-[#0d5c0b] text-white rounded-lg font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                          >
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>Ir a Mis Asignaturas</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <select
                            id="select-add-subject"
                            value={newSubjectId}
                            onChange={(e) => setNewSubjectId(e.target.value)}
                            className="w-full text-xs rounded-xl border border-stone-200 bg-white p-3 text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] cursor-pointer"
                          >
                            {addSlotFilteredSubjects.length === 0 ? (
                              <option value="" disabled>
                                No hay materias asignadas en el semestre seleccionado
                              </option>
                            ) : (
                              addSlotFilteredSubjects.map((sub) => (
                                <option key={sub.id} value={sub.id}>
                                  {sub.name} {sub.semester ? `(Semestre ${sub.semester})` : ''} {sub.code ? `— ${sub.code}` : ''}
                                </option>
                              ))
                            )}
                          </select>

                          <div className="text-[11px] text-stone-500 mt-1.5 flex items-center justify-between">
                            <span>
                              Mostrando <strong>{addSlotFilteredSubjects.length}</strong> de <strong>{teacherCatalog.length}</strong> materias asignadas {addSlotSemesterFilter !== 'all' ? `del Semestre ${addSlotSemesterFilter}` : ''}.
                            </span>
                            {newSubjectId && (
                              <span className="text-[#11770e] font-bold">
                                Seleccionada: {teacherCatalog.find((s) => s.id === newSubjectId)?.name}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold text-slate-800">
                          2. Franjas Horarias Semanales Disponibles:
                        </label>
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setSelectedSlotIds(schedules.map((s) => s.id))}
                            className="text-[#11770e] hover:underline font-bold cursor-pointer"
                          >
                            Seleccionar todas
                          </button>
                          <span className="text-stone-300">•</span>
                          <button
                            type="button"
                            onClick={() => setSelectedSlotIds([])}
                            className="text-stone-500 hover:underline font-semibold cursor-pointer"
                          >
                            Limpiar
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {schedules.map((slot) => {
                          const isSelected = selectedSlotIds.includes(slot.id);
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => {
                                setSelectedSlotIds((prev) =>
                                  isSelected ? prev.filter((id) => id !== slot.id) : [...prev, slot.id]
                                );
                              }}
                              className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-left ${
                                isSelected
                                  ? 'bg-[#11770e] border-[#11770e] text-white shadow-xs'
                                  : 'bg-white border-stone-200 text-slate-700 hover:bg-[#eaf8ea]'
                              }`}
                            >
                              <Clock className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-[#11770e]'}`} />
                              <span className="truncate">{slot.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddSlot(false);
                        setSelectedSlotIds([]);
                      }}
                      className="h-10 px-4 rounded-xl border border-stone-200 bg-white text-stone-700 text-xs font-bold hover:bg-stone-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      id="btn-confirm-add-slot"
                      disabled={addingSlot || selectedSlotIds.length === 0}
                      onClick={handleSaveAvailability}
                      className="h-10 px-5 rounded-xl bg-[#11770e] text-white text-xs font-bold hover:bg-[#0d5c0b] shadow-xs cursor-pointer disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      {addingSlot ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Guardar {selectedSlotIds.length} Franja{selectedSlotIds.length === 1 ? '' : 's'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Filter and Availabilities List */}
              <div className="space-y-4">
                {myAvailabilities.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fafaf7] p-3.5 rounded-xl border border-stone-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Filter className="w-4 h-4 text-[#11770e]" />
                      <span>Filtrar por Asignatura:</span>
                    </div>
                    <select
                      value={availabilityFilterSubject}
                      onChange={(e) => setAvailabilityFilterSubject(e.target.value)}
                      className="text-xs rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] cursor-pointer"
                    >
                      <option value="all">Todas las materias ({myAvailabilities.length} franjas)</option>
                      {Array.from(new Set(myAvailabilities.map((a) => a.subjectCourseId))).map((subId) => {
                        const av = myAvailabilities.find((a) => a.subjectCourseId === subId);
                        return (
                          <option key={subId} value={subId}>
                            {av?.subjectCourseName}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {(() => {
                  const filteredAvailabilities =
                    availabilityFilterSubject === 'all'
                      ? myAvailabilities
                      : myAvailabilities.filter((a) => a.subjectCourseId === availabilityFilterSubject);

                  if (filteredAvailabilities.length === 0 && !showAddSlot) {
                    return (
                      <div className="p-12 text-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/50 space-y-2">
                        <Clock className="w-9 h-9 text-stone-300 mx-auto" />
                        <h4 className="font-bold text-slate-800 text-sm">
                          {myAvailabilities.length === 0
                            ? 'Aún no tiene horarios configurados'
                            : 'No hay franjas registradas para la materia seleccionada'}
                        </h4>
                        <p className="text-xs text-stone-500 max-w-md mx-auto">
                          Haga clic en "+ Configurar Nuevos Horarios" para definir sus bloques semanales de tutoría.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredAvailabilities.map((av) => (
                        <div
                          key={av.id}
                          className="p-4 sm:p-5 rounded-2xl border border-stone-200/90 bg-white hover:border-[#11770e]/50 hover:shadow-xs flex flex-col justify-between gap-4 transition-all"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-bold text-slate-900 text-sm leading-snug">
                                {av.subjectCourseName}
                              </div>
                              {(() => {
                                const avSubject = subjects.find((s) => s.id === av.subjectCourseId);
                                return avSubject?.semester ? (
                                  <span className="font-mono text-[10px] font-bold text-[#11770e] bg-[#eaf8ea] px-2 py-0.5 rounded border border-[#bce6bc]/50 shrink-0">
                                    Sem. {avSubject.semester}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                            <div className="text-xs text-slate-700 font-semibold bg-[#fafaf7] px-3 py-1.5 rounded-lg border border-stone-200/70 inline-flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#11770e] shrink-0" />
                              <span>{av.scheduleLabel}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-100">
                            <button
                              id={`btn-toggle-availability-${av.id}`}
                              onClick={() => handleToggleSlot(av.id)}
                              className={`h-9 flex items-center gap-2 px-3.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                av.isAvailable
                                  ? 'bg-[#eaf8ea] text-[#11770e] border border-[#bce6bc] hover:bg-[#dcfce4]'
                                  : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                              }`}
                              title={av.isAvailable ? 'Pausar franja' : 'Activar franja'}
                            >
                              {av.isAvailable ? (
                                <>
                                  <ToggleRight className="w-4 h-4 text-[#11770e]" />
                                  <span>Disponible</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-4 h-4 text-stone-400" />
                                  <span>Pausado</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={deleteSlotId === av.id}
                              onClick={() => handleDeleteSlot(av.id)}
                              className="h-9 w-9 rounded-xl border border-stone-200 hover:border-rose-300 hover:bg-rose-50 text-stone-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                              title="Eliminar franja horaria"
                            >
                              {deleteSlotId === av.id ? (
                                <div className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SUBJECTS CATALOG */}
        {activeTab === 'subjects' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#eaf8ea] text-[#11770e] flex items-center justify-center border border-[#bce6bc]/60 shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      Mis Asignaturas Impartidas
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Programa: <span className="font-bold text-slate-800">{currentUser.careerName || 'Sin asignar'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <select
                    id="select-catalog-semester-filter"
                    value={catalogSemesterFilter}
                    onChange={(e) => setCatalogSemesterFilter(e.target.value)}
                    aria-label="Filtrar asignaturas por semestre"
                    className="h-10 text-xs rounded-xl border border-stone-200 bg-white px-3.5 text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] cursor-pointer"
                  >
                    <option value="all">Todos los semestres</option>
                    {catalogSemesters.map((sem) => (
                      <option key={sem} value={String(sem)}>Semestre {sem}</option>
                    ))}
                  </select>
                  <span className="h-10 px-4 flex items-center text-xs font-bold bg-[#eaf8ea] text-[#11770e] border border-[#bce6bc] rounded-xl">
                    {teacherCatalog.length} de {subjectsInCareer.length} asignadas
                  </span>
                </div>
              </div>

              {catalogMsg && (
                <div className="p-4 bg-[#eaf8ea] border border-[#bce6bc] text-[#11770e] rounded-2xl text-xs flex items-center gap-2 font-bold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-[#11770e] shrink-0" />
                  <span>{catalogMsg}</span>
                </div>
              )}
              {catalogError && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2 font-bold animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{catalogError}</span>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                Marque las asignaturas que usted imparte. Los estudiantes únicamente podrán agendar asesorías en las asignaturas habilitadas en su perfil.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 p-4 bg-[#fafaf7] rounded-2xl border border-stone-200/80">
                {subjectsInCareer.length === 0 ? (
                  <div className="col-span-full p-10 text-center text-xs text-slate-400">
                    No hay asignaturas registradas para su carrera académica.
                  </div>
                ) : subjectsInCareerFiltered.length === 0 ? (
                  <div className="col-span-full p-10 text-center text-xs text-slate-400">
                    No hay asignaturas en el semestre seleccionado.
                  </div>
                ) : (
                  subjectsInCareerFiltered.map((sub) => {
                    const isAssigned = teacherCatalog.some((s) => s.id === sub.id);
                    return (
                      <label
                        key={sub.id}
                        className={`flex items-start gap-3 p-4 rounded-xl text-xs cursor-pointer transition-all border ${
                          isAssigned
                            ? 'bg-[#eaf8ea] border-[#bce6bc] text-[#0d5c0b] font-bold shadow-xs'
                            : 'bg-white border-stone-200 text-slate-700 hover:bg-stone-50 hover:border-stone-300'
                        } ${savingCatalog ? 'opacity-60 pointer-events-none' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={() => handleToggleCatalogSubject(sub.id)}
                          className="rounded border-slate-300 text-[#11770e] focus:ring-[#11770e] w-4 h-4 mt-0.5 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-mono text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded shrink-0">
                              {sub.code || 'S/C'}
                            </span>
                            {sub.semester && (
                              <span className="font-mono text-[10px] font-bold text-[#11770e] bg-white px-1.5 py-0.5 rounded border border-[#bce6bc]/60 shrink-0">
                                S{sub.semester}
                              </span>
                            )}
                          </div>
                          <span className="block font-bold text-xs sm:text-sm leading-snug">{sub.name}</span>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: EVALUATIONS & REVIEWS */}
        {activeTab === 'evaluations' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Evaluaciones y Reseñas
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Comentarios y retroalimentación dejados por los estudiantes al concluir cada sesión.
                  </p>
                </div>
                <span className="h-9 px-4 flex items-center text-xs font-bold text-[#11770e] bg-[#eaf8ea] border border-[#bce6bc] rounded-xl self-start sm:self-auto">
                  {ratedTutorings.length} {ratedTutorings.length === 1 ? 'comentario' : 'comentarios'}
                </span>
              </div>

              {ratedTutorings.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs space-y-2">
                  <Award className="w-10 h-10 text-stone-300 mx-auto mb-1" />
                  <p className="font-bold text-slate-700 text-sm">Aún no ha recibido evaluaciones</p>
                  <p className="text-stone-500">Las valoraciones de los estudiantes aparecerán aquí cuando finalicen sus tutorías.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {ratedTutorings.map((tut) => {
                    const studentUser = db.users.find(
                      (u) => u.id === tut.petitionerStudentId || u.fullName === tut.petitionerStudentName
                    );
                    return (
                      <div key={tut.id} className="p-5 rounded-2xl border border-stone-200/90 bg-[#fafaf7] space-y-3 hover:bg-white transition-all text-xs shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              user={studentUser}
                              name={tut.petitionerStudentName}
                              photoUrl={studentUser?.photoUrl}
                              role={UserRole.STUDENT}
                              size="md"
                              className="border border-[#bce6bc]/50 shadow-2xs"
                            />
                            <div>
                              <span className="font-bold text-slate-900 text-sm block leading-tight">{tut.petitionerStudentName}</span>
                              <span className="text-stone-500 font-semibold text-[11px] block mt-0.5">{tut.subjectCourseName}</span>
                            </div>
                          </div>
                          <span className="self-start sm:self-auto flex items-center gap-1.5 font-bold text-amber-900 bg-[#fffaed] px-3 py-1 rounded-lg border border-amber-200">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                            <span>
                              {tut.score} de 5 estrellas
                              {(tut.ratings || []).length > 1 ? ` (${(tut.ratings || []).length} participantes)` : ''}
                            </span>
                          </span>
                        </div>
                      {((tut.ratings && tut.ratings.length > 0
                        ? tut.ratings
                        : tut.studentComment
                          ? [{ studentName: tut.petitionerStudentName, score: tut.score, studentComment: tut.studentComment }]
                          : []
                      ) as any[]).map((r: any, i: number) => (
                        <div key={i} className="bg-white p-3.5 rounded-xl border border-stone-200/70 shadow-2xs">
                          <span className="font-bold text-slate-900 text-xs block">{r.studentName} — {r.score}★</span>
                          {r.studentComment && (
                            <p className="text-slate-700 italic leading-relaxed mt-1">
                              "{r.studentComment}"
                            </p>
                          )}
                        </div>
                      ))}
                      <div className="text-[11px] text-stone-400 font-mono flex items-center gap-2 pt-1">
                        <span>Código: {tut.code}</span>
                        <span>•</span>
                        <span>Fecha: {tut.reservDate}</span>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SUCCESS TOASTS */}
      {approvalSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#11770e] text-white px-5 py-3.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5" />
          <span>{approvalSuccess}</span>
        </div>
      )}

      {cancelSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-rose-600 text-white px-5 py-3.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-bottom-4">
          <Ban className="w-5 h-5" />
          <span>{cancelSuccess}</span>
        </div>
      )}

      {/* MODAL: APPROVE TUTORING */}
      {approvingTutoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-[#fffaed] to-[#fbf7ee] border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#11770e]/15 text-[#11770e] flex items-center justify-center font-bold text-xs">
                  <Check className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Aprobar Tutoría {approvingTutoring.code}
                </h3>
              </div>
              <button
                onClick={() => setApprovingTutoring(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApprove} className="p-6 space-y-4 text-xs">
              <div className="bg-[#fafaf7] p-4 rounded-xl border border-stone-200 space-y-1.5">
                <div className="font-bold text-slate-900 text-sm">{approvingTutoring.subject}</div>
                <div className="text-stone-600">
                  Estudiante: <strong>{approvingTutoring.petitionerStudentName}</strong>
                </div>
                <div className="text-stone-500 text-[11px] pt-1.5 border-t border-stone-200/70 flex items-center gap-3">
                  <span>📅 {approvingTutoring.reservDate}</span>
                  <span>⏰ {approvingTutoring.reservTime || approvingTutoring.scheduleLabel}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1.5">
                  {approvingTutoring.modality === TutoringModality.PRESENCIAL
                    ? 'Salón y Bloque Asignados'
                    : 'Enlace de Reunión Virtual (Google Meet / Teams)'}
                </label>
                {approvingTutoring.modality === TutoringModality.PRESENCIAL ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={assignedSpace}
                      onChange={(e) => setAssignedSpace(e.target.value)}
                      required
                      maxLength={200}
                      placeholder="Salón o aula"
                      className="w-full rounded-xl border border-stone-200 p-3 text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] transition-all"
                    />
                    <input
                      type="text"
                      value={assignedBlock}
                      onChange={(e) => setAssignedBlock(e.target.value)}
                      required
                      maxLength={50}
                      placeholder="Bloque o edificio"
                      className="w-full rounded-xl border border-stone-200 p-3 text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] transition-all"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={assignedSpace}
                    onChange={(e) => setAssignedSpace(e.target.value)}
                    required
                    placeholder="Enlace de videollamada"
                    className="w-full rounded-xl border border-stone-200 p-3 text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] transition-all"
                  />
                )}
              </div>

              {approvalError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{approvalError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovingTutoring(null)}
                  className="h-10 px-4 text-stone-700 bg-white border border-stone-200 rounded-xl font-bold hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={approving}
                  className="h-10 px-5 bg-[#11770e] hover:bg-[#0d5c0b] text-white rounded-xl font-bold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {approving ? 'Aprobando...' : 'Confirmar Aprobación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CANCEL / REJECT TUTORING */}
      {cancellingTutoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                  <Ban className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-rose-950 text-sm">
                  Rechazar Solicitud {cancellingTutoring.code}
                </h3>
              </div>
              <button
                onClick={() => setCancellingTutoring(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCancel} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">{cancellingTutoring.subject}</div>
                <div className="text-slate-600">
                  Estudiante: {cancellingTutoring.petitionerStudentName}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1.5">
                  Motivo de Rechazo (Obligatorio)
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                  minLength={5}
                  placeholder="Motivo del rechazo"
                  className="w-full rounded-xl border border-stone-200 p-3 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all"
                />
              </div>

              {cancelError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{cancelError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingTutoring(null)}
                  className="h-10 px-4 text-stone-700 bg-white border border-stone-200 rounded-xl font-bold hover:bg-stone-50 cursor-pointer"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="h-10 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {cancelling ? 'Rechazando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ATTACHMENT VIEWER MODAL */}
      {viewingAttachment && (
        <AttachmentViewerModal
          fileName={viewingAttachment.fileName}
          fileUrl={viewingAttachment.fileUrl}
          onClose={() => setViewingAttachment(null)}
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
