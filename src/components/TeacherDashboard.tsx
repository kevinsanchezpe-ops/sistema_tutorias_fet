import React, { useState } from 'react';
import {
  ScheduleSlot,
  Section,
  SubjectCourse,
  TeacherAvailability,
  Tutoring,
  TutoringModality,
  TutoringStatus,
  User
} from '../core/types';
import { ApiClient } from '../core/presentation/api-client';
import { StatusBadge } from './StatusBadge';
import {
  Play,
  Square,
  CheckSquare,
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
  MessageSquare,
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
  List
} from 'lucide-react';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import { TutoringCalendarView } from './TutoringCalendarView';

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
  const [activeTab, setActiveTab] = useState<'tutorings' | 'availability' | 'evaluations'>('tutorings');
  const [selectedTutoringId, setSelectedTutoringId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'list' | 'calendar'>('list');
  const [viewingAttachment, setViewingAttachment] = useState<{ fileName: string; fileUrl: string } | null>(null);

  // Approval state for teachers
  const [approvingTutoring, setApprovingTutoring] = useState<Tutoring | null>(null);
  const [assignedSpace, setAssignedSpace] = useState<string>('');
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approvalSuccess, setApprovalSuccess] = useState<string | null>(null);

  const openApproveModal = (tut: Tutoring) => {
    setApprovingTutoring(tut);
    setApprovalError(null);
    if (tut.modality === TutoringModality.PRESENCIAL) {
      setAssignedSpace(sections[0]?.name || 'Laboratorio 1');
    } else {
      setAssignedSpace('https://meet.google.com/docente-tutoria');
    }
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingTutoring) return;
    setApproving(true);
    setApprovalError(null);

    const res = await ApiClient.approveTutoring(approvingTutoring.id, assignedSpace, currentUser);
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

    const res = await ApiClient.cancelTutoring(cancellingTutoring.id, cancelReason, currentUser);
    setCancelling(false);

    if (res.success) {
      setCancellingTutoring(null);
      setCancelReason('');
      setCancelSuccess(`Solicitud ${cancellingTutoring.code} rechazada correctamente.`);
      setTimeout(() => setCancelSuccess(null), 4000);
      onRefresh();
    } else {
      setCancelError(res.error?.message || 'Error al rechazar la tutoría.');
    }
  };

  // Catálogo de asignaturas del docente + las de su carrera
  const [teacherCatalog, setTeacherCatalog] = useState<SubjectCourse[]>([]);
  const [catalogMsg, setCatalogMsg] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [savingCatalog, setSavingCatalog] = useState(false);

  React.useEffect(() => {
    (async () => {
      const res = await ApiClient.getTeacherSubjects(currentUser.id);
      if (res.success && res.data) {
        setTeacherCatalog(res.data);
      }
    })();
  }, [currentUser.id]);

  const subjectsInCareer = subjects.filter((s) => s.careerId === currentUser.careerId);

  // Asignaturas del docente (catálogo propio; fallback a su carrera)
  const teacherCareerSubjects =
    teacherCatalog.length > 0 ? teacherCatalog : subjectsInCareer;

  // Filtro por semestre en "Mi Carrera y Asignaturas"
  const [catalogSemesterFilter, setCatalogSemesterFilter] = useState<string>('all');

  const catalogSemesters = Array.from(
    new Set(subjectsInCareer.map((s) => s.semester).filter((x): x is number => !!x))
  ).sort((a, b) => a - b);

  const subjectsInCareerFiltered =
    catalogSemesterFilter === 'all'
      ? subjectsInCareer
      : subjectsInCareer.filter((s) => Number(s.semester) === Number(catalogSemesterFilter));

  const handleToggleCatalogSubject = async (subId: string) => {
    if (savingCatalog) return;
    const isAssigned = teacherCatalog.some((s) => s.id === subId);
    const nextIds = isAssigned
      ? teacherCatalog.filter((s) => s.id !== subId).map((s) => s.id)
      : [...teacherCatalog.map((s) => s.id), subId];
    setSavingCatalog(true);
    setCatalogError(null);
    const res = await ApiClient.setTeacherSubjects(currentUser.id, nextIds, currentUser);
    setSavingCatalog(false);
    if (res.success && res.data) {
      setTeacherCatalog(res.data);
      setCatalogMsg(isAssigned ? 'Materia retirada de sus asignaciones.' : 'Materia asignada correctamente.');
      setTimeout(() => setCatalogMsg(null), 3000);
    } else {
      setCatalogError(res.error?.message || 'Error al actualizar sus materias.');
    }
  };

  // New slot form state
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState(() => teacherCareerSubjects[0]?.id || '');
  const [newSlotId, setNewSlotId] = useState(schedules[0]?.id || '');
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [availabilityFilterSubject, setAvailabilityFilterSubject] = useState<string>('all');
  const [addingSlot, setAddingSlot] = useState(false);
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);
  const [availabilitySuccessMsg, setAvailabilitySuccessMsg] = useState<string | null>(null);
  const [availabilityErrorMsg, setAvailabilityErrorMsg] = useState<string | null>(null);

  // Sync newSubjectId if empty and subjects become available
  React.useEffect(() => {
    if (!newSubjectId && teacherCareerSubjects.length > 0) {
      setNewSubjectId(teacherCareerSubjects[0].id);
    }
  }, [teacherCareerSubjects.length, newSubjectId]);

  // Attendance local state: Map of assistantId -> boolean
  const [attendanceMap, setAttendanceMap] = useState<{ [assistantId: string]: boolean }>({});
  const [teacherComment, setTeacherComment] = useState<string>('');
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter tutorings assigned to this teacher
  const myTutorings = tutorings.filter((t) => t.teacherId === currentUser.id);
  const myAvailabilities = availabilities.filter((a) => a.teacherId === currentUser.id);

  // Selected tutoring object
  const activeTutoring = myTutorings.find((t) => t.id === selectedTutoringId) || myTutorings[0] || null;

  // Initialize attendance when active tutoring changes
  React.useEffect(() => {
    if (activeTutoring) {
      const initial: { [id: string]: boolean } = {};
      activeTutoring.assistants.forEach((a) => {
        initial[a.id] = a.hasAttended;
      });
      setAttendanceMap(initial);
      setTeacherComment(activeTutoring.teacherComment || '');
    }
  }, [activeTutoring?.id]);

  // Handler: Start Tutoring (Status: APPROVED -> IN_PROGRESS)
  const handleStart = async (tutoringId: string) => {
    setActionError(null);
    const res = await ApiClient.startTutoring(tutoringId, currentUser);
    if (res.success) {
      onRefresh();
    } else {
      setActionError(res.error?.message || 'Error al iniciar la tutoría.');
    }
  };

  // Handler: Finish Tutoring (Status: IN_PROGRESS -> COMPLETED)
  const handleFinish = async (tutoringId: string) => {
    setActionError(null);
    const res = await ApiClient.finishTutoring(tutoringId, currentUser, teacherComment);
    if (res.success) {
      onRefresh();
    } else {
      setActionError(res.error?.message || 'Error al finalizar la tutoría.');
    }
  };

  // Handler: Save Attendance
  const handleSaveAttendance = async () => {
    if (!activeTutoring) return;
    setSavingAttendance(true);
    setActionError(null);

    const records = activeTutoring.assistants.map((a) => ({
      assistantId: a.id,
      hasAttended: !!attendanceMap[a.id]
    }));

    const res = await ApiClient.recordAssistance(activeTutoring.id, records, currentUser);
    setSavingAttendance(false);

    if (res.success) {
      onRefresh();
    } else {
      setActionError(res.error?.message || 'Error al guardar la asistencia.');
    }
  };

  // Toggle availability slot
  const handleToggleSlot = async (id: string) => {
    await ApiClient.toggleTeacherAvailability(id);
    onRefresh();
  };

  // Delete availability slot
  const handleDeleteSlot = async (id: string) => {
    setDeleteSlotId(id);
    const res = await ApiClient.deleteTeacherAvailability(id, currentUser);
    setDeleteSlotId(null);
    if (res.success) {
      setAvailabilitySuccessMsg('Franja horaria eliminada.');
      setTimeout(() => setAvailabilitySuccessMsg(null), 3000);
      onRefresh();
    } else {
      setAvailabilityErrorMsg(res.error?.message || 'Error al eliminar la franja.');
    }
  };

  // Save multiple availability slots for a subject
  const handleSaveAvailability = async () => {
    if (!newSubjectId) {
      setAvailabilityErrorMsg('Debe seleccionar una asignatura.');
      return;
    }
    const slotsToSave = selectedSlotIds.length > 0 ? selectedSlotIds : (newSlotId ? [newSlotId] : []);
    if (slotsToSave.length === 0) {
      setAvailabilityErrorMsg('Debe seleccionar al menos una franja horaria.');
      return;
    }
    setAddingSlot(true);
    setAvailabilityErrorMsg(null);
    const res = await ApiClient.setTeacherAvailabilityBatch(currentUser, newSubjectId, slotsToSave);
    setAddingSlot(false);
    if (res.success) {
      setAvailabilitySuccessMsg(`¡${slotsToSave.length} franja(s) de disponibilidad configurada(s) exitosamente!`);
      setSelectedSlotIds([]);
      setShowAddSlot(false);
      setTimeout(() => setAvailabilitySuccessMsg(null), 3500);
      onRefresh();
    } else {
      setAvailabilityErrorMsg(res.error?.message || 'Error al guardar disponibilidad.');
    }
  };

  // Calculations for evaluations tab
  const ratedTutorings = myTutorings.filter((t) => t.score > 0);
  const avgRating =
    ratedTutorings.length > 0
      ? (ratedTutorings.reduce((acc, t) => acc + t.score, 0) / ratedTutorings.length).toFixed(1)
      : '5.0';

  // Availability filtered list
  const filteredAvailabilities =
    availabilityFilterSubject === 'all'
      ? myAvailabilities
      : myAvailabilities.filter((a) => a.subjectCourseId === availabilityFilterSubject);

  return (
    <>
      <div className="space-y-6">
      {/* Onboarding Alert for Teacher with No Availability */}
      {myAvailabilities.length === 0 && activeTab !== 'availability' && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#eaf8ea] via-[#fffaed] to-[#eaf8ea] border border-[#bce6bc] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#11770e] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Sparkles className="w-5 h-5 text-[#fffaed]" />
            </div>
            <div>
              <h3 className="font-bold text-[#2b2b2b] text-sm">
                ¡Bienvenido a su Panel Docente, {currentUser.fullName}!
              </h3>
              <p className="text-xs text-stone-600 mt-0.5 max-w-2xl leading-relaxed">
                Su cuenta está lista. Ahora puede <strong>seleccionar las materias que imparte</strong> y definir sus <strong>franjas horarias de disponibilidad</strong> para que los estudiantes puedan solicitar tutorías con usted.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-onboarding-setup-availability"
            onClick={() => {
              setActiveTab('availability');
              setShowAddSlot(true);
              if (teacherCareerSubjects.length > 0 && !newSubjectId) setNewSubjectId(teacherCareerSubjects[0].id);
              if (schedules.length > 0 && selectedSlotIds.length === 0) {
                setSelectedSlotIds([schedules[0].id]);
              }
            }}
            className="px-4 py-2.5 bg-[#11770e] hover:bg-[#0d5c0b] text-white text-xs font-semibold rounded-xl shadow-xs shrink-0 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <span>Configurar Mi Disponibilidad</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          id="tab-teacher-tutorings"
          onClick={() => setActiveTab('tutorings')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'tutorings'
              ? 'bg-[#11770e] text-white shadow-xs'
              : 'text-stone-600 hover:bg-[#eaf8ea] hover:text-[#11770e]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Tutorías Asignadas ({myTutorings.length})
        </button>

        <button
          id="tab-teacher-availability"
          onClick={() => setActiveTab('availability')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'availability'
              ? 'bg-[#11770e] text-white shadow-xs'
              : 'text-stone-600 hover:bg-[#eaf8ea] hover:text-[#11770e]'
          }`}
        >
          <Clock className="w-4 h-4" />
          Mi Disponibilidad Horaria ({myAvailabilities.length})
        </button>

        <button
          id="tab-teacher-evaluations"
          onClick={() => setActiveTab('evaluations')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'evaluations'
              ? 'bg-[#11770e] text-white shadow-xs'
              : 'text-stone-600 hover:bg-[#eaf8ea] hover:text-[#11770e]'
          }`}
        >
          <Award className="w-4 h-4" />
          Evaluaciones Recibidas (★ {avgRating})
        </button>
      </div>

      {/* TAB 1: TUTORINGS & IN-PROGRESS RUNNER */}
      {activeTab === 'tutorings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Tutorings Table (6 or 7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 text-sm">
                  Mis Tutorías Programadas y Asignadas
                </h3>
                <span className="text-xs text-slate-500">
                  {myTutorings.filter((t) => t.status === TutoringStatus.IN_PROGRESS).length} en ejecución
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Solicitante</th>
                      <th className="px-4 py-3">Fecha y Hora</th>
                      <th className="px-4 py-3">Materia y Asunto</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Detalles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myTutorings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400">
                          No tiene tutorías asignadas en este período.
                        </td>
                      </tr>
                    ) : (
                      myTutorings.map((tut) => {
                        const isSelected = activeTutoring?.id === tut.id;
                        return (
                          <tr
                            key={tut.id}
                            onClick={() => setSelectedTutoringId(tut.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#eaf8ea]/80 border-l-4 border-l-[#11770e]'
                                : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <td className="px-4 py-3 font-bold text-[#11770e]">{tut.code}</td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-800">{tut.petitionerStudentName}</div>
                              <div className="text-[11px] text-slate-400">{tut.assistants.length} participantes</div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              <div>{tut.reservDate}</div>
                              <div className="text-[11px] text-slate-400">{tut.scheduleLabel}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-800">{tut.subject}</div>
                              <div className="text-[11px] text-slate-500">{tut.subjectCourseName}</div>
                              {tut.attachmentUrl ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingAttachment({ fileName: tut.attachmentName || 'Documento Adjunto', fileUrl: tut.attachmentUrl! });
                                  }}
                                  className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#11770e] hover:text-[#0d5c0b] hover:underline font-medium bg-[#eaf8ea] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                  title="Visualizar archivo adjunto en segundo plano"
                                >
                                  <Paperclip className="w-2.5 h-2.5" />
                                  <span className="truncate max-w-[110px]">{tut.attachmentName || 'Ver adjunto'}</span>
                                </button>
                              ) : tut.attachmentName ? (
                                <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  <Paperclip className="w-2.5 h-2.5" />
                                  <span className="truncate max-w-[110px]">{tut.attachmentName}</span>
                                </span>
                              ) : null}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={tut.status} size="sm" />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="p-1 rounded-md text-slate-400 hover:text-[#11770e]">
                                <ChevronRight className="w-4 h-4 inline" />
                              </span>
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

          {/* Right: Selected Tutoring Control Panel (5 cols) */}
          <div className="lg:col-span-5">
            {activeTutoring ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
                {/* Header */}
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        Solicitud {activeTutoring.code}
                      </span>
                      <StatusBadge status={activeTutoring.status} size="sm" />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeTutoring.subjectCourseName}
                    </p>
                  </div>

                  {/* Actions: Approve/Reject (PENDING) or Start/Finish */}
                  <div className="flex items-center gap-2">
                    {activeTutoring.status === TutoringStatus.PENDING && (
                      <>
                        <button
                          onClick={() => openApproveModal(activeTutoring)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                          title="Aprobar y programar esta tutoría"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Aprobar
                        </button>
                        <button
                          onClick={() => openCancelModal(activeTutoring)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                          title="Rechazar esta solicitud de tutoría"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Rechazar
                        </button>
                      </>
                    )}

                    {activeTutoring.status === TutoringStatus.APPROVED && (
                      <button
                        id={`btn-start-tutoring-${activeTutoring.id}`}
                        onClick={() => handleStart(activeTutoring.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                        title="Iniciar la tutoría en tiempo real"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        Iniciar Tutoría
                      </button>
                    )}

                    {activeTutoring.status === TutoringStatus.IN_PROGRESS && (
                      <button
                        id={`btn-finish-tutoring-${activeTutoring.id}`}
                        onClick={() => handleFinish(activeTutoring.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors animate-pulse"
                        title="Concluir la sesión"
                      >
                        <Square className="w-3.5 h-3.5 fill-white" />
                        Finalizar Tutoría
                      </button>
                    )}
                  </div>
                </div>

                <div className="px-5 space-y-4 text-xs">
                  {/* Subject Details */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <div className="font-bold text-slate-800 text-sm">{activeTutoring.subject}</div>
                    <p className="text-slate-600 leading-relaxed">{activeTutoring.details}</p>
                    <div className="pt-2 text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span><strong>Fecha:</strong> {activeTutoring.reservDate}</span>
                      <span><strong>Horario:</strong> {activeTutoring.scheduleLabel}</span>
                      <span>
                        <strong>Espacio:</strong>{' '}
                        {activeTutoring.space.startsWith('http') ? (
                          <a
                            href={activeTutoring.space}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#11770e] font-semibold underline"
                          >
                            Abrir reunión virtual
                          </a>
                        ) : (
                          activeTutoring.space
                        )}
                      </span>
                    </div>

                    {activeTutoring.startTime && (
                      <div className="pt-1 text-[#11770e] font-medium">
                        Hora de inicio registrada: {activeTutoring.startTime}
                      </div>
                    )}
                    {activeTutoring.finishTime && (
                      <div className="text-slate-700 font-medium">
                        Hora de finalización registrada: {activeTutoring.finishTime}
                      </div>
                    )}
                  </div>

                  {/* Archivo Adjunto */}
                  {activeTutoring.attachmentName && (
                    <div className="p-3 bg-emerald-50/70 border border-[#bce6bc] rounded-lg flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#11770e] flex items-center justify-center shrink-0">
                          <Paperclip className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <span className="text-[10px] text-emerald-800 uppercase font-bold block">Documento Adjunto</span>
                          <span className="text-xs font-semibold text-slate-800 truncate block">
                            {activeTutoring.attachmentName}
                          </span>
                        </div>
                      </div>
                      {activeTutoring.attachmentUrl ? (
                        <button
                          type="button"
                          onClick={() => setViewingAttachment({ fileName: activeTutoring.attachmentName || 'Documento Adjunto', fileUrl: activeTutoring.attachmentUrl! })}
                          className="shrink-0 px-2.5 py-1 bg-[#11770e] hover:bg-[#0d5c0b] text-white rounded-md text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Visualizar</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic shrink-0">Sin vista previa</span>
                      )}
                    </div>
                  )}

                  {/* Registered Assistants / Attendance Checkbox Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-[#11770e]" />
                        Lista de Estudiantes y Asistencia ({activeTutoring.assistants.length})
                      </span>
                      {(activeTutoring.status === TutoringStatus.IN_PROGRESS ||
                        activeTutoring.status === TutoringStatus.COMPLETED) && (
                        <button
                          id="btn-save-assistance"
                          onClick={handleSaveAttendance}
                          disabled={savingAttendance}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-[#eaf8ea] text-[#11770e] hover:bg-[#dcfce4] border border-[#bce6bc] transition-colors cursor-pointer"
                        >
                          {savingAttendance ? 'Guardando...' : 'Guardar Asistencia'}
                        </button>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                      {activeTutoring.assistants.map((ast) => (
                        <div
                          key={ast.id}
                          className="p-3 flex items-center justify-between hover:bg-slate-50/50"
                        >
                          <div>
                            <div className="font-semibold text-slate-800">
                              {ast.studentName} {ast.isPetitioner && <span className="text-[10px] text-[#11770e] bg-[#eaf8ea] px-1.5 py-0.5 rounded-full font-bold ml-1 border border-[#bce6bc]/50">Solicitante</span>}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Cuenta: {ast.studentAccount} • Tel: {ast.studentPhone}
                            </div>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer">
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
                              className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                            />
                            <span className="text-[11px] font-medium text-slate-600">
                              {attendanceMap[ast.id] ? 'Presente' : 'Ausente'}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Teacher Comments / Observation input */}
                  {activeTutoring.status === TutoringStatus.IN_PROGRESS && (
                    <div className="space-y-1">
                      <label className="block font-semibold text-slate-700">
                        Observaciones del docente sobre la sesión
                      </label>
                      <textarea
                        rows={2}
                        value={teacherComment}
                        onChange={(e) => setTeacherComment(e.target.value)}
                        placeholder="Comentarios sobre el rendimiento o temas reforzados..."
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  {/* Student Feedback if completed */}
                  {activeTutoring.status === TutoringStatus.COMPLETED && activeTutoring.score > 0 && (
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-amber-900 font-bold">
                        <span>Calificación otorgada por el estudiante:</span>
                        <span className="flex items-center gap-1 text-amber-600">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                          {activeTutoring.score} / 5
                        </span>
                      </div>
                      <p className="text-slate-700 italic text-[11px]">
                        "{activeTutoring.studentComment}"
                      </p>
                    </div>
                  )}

                  {actionError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      {actionError}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
                Seleccione una tutoría para ver los controles y asistencia.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AVAILABILITY CONFIGURATION */}
      {activeTab === 'availability' && (
        <div className="space-y-5">
          {/* Top Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#eaf8ea] text-[#11770e] flex items-center justify-center shrink-0 border border-[#bce6bc]/60">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase">Materias Asignadas</div>
                <div className="text-xl font-bold text-slate-900">
                  {teacherCatalog.length}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#eaf8ea] text-[#11770e] flex items-center justify-center shrink-0 border border-[#bce6bc]/60">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase">Franjas Activas</div>
                <div className="text-xl font-bold text-[#11770e]">
                  {myAvailabilities.filter((a) => a.isAvailable).length}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#fffaed] text-stone-700 flex items-center justify-center shrink-0 border border-stone-200">
                <Clock className="w-5 h-5 text-stone-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase">Total de Horarios</div>
                <div className="text-xl font-bold text-slate-900">{myAvailabilities.length}</div>
              </div>
            </div>
          </div>

          {/* Feedback notifications */}
          {availabilitySuccessMsg && (
            <div className="p-3.5 bg-[#eaf8ea] border border-[#bce6bc] text-[#11770e] rounded-xl text-xs flex items-center gap-2 font-medium animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#11770e] shrink-0" />
              <span>{availabilitySuccessMsg}</span>
            </div>
          )}
          {availabilityErrorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="font-medium">{availabilityErrorMsg}</span>
            </div>
          )}

          {/* Mi Carrera y Asignaturas (autoasignación) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#eaf8ea] text-[#11770e] flex items-center justify-center border border-[#bce6bc]/60">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Mi Carrera y Asignaturas</h3>
                  <p className="text-xs text-slate-500">
                    Carrera: <span className="font-semibold text-slate-700">{currentUser.careerName || 'Sin asignar'}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <select
                  id="select-catalog-semester-filter"
                  value={catalogSemesterFilter}
                  onChange={(e) => setCatalogSemesterFilter(e.target.value)}
                  aria-label="Filtrar asignaturas por semestre"
                  className="text-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-800 font-medium focus:ring-2 focus:ring-[#11770e] cursor-pointer"
                >
                  <option value="all">Todos los semestres</option>
                  {catalogSemesters.map((sem) => (
                    <option key={sem} value={String(sem)}>Semestre {sem}</option>
                  ))}
                </select>
                <span className="text-[11px] font-semibold bg-[#eaf8ea] text-[#11770e] border border-[#bce6bc] px-2.5 py-1 rounded-full w-fit">
                  {teacherCatalog.length} de {subjectsInCareer.length} materias asignadas
                </span>
              </div>
            </div>

            {catalogMsg && (
              <div className="p-3 bg-[#eaf8ea] border border-[#bce6bc] text-[#11770e] rounded-xl text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#11770e] shrink-0" />
                <span>{catalogMsg}</span>
              </div>
            )}
            {catalogError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{catalogError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Marca o desmarca las asignaturas de su carrera que usted impartirá. Solo podrá publicar disponibilidad
                para las materias aquí asignadas.
              </p>
              {catalogSemesterFilter !== 'all' && subjectsInCareer.length > 0 && (
                <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  Mostrando {subjectsInCareerFiltered.length} de {subjectsInCareer.length} asignaturas
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
              {subjectsInCareer.length === 0 ? (
                <div className="col-span-full p-5 text-center text-xs text-slate-400">
                  No hay asignaturas registradas para su carrera todavía.
                </div>
              ) : subjectsInCareerFiltered.length === 0 ? (
                <div className="col-span-full p-5 text-center text-xs text-slate-400">
                  No hay asignaturas en el semestre seleccionado.
                </div>
              ) : subjectsInCareerFiltered.map((sub) => {
                const isAssigned = teacherCatalog.some((s) => s.id === sub.id);
                return (
                  <label
                    key={sub.id}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer transition-colors border ${
                      isAssigned
                        ? 'bg-[#eaf8ea] border-[#bce6bc] text-[#0d5c0b] font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    } ${savingCatalog ? 'opacity-60 pointer-events-none' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={() => handleToggleCatalogSubject(sub.id)}
                      className="rounded border-slate-300 text-[#11770e] focus:ring-[#11770e]"
                    />
                    <span className="font-mono text-[10px] text-indigo-600 bg-indigo-100/60 px-1.5 py-0.5 rounded shrink-0">
                      {sub.code || 'S/C'}
                    </span>
                    <span className="truncate">{sub.name}</span>
                    {sub.semester ? (
                      <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded shrink-0">
                        S{sub.semester}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Gestión de Asignaturas y Disponibilidad Horaria
                </h3>
                <p className="text-xs text-slate-500">
                  Seleccione las asignaturas que imparte y habilite las franjas horarias semanales para tutorías.
                </p>
              </div>

              <button
                type="button"
                id="btn-open-add-slot"
                onClick={() => {
                  setShowAddSlot(!showAddSlot);
                  if (teacherCareerSubjects.length > 0 && !newSubjectId) setNewSubjectId(teacherCareerSubjects[0].id);
                  if (schedules.length > 0 && selectedSlotIds.length === 0) {
                    setSelectedSlotIds([schedules[0].id]);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#11770e] hover:bg-[#0d5c0b] text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddSlot ? 'Cerrar Formulario' : '+ Asignar Horarios'}</span>
              </button>
            </div>

            {/* FORM TO ADD AVAILABILITY */}
            {showAddSlot && (
              <div className="p-5 bg-[#fffaed] border border-[#bce6bc] rounded-2xl space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#11770e] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#11770e]" />
                    Asignar Materia y Franjas Horarias
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {selectedSlotIds.length} franja{selectedSlotIds.length === 1 ? '' : 's'} seleccionada{selectedSlotIds.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      1. Asignatura a Impartir:
                    </label>
                    <select
                      id="select-add-subject"
                      value={newSubjectId}
                      onChange={(e) => setNewSubjectId(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 bg-white p-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500"
                    >
                      {teacherCareerSubjects.length === 0 ? (
                        <option value="" disabled>
                          {subjectsInCareer.length > 0
                            ? 'Asigne primero sus materias en "Mi Carrera y Asignaturas"'
                            : 'No hay asignaturas de su carrera'}
                        </option>
                      ) : teacherCareerSubjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                          {sub.semester ? ` (Semestre ${sub.semester})` : ''} — Código: {sub.code} ({sub.credits || 4} UV)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        2. Franjas Horarias Semanales Disponibles:
                      </label>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSelectedSlotIds(schedules.map((s) => s.id))}
                          className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                        >
                          Seleccionar todas
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedSlotIds([])}
                          className="text-slate-500 hover:underline font-semibold cursor-pointer"
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
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
                            className={`flex items-center gap-1.5 p-2 rounded-xl text-xs font-medium border transition-all cursor-pointer text-left ${
                              isSelected
                                ? 'bg-[#11770e] border-[#11770e] text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-[#eaf8ea]'
                            }`}
                          >
                            <Clock className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                            <span className="truncate">{slot.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#bce6bc]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSlot(false);
                      setSelectedSlotIds([]);
                    }}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-600 text-xs font-medium hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    id="btn-confirm-add-slot"
                    disabled={addingSlot || selectedSlotIds.length === 0}
                    onClick={handleSaveAvailability}
                    className="px-4 py-2 rounded-xl bg-[#11770e] text-white text-xs font-semibold hover:bg-[#0d5c0b] shadow-xs cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
                  >
                    {addingSlot ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Guardar {selectedSlotIds.length} Franja{selectedSlotIds.length === 1 ? '' : 's'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Filter and Availabilities List */}
            <div className="space-y-3">
              {myAvailabilities.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fffaed]/60 p-3 rounded-xl border border-stone-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <Filter className="w-4 h-4 text-[#11770e]" />
                    <span>Filtrar por Materia:</span>
                  </div>
                  <select
                    value={availabilityFilterSubject}
                    onChange={(e) => setAvailabilityFilterSubject(e.target.value)}
                    className="text-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-800 font-medium focus:ring-2 focus:ring-[#11770e]"
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

              {filteredAvailabilities.length === 0 && !showAddSlot ? (
                <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#eaf8ea] text-[#11770e] mx-auto flex items-center justify-center border border-[#bce6bc]">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 text-sm">
                      {myAvailabilities.length === 0
                        ? 'Aún no tiene horarios configurados'
                        : 'No hay franjas registradas para la materia seleccionada'}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {myAvailabilities.length === 0
                        ? 'Defina las asignaturas que imparte y las franjas horarias semanales en las que puede atender a los estudiantes.'
                        : 'Seleccione otra materia en el filtro superior o agregue nuevos horarios.'}
                    </p>
                  </div>
                </div>
              ) : filteredAvailabilities.length === 0 && showAddSlot ? null : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredAvailabilities.map((av) => (
                    <div
                      key={av.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-slate-800 text-sm truncate">
                            {av.subjectCourseName}
                          </div>
                          {(() => {
                            const avSubject = subjects.find((s) => s.id === av.subjectCourseId);
                            return avSubject?.semester ? (
                              <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded shrink-0">
                                S{avSubject.semester}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
                          <Clock className="w-3.5 h-3.5 text-[#11770e] shrink-0" />
                          <span className="font-medium text-slate-700 truncate">{av.scheduleLabel}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          id={`btn-toggle-availability-${av.id}`}
                          onClick={() => handleToggleSlot(av.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            av.isAvailable
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                          title={av.isAvailable ? 'Haga clic para pausar esta franja' : 'Haga clic para activar esta franja'}
                        >
                          {av.isAvailable ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-emerald-600" />
                              <span>Disponible</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-slate-400" />
                              <span>Pausado</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={deleteSlotId === av.id}
                          onClick={() => handleDeleteSlot(av.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                          title="Eliminar esta franja horaria"
                        >
                          {deleteSlotId === av.id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EVALUATIONS & REVIEWS */}
      {activeTab === 'evaluations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Promedio General</span>
              <div className="text-3xl font-bold text-slate-900 mt-1 flex items-center gap-2">
                <Star className="w-7 h-7 fill-amber-400 text-amber-500" />
                {avgRating} / 5.0
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Evaluadas</span>
              <div className="text-3xl font-bold text-slate-900 mt-1">
                {ratedTutorings.length}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Índice de Aprobación</span>
              <div className="text-3xl font-bold text-emerald-600 mt-1">
                100%
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">
              Comentarios y Reseñas de los Alumnos
            </h3>

            {ratedTutorings.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Aún no ha recibido evaluaciones para sus tutorías.
              </div>
            ) : (
              <div className="space-y-3">
                {ratedTutorings.map((tut) => (
                  <div key={tut.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {tut.petitionerStudentName} • {tut.subjectCourseName}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        {tut.score}★
                      </span>
                    </div>
                    <p className="text-slate-700 italic">
                      "{tut.studentComment}"
                    </p>
                    <div className="text-[11px] text-slate-400">
                      Tutoría {tut.code} realizada el {tut.reservDate}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>

      {/* SUCCESS TOASTS */}
      {approvalSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5" />
          {approvalSuccess}
        </div>
      )}

      {cancelSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-rose-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-4">
          <Ban className="w-5 h-5" />
          {cancelSuccess}
        </div>
      )}

      {/* MODAL: APPROVE TUTORING */}
      {approvingTutoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <h3 className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                Aprobar Solicitud {approvingTutoring.code}
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
                  Alumno: {approvingTutoring.petitionerStudentName} | Fecha: {approvingTutoring.reservDate}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  {approvingTutoring.modality === TutoringModality.PRESENCIAL
                    ? 'Aula / Laboratorio Asignado'
                    : 'Enlace de Reunión Virtual'}
                </label>
                <input
                  type="text"
                  value={assignedSpace}
                  onChange={(e) => setAssignedSpace(e.target.value)}
                  required
                  placeholder={
                    approvingTutoring.modality === TutoringModality.PRESENCIAL
                      ? 'Ej: Laboratorio 1'
                      : 'Ej: https://meet.google.com/xxx'
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-emerald-500"
                />
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
                  type="submit"
                  disabled={approving}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
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
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <h3 className="font-bold text-rose-950 text-sm flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-rose-600" />
                Rechazar Solicitud {cancellingTutoring.code}
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
                  Alumno: {cancellingTutoring.petitionerStudentName} | Fecha: {cancellingTutoring.reservDate}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  Motivo de Rechazo (Obligatorio)
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                  minLength={5}
                  placeholder="Especifique el motivo por el cual no puede atender esta solicitud..."
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
                  type="submit"
                  disabled={cancelling}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {cancelling ? 'Rechazando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </form>
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
    </>
  );
};
