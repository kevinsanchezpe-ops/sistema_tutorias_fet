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
  CheckCircle2
} from 'lucide-react';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import { TutoringCalendarView } from './TutoringCalendarView';
import { TutoringDetailModal } from './TutoringDetailModal';
import { UserAvatar } from './UserAvatar';

// Client-side image compression utility
function compressProfileImage(file: File, maxWidth = 360, maxHeight = 360, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
}

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
  const [selectedCourseId, setSelectedCourseId] = useState<string>(() => coursePool[0]?.id || '');
  const [modality, setModality] = useState<TutoringModality>(TutoringModality.VIRTUAL);

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
  const [photoSuccessMsg, setPhotoSuccessMsg] = useState<string | null>(null);
  const [photoErrorMsg, setPhotoErrorMsg] = useState<string | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement | null>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoErrorMsg('Por favor seleccione un archivo de imagen válido (.jpg, .png, .webp).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setPhotoErrorMsg('La imagen no debe superar los 8MB.');
      return;
    }

    setPhotoUploading(true);
    setPhotoErrorMsg(null);
    setPhotoSuccessMsg(null);

    try {
      const compressedBase64 = await compressProfileImage(file, 400, 400, 0.88);
      const res = await ApiClient.updateUserProfile(currentUser.id, { photoUrl: compressedBase64 }, currentUser);
      if (res.success) {
        setPhotoSuccessMsg('¡Foto de perfil actualizada exitosamente! Ahora es visible para tus docentes.');
        onRefresh();
        setTimeout(() => setPhotoSuccessMsg(null), 4500);
      } else {
        setPhotoErrorMsg(res.error?.message || 'Error al actualizar la foto de perfil.');
      }
    } catch (err: any) {
      setPhotoErrorMsg(err.message || 'Error al procesar la imagen seleccionada.');
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
    setPhotoErrorMsg(null);
    setPhotoSuccessMsg(null);
    try {
      const res = await ApiClient.updateUserProfile(currentUser.id, { photoUrl: '' }, currentUser);
      if (res.success) {
        setPhotoSuccessMsg('Foto de perfil eliminada correctamente.');
        onRefresh();
        setTimeout(() => setPhotoSuccessMsg(null), 4000);
      } else {
        setPhotoErrorMsg(res.error?.message || 'Error al eliminar la foto.');
      }
    } catch (err: any) {
      setPhotoErrorMsg(err.message || 'Error al eliminar la foto.');
    } finally {
      setPhotoUploading(false);
    }
  };

  // Available teachers & slots for selected course
  const matchingAvailabilities = availabilities.filter(
    (a) => a.subjectCourseId === selectedCourseId && a.isAvailable
  );

  // Auto-select course if coursePool updates
  React.useEffect(() => {
    if (coursePool.length > 0) {
      const isValid = coursePool.some((s) => s.id === selectedCourseId);
      if (!isValid) {
        handleCourseChange(coursePool[0].id);
      }
    } else {
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
      <aside className="w-full lg:w-72 xl:w-80 shrink-0 bg-white rounded-2xl border border-stone-200/90 shadow-xs p-5 space-y-6">
        {/* Student Profile Card */}
        <div className="p-4 bg-gradient-to-b from-[#fffaed] to-[#fbf7ee] border border-stone-200/90 rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center gap-3">
            <UserAvatar
              user={currentUser}
              size="lg"
              className="border border-[#bce6bc]/60 shadow-xs"
            />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-slate-900 text-sm leading-snug truncate">
                {currentUser.fullName}
              </div>
              <div className="text-[11px] text-stone-500 font-medium truncate mt-0.5">
                {currentUser.email}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-200/80 flex flex-wrap gap-2 text-[11px]">
            <span className="font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-stone-200 font-mono shadow-2xs">
              ID: {currentUser.account || currentUser.username}
            </span>
            <span className="font-bold text-[#11770e] bg-[#eaf8ea] px-2.5 py-1 rounded-lg border border-[#bce6bc]/60 shadow-2xs truncate max-w-full">
              {currentUser.careerName}
              {currentUser.semester ? ` • Sem. ${currentUser.semester}` : ''}
            </span>
          </div>
        </div>

        {/* Sidebar Nav Buttons */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase font-bold text-stone-400 px-3 mb-2 tracking-wider">
            Portal Estudiantil
          </div>

          <nav className="space-y-1.5">
            <button
              id="tab-student-requests"
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-[#11770e] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-[#eaf8ea] hover:text-[#11770e]'
              }`}
            >
              <div className="flex items-center gap-3">
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>Solicitar Tutoría</span>
              </div>
            </button>

            <button
              id="tab-student-peers"
              type="button"
              onClick={() => setActiveTab('peers')}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'peers'
                  ? 'bg-[#11770e] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-[#eaf8ea] hover:text-[#11770e]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 shrink-0" />
                <span>Tutorías Disponibles</span>
              </div>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'peers'
                    ? 'bg-white text-[#11770e]'
                    : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                {peerUpcomingTutorings.length}
              </span>
            </button>

            <button
              id="tab-student-history"
              type="button"
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#11770e] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-[#eaf8ea] hover:text-[#11770e]'
              }`}
            >
              <div className="flex items-center gap-3">
                <History className="w-4 h-4 shrink-0" />
                <span>Mis Tutorías e Historial</span>
              </div>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'history'
                    ? 'bg-white text-[#11770e]'
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
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-[#11770e] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-[#eaf8ea] hover:text-[#11770e]'
              }`}
            >
              <div className="flex items-center gap-3">
                <UserCheck className="w-4 h-4 shrink-0" />
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
          <div className="p-4 bg-[#eaf8ea] border border-[#bce6bc] text-[#11770e] rounded-2xl text-xs flex items-center gap-2 font-bold animate-in fade-in">
            <Check className="w-4 h-4 text-[#11770e] shrink-0" />
            <span>{cancelSuccess}</span>
          </div>
        )}

        {/* TAB 1: SOLICITAR TUTORÍA */}
        {activeTab === 'requests' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Solicitar Nueva Tutoría Académica
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Seleccione la asignatura, el docente y la franja horaria para recibir asesoría personalizada.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] bg-[#eaf8ea] text-[#11770e] font-bold px-3 py-1 rounded-xl border border-[#bce6bc]/60">
                    Regla: +2 días de anticipación
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmitRequest} className="space-y-5 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Asignatura */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-800">
                      1. Asignatura a Consultar <span className="text-rose-600">*</span>
                    </label>
                    <select
                      id="select-tutoring-course"
                      value={selectedCourseId}
                      onChange={(e) => handleCourseChange(e.target.value)}
                      required
                      className="w-full h-10 rounded-xl border border-stone-200 px-3 text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] transition-all cursor-pointer shadow-2xs"
                    >
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
                    <label className="block font-bold text-slate-800">
                      2. Docente y Franja Horaria <span className="text-rose-600">*</span>
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
                      className="w-full h-10 rounded-xl border border-stone-200 px-3 text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] transition-all cursor-pointer shadow-2xs disabled:bg-stone-100 disabled:text-stone-400"
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
                    <label className="block font-bold text-slate-800">
                      3. Modalidad de la Sesión <span className="text-rose-600">*</span>
                    </label>
                    <select
                      id="select-tutoring-modality"
                      value={modality}
                      onChange={(e) => setModality(Number(e.target.value) as TutoringModality)}
                      className="w-full h-10 rounded-xl border border-stone-200 px-3 text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] transition-all cursor-pointer shadow-2xs"
                    >
                      <option value={TutoringModality.VIRTUAL}>Virtual (Google Meet / Enlace en vivo)</option>
                      <option value={TutoringModality.PRESENCIAL}>Presencial (Aula / Laboratorio institucional)</option>
                    </select>
                  </div>

                  {/* Fecha de Reserva */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-800">
                      4. Fecha de Reserva <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="input-tutoring-date"
                      type="date"
                      min={getMinDate()}
                      value={reservDate}
                      onChange={(e) => setReservDate(e.target.value)}
                      required
                      className="w-full h-10 rounded-xl border border-stone-200 px-3 text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* Tema / Asunto */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-800">
                    5. Tema o Asunto Principal <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="input-tutoring-subject"
                    type="text"
                    value={subjectTitle}
                    onChange={(e) => setSubjectTitle(e.target.value)}
                    placeholder="Tema principal de la tutoría"
                    maxLength={70}
                    required
                    className="w-full h-10 rounded-xl border border-stone-200 px-3.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] transition-all shadow-2xs"
                  />
                </div>

                {/* Descripción y Dudas */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-800">
                    6. Descripción Específica de las Dudas o Ejercicios <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    id="input-tutoring-details"
                    rows={3}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Descripción de dudas o ejercicios a repasar"
                    required
                    className="w-full rounded-xl border border-stone-200 p-3 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] transition-all shadow-2xs"
                  />
                </div>

                {/* Material de Apoyo (Adjunto) */}
                <div className="space-y-2">
                  <label className="block font-bold text-slate-800">
                    7. Material de Apoyo (Opcional: PDF, DOCX, Imágenes hasta 8 MB)
                  </label>
                  <div className="flex items-center gap-3">
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
                      className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#eaf8ea] file:text-[#11770e] hover:file:bg-[#dcfce4] cursor-pointer"
                    />
                  </div>

                  {attachmentName && (
                    <div className="flex items-center gap-2.5 text-xs text-[#11770e] font-bold bg-[#eaf8ea] border border-[#bce6bc] px-3.5 py-2 rounded-xl w-fit shadow-2xs">
                      <Paperclip className="w-4 h-4 shrink-0" />
                      <span className="truncate max-w-sm">{attachmentName}</span>
                      {isReadingFile && (
                        <span className="text-[10px] text-amber-700 animate-pulse">(Cargando...)</span>
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
                        className="text-rose-600 hover:text-rose-800 ml-1 p-0.5 rounded cursor-pointer"
                        title="Quitar archivo adjunto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {submitError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{submitError}</span>
                  </div>
                )}

                {submitSuccess && (
                  <div className="p-3.5 bg-[#eaf8ea] border border-[#bce6bc] text-[#11770e] rounded-xl text-xs flex items-center gap-2 font-bold">
                    <Check className="w-4 h-4 shrink-0 text-[#11770e]" />
                    <span>{submitSuccess}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    id="btn-submit-tutoring-request"
                    type="submit"
                    disabled={submitting || isReadingFile || matchingAvailabilities.length === 0}
                    className="h-11 px-6 rounded-xl bg-[#11770e] hover:bg-[#0d5c0b] text-white font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {submitting
                        ? 'Enviando solicitud...'
                        : isReadingFile
                        ? 'Procesando archivo adjunto...'
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
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Tutorías Grupales Disponibles
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Únase a tutorías solicitadas por compañeros de su carrera para estudiar en grupo.
                  </p>
                </div>
                <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl border border-indigo-200/60 w-fit">
                  {peerUpcomingTutorings.length} disponibles
                </span>
              </div>

              {peerUpcomingTutorings.length === 0 ? (
                <div className="text-center py-16 text-stone-400">
                  <Users className="w-10 h-10 text-stone-300 mx-auto mb-2.5" />
                  <p className="font-bold text-slate-700 text-sm">No hay tutorías de compañeros pendientes</p>
                  <p className="text-xs text-stone-500 mt-1">Cuando sus compañeros agenden sesiones públicas, aparecerán aquí para unirse.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {peerUpcomingTutorings.map((tut) => {
                    const dt = formatTutoringDateTime(tut.reservDate, tut.scheduleLabel, tut.reservTime);
                    return (
                      <div
                        key={tut.id}
                        className="p-5 rounded-2xl border border-stone-200 bg-white hover:border-[#11770e]/50 hover:shadow-xs transition-all space-y-3"
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
                            <GraduationCap className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span><strong>Docente:</strong> Prof. {tut.teacherName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span><strong>Solicitante:</strong> {tut.petitionerStudentName} ({(tut.assistants || []).length} participantes)</span>
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            id={`btn-view-peer-tutoring-${tut.id}`}
                            onClick={() => setSelectedDetailTutoring(tut)}
                            className="h-9 px-4 rounded-xl bg-white text-slate-700 hover:bg-stone-100 border border-stone-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Ver detalle antes de unirme"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Ver Detalle</span>
                          </button>
                          <button
                            type="button"
                            id={`btn-join-tutoring-${tut.id}`}
                            onClick={() => handleJoin(tut.id)}
                            className="h-9 px-4 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Unirme a esta Tutoría</span>
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

        {/* TAB 3: MIS TUTORÍAS E HISTORIAL */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Mis Tutorías e Historial
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Consulte el estado de sus solicitudes, acceda a enlaces de sesión y califique sus tutorías finalizadas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar materia, tema, código..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="h-10 pl-9 pr-3 text-xs rounded-xl border border-stone-200 bg-white text-slate-800 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] transition-all w-full sm:w-56"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="h-10 text-xs rounded-xl border border-stone-200 bg-white px-3.5 text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e] transition-all cursor-pointer shadow-2xs"
                >
                  <option value="all">Todos los estados ({myRequestedTutorings.length})</option>
                  <option value={TutoringStatus.PENDING}>Pendientes</option>
                  <option value={TutoringStatus.APPROVED}>Aprobadas</option>
                  <option value={TutoringStatus.IN_PROGRESS}>En Curso</option>
                  <option value={TutoringStatus.COMPLETED}>Finalizadas</option>
                  <option value={TutoringStatus.CANCELLED}>Canceladas</option>
                </select>

                {/* View Switcher */}
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
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                  <div className="px-5 py-4 bg-[#fafaf7] border-b border-stone-200 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Tutorías Solicitadas por Mí ({myRequestedTutorings.length})
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#fafaf7] text-stone-600 font-bold uppercase tracking-wider border-b border-stone-200 text-[11px]">
                        <tr>
                          <th className="px-4 py-3.5 w-16 text-center">Código</th>
                          <th className="px-4 py-3.5 min-w-[170px]">Asignatura / Tema</th>
                          <th className="px-4 py-3.5 min-w-[150px]">Fecha y Horario</th>
                          <th className="px-4 py-3.5 min-w-[140px]">Docente</th>
                          <th className="px-4 py-3.5 min-w-[140px]">Espacio / Enlace</th>
                          <th className="px-4 py-3.5 w-28 text-center">Estado</th>
                          <th className="px-4 py-3.5 w-36 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filteredRequestedTutorings.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-16 text-stone-400">
                              <BookOpen className="w-10 h-10 text-stone-300 mx-auto mb-2.5" />
                              <p className="font-bold text-slate-700 text-sm">No hay tutorías solicitadas</p>
                              <p className="text-xs text-stone-500 mt-1">Cree una solicitud desde la pestaña "Solicitar Tutoría".</p>
                            </td>
                          </tr>
                        ) : (
                          filteredRequestedTutorings.map((tut) => {
                            const dt = formatTutoringDateTime(tut.reservDate, tut.scheduleLabel, tut.reservTime);
                            return (
                              <tr key={tut.id} className="transition-colors hover:bg-[#fafaf7] group">
                                {/* Código */}
                                <td className="px-4 py-3.5 text-center align-middle">
                                  <span className="inline-block font-mono font-black text-xs text-[#11770e] bg-[#eaf8ea] px-2 py-1 rounded-lg border border-[#bce6bc]/70 shadow-2xs">
                                    {tut.code}
                                  </span>
                                </td>

                                {/* Asignatura y Tema */}
                                <td className="px-4 py-3.5 align-middle">
                                  <div className="font-bold text-slate-900 text-xs sm:text-sm" title={tut.subject}>
                                    {tut.subject}
                                  </div>
                                  <div className="text-[11px] text-stone-500 font-medium mt-0.5">
                                    {tut.subjectCourseName}
                                  </div>
                                </td>

                                {/* Fecha y Horario */}
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

                                {/* Docente */}
                                <td className="px-4 py-3.5 align-middle">
                                  <div className="font-bold text-slate-900 text-xs">
                                    Prof. {tut.teacherName}
                                  </div>
                                </td>

                                {/* Espacio / Enlace */}
                                <td className="px-4 py-3.5 align-middle">
                                  {tut.space && tut.space.startsWith('http') ? (
                                    <a
                                      href={tut.space}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-[#11770e] font-bold underline text-xs"
                                    >
                                      <span>Abrir Meet</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : (
                                    <span className="text-slate-700 text-xs font-medium">
                                      {tut.space || 'Por asignar'}
                                    </span>
                                  )}
                                </td>

                                {/* Estado */}
                                <td className="px-4 py-3.5 text-center align-middle">
                                  <div className="inline-flex justify-center">
                                    <StatusBadge status={tut.status} size="sm" />
                                  </div>
                                </td>

                                {/* Acciones */}
                                <td className="px-4 py-3.5 text-right align-middle">
                                  <div className="flex items-center justify-end gap-2">
                                    {(() => {
                                      const myRating = (tut.ratings || []).find((r) => r.studentId === currentUser.id);
                                      return (
                                        <>
                                          {/* Botón Calificar si completó y aún no califiqué */}
                                          {tut.status === TutoringStatus.COMPLETED && !myRating && (
                                            <button
                                              type="button"
                                              onClick={() => onOpenEvaluation(tut)}
                                              className="h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                                            >
                                              <Star className="w-3 h-3 fill-white" />
                                              <span>Calificar</span>
                                            </button>
                                          )}

                                          {/* Mi puntuación si ya evalué */}
                                          {tut.status === TutoringStatus.COMPLETED && myRating && (
                                            <span
                                              className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg text-xs font-bold"
                                              title={myRating.studentComment || ''}
                                            >
                                              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                              {myRating.score}★
                                            </span>
                                          )}
                                        </>
                                      );
                                    })()}

                                    {/* Botón Cancelar si está pendiente */}
                                    {tut.status === TutoringStatus.PENDING && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCancellingTutoring(tut);
                                          setCancelReason('');
                                          setCancelError(null);
                                        }}
                                        className="h-8 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                                      >
                                        Cancelar
                                      </button>
                                    )}

                                    {/* Botón Detalle */}
                                    <button
                                      type="button"
                                      onClick={() => setSelectedDetailTutoring(tut)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs bg-[#eaf8ea] text-[#11770e] hover:bg-[#11770e] hover:text-white border border-[#bce6bc]/70 hover:border-[#11770e] transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                                    >
                                      <span>Detalle</span>
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tutorías como Invitado */}
                {myGuestTutorings.length > 0 && (
                  <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                    <div className="px-5 py-4 bg-[#fafaf7] border-b border-stone-200">
                      <h3 className="font-bold text-slate-900 text-sm">
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
                            className="p-4 rounded-xl border border-stone-200 bg-white hover:border-[#11770e]/40 space-y-2 text-xs"
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
                                      className="mt-1 h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-2xs flex items-center gap-1 transition-colors cursor-pointer w-fit"
                                    >
                                      <Star className="w-3 h-3 fill-white" />
                                      <span>Calificar</span>
                                    </button>
                                  )}
                                  {g.status === TutoringStatus.COMPLETED && myRating && (
                                    <span
                                      className="mt-1 inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg text-xs font-bold w-fit"
                                      title={myRating.studentComment || ''}
                                    >
                                      <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                      Mi calificación: {myRating.score}★
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                            <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                              <span className="text-stone-500">
                                {g.space && g.space.startsWith('http') ? (
                                  <a href={g.space} target="_blank" rel="noreferrer" className="text-[#11770e] font-bold underline">
                                    Abrir Meet
                                  </a>
                                ) : (
                                  g.space || 'Presencial'
                                )}
                              </span>
                              <span className={`font-bold ${myAssistantRecord?.hasAttended ? 'text-[#11770e]' : 'text-stone-500'}`}>
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
          <div className="space-y-6 animate-in fade-in duration-200">
            {photoSuccessMsg && (
              <div className="p-4 bg-[#eaf8ea] border border-[#bce6bc] text-[#11770e] rounded-2xl text-xs flex items-center gap-2.5 font-bold animate-in slide-in-from-top-2 shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-[#11770e] shrink-0" />
                <span>{photoSuccessMsg}</span>
              </div>
            )}

            {photoErrorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2.5 font-bold animate-in slide-in-from-top-2 shadow-xs">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{photoErrorMsg}</span>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6 space-y-6 max-w-3xl">
              {/* Profile Header & Photo Uploader */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-stone-100">
                <div className="relative group shrink-0">
                  <UserAvatar
                    user={currentUser}
                    size="2xl"
                    className="border-2 border-[#bce6bc] shadow-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoUploading}
                    className="absolute -bottom-1 -right-1 p-2 bg-[#11770e] hover:bg-[#0d5c0b] text-white rounded-xl shadow-md cursor-pointer transition-all border-2 border-white hover:scale-105 disabled:opacity-50"
                    title="Subir o cambiar foto de perfil"
                    aria-label="Cambiar foto de perfil"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>

                <div className="space-y-2 flex-1 min-w-0">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 leading-snug">{currentUser.fullName}</h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Estudiante Activo • Usuario: <span className="font-mono text-slate-700 font-bold">@{currentUser.username}</span> • Rol: Estudiante FET
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading}
                      className="h-9 px-4 bg-[#11770e] hover:bg-[#0d5c0b] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {photoUploading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Guardando foto...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>{currentUser.photoUrl ? 'Cambiar Foto' : 'Subir Foto de Perfil'}</span>
                        </>
                      )}
                    </button>

                    {currentUser.photoUrl && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        disabled={photoUploading}
                        className="h-9 px-3.5 bg-white hover:bg-rose-50 border border-stone-200 hover:border-rose-200 text-stone-700 hover:text-rose-700 rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quitar Foto</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-stone-400 leading-tight pt-0.5">
                    Formatos JPG, PNG, WEBP. Tu foto de perfil se guardará y será visible para los docentes y administradores.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-[#fafaf7] rounded-xl border border-stone-200/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Número de Cuenta / Matrícula</span>
                  <span className="font-bold text-slate-900 text-sm font-mono">{currentUser.account || 'N/A'}</span>
                </div>

                <div className="p-4 bg-[#fafaf7] rounded-xl border border-stone-200/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Programa Académico / Carrera</span>
                  <span className="font-bold text-slate-900 text-sm">{currentUser.careerName || 'No asignada'}</span>
                </div>

                <div className="p-4 bg-[#fafaf7] rounded-xl border border-stone-200/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Semestre Vigente</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {currentUser.semester ? `Semestre ${currentUser.semester}` : 'Por definir'}
                  </span>
                </div>

                <div className="p-4 bg-[#fafaf7] rounded-xl border border-stone-200/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Sede / Campus</span>
                  <span className="font-bold text-slate-900 text-sm">{currentUser.campusName || 'Campus Principal'}</span>
                </div>

                <div className="p-4 bg-[#fafaf7] rounded-xl border border-stone-200/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Correo Institucional</span>
                  <span className="font-bold text-slate-900 text-sm">{currentUser.email}</span>
                </div>

                <div className="p-4 bg-[#fafaf7] rounded-xl border border-stone-200/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Teléfono de Contacto</span>
                  <span className="font-bold text-slate-900 text-sm">{currentUser.phone || 'No registrado'}</span>
                </div>

                <div className="p-4 bg-[#fafaf7] rounded-xl border border-stone-200/80 space-y-1 sm:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Fecha de Admisión / Ingreso</span>
                  <span className="font-bold text-slate-900 text-sm">{currentUser.admissionDate || '2026-01-15'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: CANCEL TUTORING */}
      {cancellingTutoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                  <Ban className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-rose-950 text-sm">
                  Cancelar Solicitud {cancellingTutoring.code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancellingTutoring(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
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
                  {cancelling ? 'Cancelando...' : 'Confirmar Cancelación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedDetailTutoring && (
        <TutoringDetailModal
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
    </div>
  );
};
