import React, { useState } from 'react';
import {
  ScheduleSlot,
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
  Calendar,
  Clock,
  BookOpen,
  Send,
  Users,
  Star,
  Award,
  AlertCircle,
  FileText,
  UserCheck,
  Check,
  PlusCircle,
  History,
  Info,
  Paperclip,
  Trash2,
  List,
  Search,
  ChevronRight,
  GraduationCap,
  MapPin,
  ExternalLink,
  Ban,
  X,
  Sparkles,
  Camera,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import { TutoringCalendarView } from './TutoringCalendarView';
import { StudentTutoringDetailModal } from './StudentTutoringDetailModal';
import { ProfilePhotoCropModal } from './ProfilePhotoCropModal';
import { UserAvatar } from './UserAvatar';
import { InstitutionalProfileCard } from './InstitutionalProfileCard';
import { compressProfileImage } from '../core/utils/image-utils';



interface StudentDashboardProps {
  currentUser: User;
  tutorings: Tutoring[];
  subjects: SubjectCourse[];
  schedules: ScheduleSlot[];
  availabilities: TeacherAvailability[];
  onRefresh: () => void;
  onOpenEvaluation: (tutoring: Tutoring) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentUser,
  tutorings,
  subjects,
  schedules,
  availabilities,
  onRefresh,
  onOpenEvaluation
}) => {
  const [activeTab, setActiveTab] = useState<
    'requests' | 'peers' | 'history' | 'profile'
  >('requests');

  // Semestre registrado del estudiante
  const studentSemester = currentUser.semester ? Number(currentUser.semester) : null;

  // Asignaturas visibles para el estudiante: de su carrera
  const careerSubjects = subjects.filter(
    (s) => !currentUser.careerId || s.careerId === currentUser.careerId
  );

  // Asignaturas filtradas por el semestre registrado del estudiante
  const coursePool = careerSubjects
    .filter((s) => {
      if (!studentSemester) return true;
      return String(s.semester) === String(studentSemester);
    })
    .sort((a, b) => (a.semester || 0) - (b.semester || 0) || a.name.localeCompare(b.name));

  // Form State for New Tutoring
  const [subjectTitle, setSubjectTitle] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [modality, setModality] = useState<TutoringModality | ''>('');

  // Calculate default +2 days minimum date
  const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  };

  const [reservDate, setReservDate] = useState(getMinDate());
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [details, setDetails] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<{ fileName: string; fileUrl: string } | null>(null);
  const [displayMode, setDisplayMode] = useState<'list' | 'calendar'>('list');
  const [selectedDetailTutoring, setSelectedDetailTutoring] = useState<Tutoring | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Search & Filter state for History
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');

  // Cancel Tutoring Modal State
  const [cancellingTutoring, setCancellingTutoring] = useState<Tutoring | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  // Photo Management State
  const [photoUploading, setPhotoUploading] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);
  const [photoToCrop, setPhotoToCrop] = useState<File | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement | null>(null);

  const handlePhotoUploadFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileErrorMsg('Por favor seleccione un archivo de imagen válido (.jpg, .png, .webp).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setProfileErrorMsg('La imagen no debe superar los 8MB.');
      return;
    }

    setPhotoUploading(true);
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);

    try {
      const compressedBase64 = await compressProfileImage(file, 400, 400, 0.88);
      const res = await ApiClient.updateUserProfile(currentUser.id, { photoUrl: compressedBase64 }, currentUser);
      if (res.success) {
        setProfileSuccessMsg('¡Foto de perfil actualizada exitosamente! Ahora es visible para tus docentes.');
        onRefresh();
        setTimeout(() => setProfileSuccessMsg(null), 4500);
      } else {
        setProfileErrorMsg(res.error?.message || 'Error al actualizar la foto de perfil.');
      }
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Error al procesar la imagen seleccionada.');
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm('¿Está seguro de que desea eliminar su foto de perfil actual?')) return;
    setPhotoUploading(true);
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);
    try {
      const res = await ApiClient.updateUserProfile(currentUser.id, { photoUrl: '' }, currentUser);
      if (res.success) {
        setProfileSuccessMsg('Foto de perfil eliminada correctamente.');
        onRefresh();
        setTimeout(() => setProfileSuccessMsg(null), 4000);
      } else {
        setProfileErrorMsg(res.error?.message || 'Error al eliminar la foto.');
      }
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Error al eliminar la foto.');
    } finally {
      setPhotoUploading(false);
    }
  };

  // Available teachers & slots for selected course
  const matchingAvailabilities = availabilities.filter(
    (a) => a.subjectCourseId === selectedCourseId && a.isAvailable
  );

  // Keep the course empty until the student chooses one.
  React.useEffect(() => {
    if (!coursePool.some((s) => s.id === selectedCourseId)) {
      setSelectedCourseId('');
      setSelectedTeacherId('');
      setSelectedSlotId('');
    }
  }, [coursePool.length]);

  // Auto-select first matching teacher/slot when available or changed
  React.useEffect(() => {
    if (matchingAvailabilities.length > 0) {
      const isCurrentValid = matchingAvailabilities.some(
        (a) => a.teacherId === selectedTeacherId && a.scheduleSlotId === selectedSlotId
      );
      if (!isCurrentValid) {
        setSelectedTeacherId(matchingAvailabilities[0].teacherId);
        setSelectedSlotId(matchingAvailabilities[0].scheduleSlotId);
      }
    } else {
      setSelectedTeacherId('');
      setSelectedSlotId('');
    }
  }, [selectedCourseId, matchingAvailabilities.length]);

  // Handle course change: auto-select first available teacher/slot
  const handleCourseChange = (newCourseId: string) => {
    setSelectedCourseId(newCourseId);
    const firstMatch = availabilities.find((a) => a.subjectCourseId === newCourseId && a.isAvailable);
    if (firstMatch) {
      setSelectedTeacherId(firstMatch.teacherId);
      setSelectedSlotId(firstMatch.scheduleSlotId);
    } else {
      setSelectedTeacherId('');
      setSelectedSlotId('');
    }
  };

  // Submit new request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    setSubmitting(true);

    if (!selectedTeacherId || !selectedSlotId) {
      setSubmitError('Debe seleccionar un docente y un horario disponible para la asignatura.');
      setSubmitting(false);
      return;
    }

    if (modality === '') {
      setSubmitError('Debe seleccionar una modalidad para la tutoría.');
      setSubmitting(false);
      return;
    }

    const res = await ApiClient.createTutoring(
      {
        subject: subjectTitle,
        details,
        reservDate,
        scheduleSlotId: selectedSlotId,
        subjectCourseId: selectedCourseId,
        teacherId: selectedTeacherId,
        modality,
        attachmentName,
        attachmentUrl
      },
      currentUser
    );

    setSubmitting(false);

    if (res.success) {
      setSubmitSuccess('¡Solicitud de tutoría enviada con éxito! Su docente o administrador la revisará.');
      setSubjectTitle('');
      setDetails('');
      setAttachmentName(null);
      setAttachmentUrl(null);
      const fileInput = document.getElementById('file-attachment') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
      setTimeout(() => setSubmitSuccess(null), 5000);
      onRefresh();
    } else {
      setSubmitError(res.error?.message || 'Error al procesar la solicitud.');
    }
  };

  // Join existing tutoring as guest
  const handleJoin = async (tutoringId: string) => {
    const res = await ApiClient.joinTutoring(tutoringId, currentUser);
    if (res.success) {
      onRefresh();
    } else {
      alert(res.error?.message || 'No fue posible unirse a la tutoría.');
    }
  };

  // Handle student cancel request
  const handleConfirmCancel = async (e: React.FormEvent) => {
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
      setCancelSuccess(`Tutoría ${cancellingTutoring.code} cancelada.`);
      setTimeout(() => setCancelSuccess(null), 4000);
      onRefresh();
    } else {
      setCancelError(res.error?.message || 'Error al cancelar la tutoría.');
    }
  };

  // Filtered data
  const myRequestedTutorings = tutorings.filter((t) => t.petitionerStudentId === currentUser.id);
  const myGuestTutorings = tutorings.filter(
    (t) =>
      t.petitionerStudentId !== currentUser.id &&
      (t.assistants || []).some((a) => a.studentId === currentUser.id)
  );

  // Total student tutorings
  const totalMyTutorings = myRequestedTutorings.length + myGuestTutorings.length;

  // Upcoming peer tutorings that student can join:
  // solo de su misma carrera y su mismo semestre (según la materia de la tutoría).
  // Ej: una tutoría de POO creada por un estudiante de semestre 2 no le aparece a uno de semestre 3.
  const mySemester = currentUser.semester ? Number(currentUser.semester) : null;
  const subjectById = new Map<string, SubjectCourse>(subjects.map((s) => [s.id, s]));
  const peerUpcomingTutorings = tutorings.filter((t) => {
    if (t.petitionerStudentId === currentUser.id) return false;
    if (!(t.status === TutoringStatus.PENDING || t.status === TutoringStatus.APPROVED)) return false;
    if ((t.assistants || []).some((a) => a.studentId === currentUser.id)) return false;
    const subj = t.subjectCourseId ? subjectById.get(t.subjectCourseId) : undefined;
    if (currentUser.careerId && subj?.careerId && subj.careerId !== currentUser.careerId) return false;
    if (mySemester && subj?.semester && Number(subj.semester) !== mySemester) return false;
    return true;
  });

  // Format Date & Time helper
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

  // Filtered requested tutorings for history tab
  const filteredRequestedTutorings = myRequestedTutorings.filter((t) => {
    if (historyStatusFilter !== 'all' && t.status !== historyStatusFilter) return false;
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      const matchCode = t.code?.toLowerCase().includes(q);
      const matchSub = t.subject?.toLowerCase().includes(q);
      const matchCourse = t.subjectCourseName?.toLowerCase().includes(q);
      const matchTeacher = t.teacherName?.toLowerCase().includes(q);
      return matchCode || matchSub || matchCourse || matchTeacher;
    }
    return true;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start pb-12">
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-full shrink-0 space-y-4 rounded-xl border border-stone-200 bg-white p-4 shadow-xs lg:w-72 xl:w-80">
        <InstitutionalProfileCard
          user={currentUser}
          variant="sidebar"
          canEditPhoto={false}
          showEmail={false}
          className="w-full mb-2"
        />

        <div className="space-y-2">
          <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">
            Portal Estudiantil
          </div>

          <nav className="space-y-1.5">
            <button
              id="tab-student-requests"
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-brand-50 text-brand-800 shadow-xs ring-1 ring-brand-200'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-brand-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <PlusCircle aria-hidden="true" className="w-4 h-4 shrink-0" />
                <span>Solicitar Tutoría</span>
              </div>
            </button>

            <button
              id="tab-student-peers"
              type="button"
              onClick={() => setActiveTab('peers')}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                activeTab === 'peers'
                  ? 'bg-brand-50 text-brand-800 shadow-xs ring-1 ring-brand-200'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-brand-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users aria-hidden="true" className="w-4 h-4 shrink-0" />
                <span>Tutorías Disponibles</span>
              </div>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'peers'
                  ? 'bg-white text-brand-700'
                    : 'bg-info-soft text-info'
                }`}
              >
                {peerUpcomingTutorings.length}
              </span>
            </button>

            <button
              id="tab-student-history"
              type="button"
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-brand-50 text-brand-800 shadow-xs ring-1 ring-brand-200'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-brand-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <History aria-hidden="true" className="w-4 h-4 shrink-0" />
                <span>Mis Tutorías e Historial</span>
              </div>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'history'
                    ? 'bg-white text-brand-700'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {totalMyTutorings}
              </span>
            </button>

            <button
              id="tab-student-profile"
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-brand-50 text-brand-800 shadow-xs ring-1 ring-brand-200'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-brand-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <UserCheck aria-hidden="true" className="w-4 h-4 shrink-0" />
                <span>Ficha Estudiantil</span>
              </div>
            </button>
          </nav>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 w-full min-w-0 space-y-6">
        {/* Notifications */}
        {cancelSuccess && (
          <div className="p-4 bg-brand-50 border border-brand-200 text-brand-700 rounded-2xl text-xs flex items-center gap-2 font-bold animate-in fade-in">
            <Check aria-hidden="true" className="w-4 h-4 text-brand-700 shrink-0" />
            <span>{cancelSuccess}</span>
          </div>
        )}

        {/* TAB 1: SOLICITAR TUTORÍA */}
        {activeTab === 'requests' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-stone-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
                <div className="flex items-center gap-3.5">
                  <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Send aria-hidden="true" className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700">Nueva solicitud</p>
                    <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">Solicitar una tutoría</h2>
                    <p className="mt-1 text-sm text-stone-500">Cuéntanos qué necesitas y elige cuándo recibir apoyo.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600 sm:self-auto">
                  <Clock aria-hidden="true" className="h-4 w-4 text-brand-700" />
                  <span>
                    Reserva con <strong className="font-semibold text-slate-800">2 días</strong> de anticipación
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmitRequest} className="space-y-7 p-5 text-sm sm:p-7">
                <section aria-labelledby="tutoring-session-heading" className="space-y-4">
                  <div>
                    <h3 id="tutoring-session-heading" className="text-sm font-semibold text-slate-900">Detalles de la sesión</h3>
                    <p className="mt-0.5 text-xs text-stone-500">Selecciona una asignatura para ver sus docentes disponibles.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                  {/* Asignatura */}
                  <div className="space-y-1.5">
                    <label htmlFor="select-tutoring-course" className="block text-xs font-medium text-slate-700">
                      Asignatura <span className="text-danger">*</span>
                    </label>
                    <select
                      id="select-tutoring-course"
                      value={selectedCourseId}
                      onChange={(e) => handleCourseChange(e.target.value)}
                      required
                      className="h-12 w-full cursor-pointer rounded-lg border border-stone-200 bg-white px-3.5 text-sm font-normal text-slate-800 transition-colors focus:border-brand-600 focus:outline-hidden focus:ring-2 focus:ring-brand-600/20"
                    >
                      <option value="" disabled>Elige una asignatura</option>
                      {coursePool.length === 0 && (
                        <option value="">No hay asignaturas registradas para este semestre</option>
                      )}
                      {coursePool.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.semester ? `(Semestre ${s.semester})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Docente y Horario */}
                  <div className="space-y-1.5">
                    <label htmlFor="select-teacher-availability" className="block text-xs font-medium text-slate-700">
                      Docente y horario <span className="text-danger">*</span>
                    </label>
                    <select
                      id="select-teacher-availability"
                      value={`${selectedTeacherId}|${selectedSlotId}`}
                      onChange={(e) => {
                        const [tId, sId] = e.target.value.split('|');
                        setSelectedTeacherId(tId || '');
                        setSelectedSlotId(sId || '');
                      }}
                      required
                      disabled={matchingAvailabilities.length === 0}
                      className="h-12 w-full cursor-pointer rounded-lg border border-stone-200 bg-white px-3.5 text-sm font-normal text-slate-800 transition-colors focus:border-brand-600 focus:outline-hidden focus:ring-2 focus:ring-brand-600/20 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400"
                    >
                      {matchingAvailabilities.length === 0 ? (
                        <option value="">No hay docentes con disponibilidad activa para esta materia</option>
                      ) : (
                        matchingAvailabilities.map((a) => (
                          <option key={a.id} value={`${a.teacherId}|${a.scheduleSlotId}`}>
                            Prof. {a.teacherName} — {a.scheduleLabel}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Modalidad */}
                  <div className="space-y-1.5">
                    <label htmlFor="select-tutoring-modality" className="block text-xs font-medium text-slate-700">
                      Modalidad <span className="text-danger">*</span>
                    </label>
                    <select
                      id="select-tutoring-modality"
                      value={modality}
                      onChange={(e) => setModality(e.target.value === '' ? '' : Number(e.target.value) as TutoringModality)}
                      required
                      className="h-12 w-full cursor-pointer rounded-lg border border-stone-200 bg-white px-3.5 text-sm font-normal text-slate-800 transition-colors focus:border-brand-600 focus:outline-hidden focus:ring-2 focus:ring-brand-600/20"
                    >
                      <option value="" disabled>Elige una modalidad</option>
                      <option value={TutoringModality.VIRTUAL}>Virtual (Google Meet / Enlace en vivo)</option>
                      <option value={TutoringModality.PRESENCIAL}>Presencial (Aula / Laboratorio institucional)</option>
                    </select>
                  </div>

                  {/* Fecha de Reserva */}
                  <div className="space-y-1.5">
                    <label htmlFor="input-tutoring-date" className="block text-xs font-medium text-slate-700">
                      Fecha de la sesión <span className="text-danger">*</span>
                    </label>
                    <input
                      id="input-tutoring-date"
                      type="date"
                      min={getMinDate()}
                      value={reservDate}
                      onChange={(e) => setReservDate(e.target.value)}
                      required
                      className="h-12 w-full rounded-lg border border-stone-200 bg-white px-3.5 text-sm font-normal text-slate-800 transition-colors focus:border-brand-600 focus:outline-hidden focus:ring-2 focus:ring-brand-600/20"
                    />
                  </div>
                  </div>
                </section>

                {/* Tema / Asunto */}
                <section aria-labelledby="tutoring-topic-heading" className="space-y-4 border-t border-stone-100 pt-6">
                  <div>
                    <h3 id="tutoring-topic-heading" className="text-sm font-semibold text-slate-900">¿En qué necesitas ayuda?</h3>
                    <p className="mt-0.5 text-xs text-stone-500">Describe el tema para que el docente pueda prepararse.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="input-tutoring-subject" className="block text-xs font-medium text-slate-700">
                      Tema o asunto <span className="text-danger">*</span>
                    </label>
                    <input
                      id="input-tutoring-subject"
                      type="text"
                      value={subjectTitle}
                      onChange={(e) => setSubjectTitle(e.target.value)}
                      placeholder="Ej.: límites, derivadas, estructuras de datos…"
                      maxLength={70}
                      required
                      className="h-12 w-full rounded-lg border border-stone-200 bg-white px-3.5 text-sm text-slate-800 transition-colors placeholder:text-stone-400 focus:border-brand-600 focus:outline-hidden focus:ring-2 focus:ring-brand-600/20"
                    />
                  </div>

                {/* Descripción y Dudas */}
                <div className="space-y-1.5">
                  <label htmlFor="input-tutoring-details" className="block text-xs font-medium text-slate-700">
                    Descripción de tus dudas <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="input-tutoring-details"
                    rows={3}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Escribe qué temas, ejercicios o preguntas quieres revisar…"
                    required
                    className="w-full resize-y rounded-lg border border-stone-200 bg-white p-3.5 text-sm text-slate-800 transition-colors placeholder:text-stone-400 focus:border-brand-600 focus:outline-hidden focus:ring-2 focus:ring-brand-600/20"
                  />
                </div>
                </section>

                {/* Material de Apoyo (Adjunto) */}
                <div className="space-y-3 border-t border-stone-100 pt-6">
                  <div>
                    <label htmlFor="file-attachment" className="block text-xs font-medium text-slate-700">
                      Material de apoyo <span className="font-normal text-stone-400">(opcional)</span>
                    </label>
                    <p className="mt-0.5 text-xs text-stone-500">PDF, DOCX o imagen · Máximo 8 MB</p>
                  </div>
                  <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/70 p-4 transition-colors hover:border-brand-400 hover:bg-brand-50/30">
                    <input
                      id="file-attachment"
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 8 * 1024 * 1024) {
                            setSubmitError('El archivo no debe exceder los 8 MB.');
                            e.target.value = '';
                            setAttachmentName(null);
                            setAttachmentUrl(null);
                            setIsReadingFile(false);
                            return;
                          }
                          setSubmitError(null);
                          setAttachmentName(file.name);
                          setIsReadingFile(true);
                          const reader = new FileReader();
                          reader.onload = () => {
                            setAttachmentUrl(reader.result as string);
                            setIsReadingFile(false);
                          };
                          reader.onerror = () => {
                            setSubmitError('Error al leer el archivo seleccionado.');
                            setIsReadingFile(false);
                          };
                          reader.readAsDataURL(file);
                        } else {
                          setAttachmentName(null);
                          setAttachmentUrl(null);
                          setIsReadingFile(false);
                        }
                      }}
                      className="w-full cursor-pointer text-xs text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-slate-700 file:shadow-sm hover:file:bg-stone-100"
                    />
                  </div>

                  {attachmentName && (
                    <div className="flex w-fit items-center gap-2.5 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2 text-xs font-semibold text-brand-700">
                      <Paperclip aria-hidden="true" className="w-4 h-4 shrink-0" />
                      <span className="truncate max-w-sm">{attachmentName}</span>
                      {isReadingFile && (
                        <span className="text-[10px] text-warning animate-pulse">(Cargando…)</span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentName(null);
                          setAttachmentUrl(null);
                          setIsReadingFile(false);
                          const fileInput = document.getElementById('file-attachment') as HTMLInputElement | null;
                          if (fileInput) fileInput.value = '';
                        }}
                        className="text-danger hover:text-danger ml-1 p-0.5 rounded cursor-pointer"
                        title="Quitar archivo adjunto"
                      >
                        <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {submitError && (
                  <div role="alert" className="p-3.5 bg-danger-soft border border-danger-border text-danger rounded-xl text-xs flex items-center gap-2 font-bold">
                    <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 text-danger" />
                    <span>{submitError}</span>
                  </div>
                )}

                {submitSuccess && (
                  <div className="p-3.5 bg-brand-50 border border-brand-200 text-brand-700 rounded-xl text-xs flex items-center gap-2 font-bold">
                    <Check aria-hidden="true" className="w-4 h-4 shrink-0 text-brand-700" />
                    <span>{submitSuccess}</span>
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-stone-500"><span className="text-danger">*</span> Campos obligatorios</p>
                  <button
                    id="btn-submit-tutoring-request"
                    type="submit"
                    disabled={submitting || isReadingFile || matchingAvailabilities.length === 0}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send aria-hidden="true" className="w-4 h-4" />
                    <span>
                      {submitting
                        ? 'Enviando solicitud…'
                        : isReadingFile
                        ? 'Procesando archivo adjunto…'
                        : 'Enviar Solicitud de Tutoría'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: TUTORÍAS DISPONIBLES DE COMPAÑEROS */}
        {activeTab === 'peers' && (
          <section aria-labelledby="peer-tutorings-title" className="space-y-4 animate-in fade-in duration-200">
            <header className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex min-w-0 items-start gap-3">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Users className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h2 id="peer-tutorings-title" className="text-lg font-semibold tracking-tight text-slate-900">Tutorías disponibles</h2>
                  <p className="mt-0.5 text-sm text-stone-500">Únete a una sesión grupal solicitada por otro estudiante.</p>
                </div>
              </div>
              <span className="inline-flex h-8 w-fit items-center rounded-full bg-stone-100 px-3 text-xs font-medium text-stone-600">
                {peerUpcomingTutorings.length} {peerUpcomingTutorings.length === 1 ? 'sesión disponible' : 'sesiones disponibles'}
              </span>
            </header>

            {peerUpcomingTutorings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 bg-white px-5 py-14 text-center">
                <Users aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-stone-300" />
                <p className="text-sm font-semibold text-slate-800">No hay tutorías grupales disponibles</p>
                <p className="mt-1 text-sm text-stone-500">Cuando un compañero publique una sesión, aparecerá aquí.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {peerUpcomingTutorings.map((tut) => {
                  const dt = formatTutoringDateTime(tut.reservDate, tut.scheduleLabel, tut.reservTime);
                  const participantCount = (tut.assistants || []).length;
                  return (
                    <article key={tut.id} className="rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-stone-300 sm:p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] text-stone-400">{tut.code}</span>
                            <StatusBadge status={tut.status} size="sm" />
                          </div>
                          <h3 className="mt-1.5 text-base font-semibold text-slate-900">{tut.subjectCourseName || tut.subject}</h3>
                          {tut.subjectCourseName && tut.subject && tut.subject !== tut.subjectCourseName && (
                            <p className="mt-0.5 text-sm text-stone-500">Tema: {tut.subject}</p>
                          )}

                          <dl className="mt-4 grid grid-cols-1 gap-x-5 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                            <div className="flex items-start gap-2.5">
                              <Calendar aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                              <div><dt className="text-xs text-stone-500">Fecha</dt><dd className="mt-0.5 font-medium text-slate-800">{dt.formattedDate}</dd></div>
                            </div>
                            <div className="flex items-start gap-2.5">
                              <Clock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                              <div><dt className="text-xs text-stone-500">Horario</dt><dd className="mt-0.5 font-medium text-slate-800">{dt.timeDisplay}</dd></div>
                            </div>
                            <div className="flex min-w-0 items-start gap-2.5">
                              <GraduationCap aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                              <div className="min-w-0"><dt className="text-xs text-stone-500">Docente</dt><dd className="mt-0.5 truncate font-medium text-slate-800">Prof. {tut.teacherName}</dd></div>
                            </div>
                            <div className="flex items-start gap-2.5">
                              <Users aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                              <div><dt className="text-xs text-stone-500">Participantes</dt><dd className="mt-0.5 font-medium text-slate-800">{participantCount}</dd></div>
                            </div>
                          </dl>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-stone-100 pt-3 sm:flex-row lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                          <button
                            type="button"
                            id={`btn-view-peer-tutoring-${tut.id}`}
                            onClick={() => setSelectedDetailTutoring(tut)}
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-200 px-3.5 text-xs font-medium text-slate-700 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                            title="Ver detalle antes de unirme"
                          >
                            <FileText aria-hidden="true" className="h-3.5 w-3.5" />Ver detalle
                          </button>
                          <button
                            type="button"
                            id={`btn-join-tutoring-${tut.id}`}
                            onClick={() => handleJoin(tut.id)}
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                          >
                            <Users aria-hidden="true" className="h-3.5 w-3.5" />Unirme
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: MIS TUTORÍAS E HISTORIAL */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Toolbar */}
            <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center shrink-0">
                  <History aria-hidden="true" className="w-4 h-4" />
                </span>
                <div>
                <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                  Mis Tutorías e Historial
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Consulte el estado de sus solicitudes, acceda a enlaces de sesión y califique sus tutorías finalizadas.
                </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 sm:flex-initial">
                  <Search aria-hidden="true" className="w-4 h-4 absolute left-3.5 top-3 text-stone-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar materia, tema, código…"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="h-11 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder-stone-400 transition-colors focus:border-brand-600 focus:outline-hidden focus:ring-2 focus:ring-brand-600/20 sm:w-56"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="h-11 cursor-pointer rounded-lg border border-stone-200 bg-white px-3.5 text-sm font-normal text-slate-800 transition-colors focus:border-brand-600 focus:outline-hidden focus:ring-2 focus:ring-brand-600/20"
                >
                  <option value="all">Todos los estados ({myRequestedTutorings.length})</option>
                  <option value={TutoringStatus.PENDING}>Pendientes</option>
                  <option value={TutoringStatus.APPROVED}>Aprobadas</option>
                  <option value={TutoringStatus.IN_PROGRESS}>En Curso</option>
                  <option value={TutoringStatus.COMPLETED}>Finalizadas</option>
                  <option value={TutoringStatus.CANCELLED}>Canceladas</option>
                </select>

                {/* View Switcher */}
                <div className="flex h-11 items-center rounded-lg bg-stone-100 p-1 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setDisplayMode('list')}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 transition-colors cursor-pointer ${
                      displayMode === 'list'
                        ? 'bg-white text-brand-700 shadow-2xs font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <List aria-hidden="true" className="w-3.5 h-3.5" />
                    <span>Lista</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayMode('calendar')}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 transition-colors cursor-pointer ${
                      displayMode === 'calendar'
                        ? 'bg-white text-brand-700 shadow-2xs font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Calendar aria-hidden="true" className="w-3.5 h-3.5" />
                    <span>Calendario</span>
                  </button>
                </div>
              </div>
            </div>

            {displayMode === 'calendar' ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
                <TutoringCalendarView
                  tutorings={myRequestedTutorings}
                  currentUser={currentUser}
                  onSelectTutoring={(tut) => setSelectedDetailTutoring(tut)}
                  onSelectDate={(dateStr) => {
                    setReservDate(dateStr);
                    setActiveTab('requests');
                  }}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Tutorías Solicitadas por Mí */}
                <section aria-labelledby="my-requested-tutorings-title" className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                  <div className="flex flex-col gap-1 border-b border-stone-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div>
                      <h3 id="my-requested-tutorings-title" className="text-sm font-semibold text-slate-900">Solicitadas por mí</h3>
                      <p className="mt-0.5 text-xs text-stone-500">Estado, horario y acciones de cada sesión.</p>
                    </div>
                    <span className="text-xs font-medium text-stone-500">{filteredRequestedTutorings.length} de {myRequestedTutorings.length} tutorías</span>
                  </div>

                  {filteredRequestedTutorings.length === 0 ? (
                    <div className="px-5 py-14 text-center">
                      <BookOpen aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-stone-300" />
                      <p className="text-sm font-semibold text-slate-800">No hay tutorías para mostrar</p>
                      <p className="mt-1 text-sm text-stone-500">Ajusta la búsqueda o crea una solicitud desde «Solicitar Tutoría».</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {filteredRequestedTutorings.map((tut) => {
                        const dt = formatTutoringDateTime(tut.reservDate, tut.scheduleLabel, tut.reservTime);
                        const myRating = (tut.ratings || []).find((rating) => rating.studentId === currentUser.id);
                        return (
                          <article key={tut.id} className="p-4 transition-colors hover:bg-stone-50/40 sm:p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-[11px] text-stone-400">{tut.code}</span>
                                  <StatusBadge status={tut.status} size="sm" />
                                </div>
                                <h4 className="mt-1.5 text-base font-semibold text-slate-900">{tut.subjectCourseName || tut.subject}</h4>
                                {tut.subjectCourseName && tut.subject && tut.subject !== tut.subjectCourseName && (
                                  <p className="mt-0.5 text-sm text-stone-500">Tema: {tut.subject}</p>
                                )}

                                <dl className="mt-4 grid grid-cols-1 gap-x-5 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                                  <div className="flex items-start gap-2.5">
                                    <Calendar aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                                    <div><dt className="text-xs text-stone-500">Fecha y hora</dt><dd className="mt-0.5 font-medium text-slate-800">{dt.formattedDate} · {dt.timeDisplay}</dd></div>
                                  </div>
                                  <div className="flex min-w-0 items-start gap-2.5">
                                    <GraduationCap aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                                    <div className="min-w-0"><dt className="text-xs text-stone-500">Docente</dt><dd className="mt-0.5 truncate font-medium text-slate-800">Prof. {tut.teacherName}</dd></div>
                                  </div>
                                  <div className="flex min-w-0 items-start gap-2.5 sm:col-span-2">
                                    <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                                    <div className="min-w-0"><dt className="text-xs text-stone-500">Espacio o enlace</dt><dd className="mt-0.5 truncate font-medium text-slate-800">
                                      {tut.space && tut.space.startsWith('http') ? (
                                        <a href={tut.space} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">
                                          Abrir enlace <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                                        </a>
                                      ) : tut.space || 'Por asignar'}
                                    </dd></div>
                                  </div>
                                </dl>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3 lg:max-w-[280px] lg:justify-end lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                                {tut.status === TutoringStatus.COMPLETED && !myRating && (
                                  <button type="button" onClick={() => onOpenEvaluation(tut)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-white transition-colors hover:bg-amber-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">
                                    <Star aria-hidden="true" className="h-3.5 w-3.5 fill-white" />Calificar
                                  </button>
                                )}
                                {tut.status === TutoringStatus.COMPLETED && myRating && (
                                  <span className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-amber-50 px-3 text-xs font-semibold text-amber-800" title={myRating.studentComment || ''}>
                                    <Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />Mi calificación: {myRating.score}/5
                                  </span>
                                )}
                                {tut.status === TutoringStatus.PENDING && (
                                  <button
                                    type="button"
                                    onClick={() => { setCancellingTutoring(tut); setCancelReason(''); setCancelError(null); }}
                                    className="inline-flex min-h-10 items-center rounded-lg border border-danger-border px-3 text-xs font-medium text-danger transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                                  >Cancelar</button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setSelectedDetailTutoring(tut)}
                                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-stone-200 px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                                >Detalle <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" /></button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
                {/* Tutorías como Invitado */}
                {myGuestTutorings.length > 0 && (
                  <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                    <div className="border-b border-stone-100 px-5 py-4">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Tutorías a las que Asisto como Invitado ({myGuestTutorings.length})
                      </h3>
                    </div>

                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myGuestTutorings.map((g) => {
                        const myAssistantRecord = (g.assistants || []).find((a) => a.studentId === currentUser.id);
                        const dt = formatTutoringDateTime(g.reservDate, g.scheduleLabel, g.reservTime);
                        return (
                          <div
                            key={g.id}
                            className="space-y-2 rounded-xl border border-stone-200 bg-white p-4 text-xs transition-colors hover:border-brand-300"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-sm">{g.subject}</span>
                              <StatusBadge status={g.status} size="sm" />
                            </div>
                            <div className="text-stone-600">Docente: <strong>Prof. {g.teacherName}</strong> | {g.subjectCourseName}</div>
                            <div className="text-stone-500">Fecha: {dt.formattedDate} • {dt.timeDisplay}</div>
                            {(() => {
                              const myRating = (g.ratings || []).find((r) => r.studentId === currentUser.id);
                              return (
                                <>
                                  {g.status === TutoringStatus.COMPLETED && !myRating && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenEvaluation(g)}
                                      className="mt-1 h-9 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-2xs flex items-center gap-1 transition-colors cursor-pointer w-fit"
                                    >
                                      <Star className="w-3 h-3 fill-white" />
                                      <span>Calificar</span>
                                    </button>
                                  )}
                                  {g.status === TutoringStatus.COMPLETED && myRating && (
                                    <span
                                      className="mt-1 inline-flex items-center gap-1 text-warning bg-warning-soft border border-warning-border px-2 py-1 rounded-lg text-xs font-bold w-fit"
                                      title={myRating.studentComment || ''}
                                    >
                                      <Star aria-hidden="true" className="w-3 h-3 fill-amber-400 text-amber-500" />
                                      Mi calificación: {myRating.score}
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                            <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                              <span className="text-stone-500">
                                {g.space && g.space.startsWith('http') ? (
                                  <a href={g.space} target="_blank" rel="noreferrer" className="text-brand-700 font-bold underline">
                                    Abrir Meet
                                  </a>
                                ) : (
                                  g.space || 'Presencial'
                                )}
                              </span>
                              <span className={`font-bold ${myAssistantRecord?.hasAttended ? 'text-brand-700' : 'text-stone-500'}`}>
                                {myAssistantRecord?.hasAttended ? '✓ Asistencia confirmada' : '• Asistencia pendiente'}
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
        )}

        {/* TAB 4: FICHA ESTUDIANTIL */}
        {activeTab === 'profile' && (
          <section aria-labelledby="student-profile-title" className="max-w-4xl space-y-4 animate-in fade-in duration-200">
            <header>
              <p className="text-xs font-medium text-brand-700">Mi cuenta</p>
              <h2 id="student-profile-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Ficha estudiantil</h2>
              <p className="mt-1 text-sm text-stone-500">Consulta tus datos académicos y administra tu foto de perfil.</p>
            </header>

            {profileSuccessMsg && (
              <div role="status" className="flex items-center gap-2.5 rounded-xl border border-brand-200 bg-brand-50 p-3.5 text-sm font-medium text-brand-800">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" /><span>{profileSuccessMsg}</span>
              </div>
            )}
            {profileErrorMsg && (
              <div role="alert" className="flex items-center gap-2.5 rounded-xl border border-danger-border bg-danger-soft p-3.5 text-sm font-medium text-danger">
                <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" /><span>{profileErrorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-stone-200 bg-white md:grid-cols-[240px_minmax(0,1fr)]">
              <section aria-label="Foto de perfil" className="flex flex-col items-center border-b border-stone-200 bg-stone-50/60 p-5 text-center md:border-b-0 md:border-r md:p-6">
                <div className="relative">
                  <UserAvatar user={currentUser} size="2xl" className="border border-stone-200 bg-white shadow-sm" />
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      if (!file.type.startsWith('image/')) {
                        setProfileErrorMsg('Por favor selecciona un archivo de imagen válido (.jpg, .png, .webp).');
                        return;
                      }
                      if (file.size > 8 * 1024 * 1024) {
                        setProfileErrorMsg('La imagen no debe superar los 8 MB.');
                        return;
                      }
                      setProfileErrorMsg(null);
                      setPhotoToCrop(file);
                    }}
                    className="hidden"
                  />
                </div>
                <h3 className="mt-4 max-w-full break-words text-base font-semibold text-slate-900">{currentUser.fullName}</h3>
                <span className="mt-2 inline-flex max-w-full items-center rounded-full border border-stone-200 bg-white px-3 py-1 font-mono text-xs text-stone-600">
                  Matrícula · {currentUser.account || 'N/A'}
                </span>
                <div className="mt-4 flex w-full flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoUploading}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {photoUploading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <UploadCloud aria-hidden="true" className="h-4 w-4" />}
                    {photoUploading ? 'Guardando foto…' : currentUser.photoUrl ? 'Cambiar foto' : 'Subir foto'}
                  </button>
                  {currentUser.photoUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={photoUploading}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition-colors hover:border-danger-border hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />Quitar foto
                    </button>
                  )}
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-stone-500">Formatos JPG, PNG o WEBP. La foto será visible para docentes y administradores.</p>
              </section>

              <div className="space-y-5 p-4 sm:p-6">
                <section aria-labelledby="student-academic-data-title">
                  <div className="mb-3 flex items-center gap-2 border-b border-stone-100 pb-3">
                    <GraduationCap aria-hidden="true" className="h-4 w-4 text-brand-700" />
                    <h3 id="student-academic-data-title" className="text-sm font-semibold text-slate-900">Información académica</h3>
                  </div>
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-stone-200 p-3.5">
                      <dt className="text-xs text-stone-500">Programa académico</dt>
                      <dd className="mt-1 text-sm font-medium text-slate-800">{currentUser.careerName || 'No asignado'}</dd>
                    </div>
                    <div className="rounded-lg border border-stone-200 p-3.5">
                      <dt className="text-xs text-stone-500">Semestre vigente</dt>
                      <dd className="mt-1 text-sm font-medium text-slate-800">{currentUser.semester ? `Semestre ${currentUser.semester}` : 'Por definir'}</dd>
                    </div>
                    <div className="rounded-lg border border-stone-200 p-3.5 sm:col-span-2">
                      <dt className="text-xs text-stone-500">Fecha de ingreso</dt>
                      <dd className="mt-1 text-sm font-medium text-slate-800">{currentUser.admissionDate || 'No registrada'}</dd>
                    </div>
                  </dl>
                </section>

                <section aria-labelledby="student-contact-data-title">
                  <div className="mb-3 flex items-center gap-2 border-b border-stone-100 pb-3">
                    <h3 id="student-contact-data-title" className="text-sm font-semibold text-slate-900">Contacto institucional</h3>
                  </div>
                  <dl className="rounded-lg border border-stone-200 p-3.5">
                    <dt className="text-xs text-stone-500">Correo institucional</dt>
                    <dd className="mt-1 break-all text-sm font-medium text-slate-800">{currentUser.email}</dd>
                  </dl>
                </section>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* MODAL: CANCEL TUTORING */}
      {cancellingTutoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-danger-soft border-b border-danger-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-danger-soft text-danger flex items-center justify-center font-bold text-xs">
                  <Ban aria-hidden="true" className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-danger text-sm">
                  Cancelar Solicitud {cancellingTutoring.code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancellingTutoring(null)}
                aria-label="Cerrar diálogo de cancelación"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">{cancellingTutoring.subject}</div>
                <div className="text-slate-600">Docente: Prof. {cancellingTutoring.teacherName}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1.5">
                  Motivo de Cancelación (Obligatorio)
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                  minLength={5}
                  placeholder="Motivo de la cancelación"
                  className="w-full rounded-xl border border-stone-200 p-3 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-danger/30 focus:border-danger transition-colors"
                />
              </div>

              {cancelError && (
                <div role="alert" className="p-3.5 bg-danger-soft border border-danger-border text-danger rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle aria-hidden="true" className="w-4 h-4 text-danger shrink-0" />
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
                  className="h-10 px-5 bg-gradient-to-b from-danger to-rose-800 hover:from-rose-800 hover:to-rose-900 text-white rounded-xl font-bold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {cancelling ? 'Cancelando…' : 'Confirmar Cancelación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedDetailTutoring && (
        <StudentTutoringDetailModal
          tutoring={selectedDetailTutoring}
          currentUser={currentUser}
          onClose={() => setSelectedDetailTutoring(null)}
          onOpenEvaluation={onOpenEvaluation}
        />
      )}

      {/* ATTACHMENT VIEWER MODAL */}
      {viewingAttachment && (
        <AttachmentViewerModal
          fileName={viewingAttachment.fileName}
          fileUrl={viewingAttachment.fileUrl}
          onClose={() => setViewingAttachment(null)}
        />
      )}

      {photoToCrop && (
        <ProfilePhotoCropModal
          file={photoToCrop}
          onCancel={() => setPhotoToCrop(null)}
          onCrop={(croppedFile) => {
            setPhotoToCrop(null);
            void handlePhotoUploadFile(croppedFile);
          }}
        />
      )}
    </div>
  );
};
