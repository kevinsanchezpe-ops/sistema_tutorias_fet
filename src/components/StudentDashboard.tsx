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
  List
} from 'lucide-react';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import { TutoringCalendarView } from './TutoringCalendarView';
import { TutoringDetailModal } from './TutoringDetailModal';

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
  const [activeTab, setActiveTab] = useState<'requests' | 'history' | 'profile'>('requests');

  // Asignaturas visibles para el estudiante: de su carrera y de su semestre
  const coursePool = subjects.filter(
    (s) =>
      s.careerId === currentUser.careerId &&
      (!currentUser.semester || !s.semester || s.semester === currentUser.semester)
  );

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
  const [selectedCalendarTutoring, setSelectedCalendarTutoring] = useState<Tutoring | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Available teachers & slots for selected course
  const matchingAvailabilities = availabilities.filter(
    (a) => a.subjectCourseId === selectedCourseId && a.isAvailable
  );

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
      setSubmitError('Debe seleccionar un docente y un horario disponible.');
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

  // Cancel own pending tutoring
  const handleCancelOwn = async (tutoringId: string) => {
    const reason = prompt('Ingrese el motivo por el cual cancela su solicitud de tutoría:');
    if (!reason) return;
    const res = await ApiClient.cancelTutoring(tutoringId, reason, currentUser);
    if (res.success) {
      onRefresh();
    } else {
      alert(res.error?.message || 'No fue posible cancelar la tutoría.');
    }
  };

  // Filtered data
  const myRequestedTutorings = tutorings.filter((t) => t.petitionerStudentId === currentUser.id);
  const myGuestTutorings = tutorings.filter(
    (t) =>
      t.petitionerStudentId !== currentUser.id &&
      t.assistants.some((a) => a.studentId === currentUser.id)
  );

  // Upcoming tutorings from peers that student can join
  const peerUpcomingTutorings = tutorings.filter(
    (t) =>
      t.petitionerStudentId !== currentUser.id &&
      (t.status === TutoringStatus.PENDING || t.status === TutoringStatus.APPROVED) &&
      !t.assistants.some((a) => a.studentId === currentUser.id)
  );

  return (
    <div className="space-y-6">
      {/* Navigation tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          id="tab-student-requests"
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'requests'
              ? 'bg-[#11770e] text-white shadow-xs'
              : 'text-stone-600 hover:bg-[#eaf8ea] hover:text-[#11770e]'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          Nueva Solicitud y Próximas
        </button>

        <button
          id="tab-student-history"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#11770e] text-white shadow-xs'
              : 'text-stone-600 hover:bg-[#eaf8ea] hover:text-[#11770e]'
          }`}
        >
          <History className="w-4 h-4" />
          Mi Historial y Evaluaciones ({myRequestedTutorings.length})
        </button>

        <button
          id="tab-student-profile"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-[#11770e] text-white shadow-xs'
              : 'text-stone-600 hover:bg-[#eaf8ea] hover:text-[#11770e]'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Ficha Estudiantil
        </button>
      </div>

      {/* TAB 1: REQUESTS & PEER FEED */}
      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form (5 cols) */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-4 bg-[#fffaed]/70 border-b border-stone-200 flex items-center justify-between">
                <h3 className="font-semibold text-stone-800 flex items-center gap-2 text-sm">
                  <Send className="w-4 h-4 text-[#11770e]" />
                  Nueva Solicitud de Tutoría
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] bg-[#eaf8ea] text-[#11770e] font-semibold px-2 py-0.5 rounded-md border border-[#bce6bc]/60">
                    Regla: +2 días anticipación
                  </span>
                  <span className="text-[11px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-md border border-indigo-200/60">
                    {currentUser.careerName}
                    {currentUser.semester ? ` • Semestre ${currentUser.semester}` : ''}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmitRequest} className="p-5 space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tema o Asunto Principal
                  </label>
                  <input
                    id="input-tutoring-subject"
                    type="text"
                    value={subjectTitle}
                    onChange={(e) => setSubjectTitle(e.target.value)}
                    placeholder="Ej. Polimorfismo, Recursividad, Normalización SQL..."
                    maxLength={50}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-[#11770e] focus:border-[#11770e]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Asignatura
                    </label>
                    <select
                      id="select-tutoring-course"
                      value={selectedCourseId}
                      onChange={(e) => handleCourseChange(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-[#11770e]"
                    >
                      {coursePool.length === 0 && (
                        <option value="">Sin asignaturas para tu semestre</option>
                      )}
                      {coursePool.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.semester ? ` (Semestre ${s.semester})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Modalidad
                    </label>
                    <select
                      id="select-tutoring-modality"
                      value={modality}
                      onChange={(e) => setModality(Number(e.target.value) as TutoringModality)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-[#11770e]"
                    >
                      <option value={TutoringModality.VIRTUAL}>Virtual (Enlace de sesión)</option>
                      <option value={TutoringModality.PRESENCIAL}>Presencial (Aula física)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Docente y Franja Horaria
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
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-[#11770e]"
                    >
                      <option value="">Seleccione horario</option>
                      {matchingAvailabilities.map((a) => (
                        <option key={a.id} value={`${a.teacherId}|${a.scheduleSlotId}`}>
                          {a.teacherName} ({a.scheduleLabel})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Fecha de Reserva
                    </label>
                    <input
                      id="input-tutoring-date"
                      type="date"
                      min={getMinDate()}
                      value={reservDate}
                      onChange={(e) => setReservDate(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-[#11770e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Explicación o Detalles de la Duda
                  </label>
                  <textarea
                    id="input-tutoring-details"
                    rows={2}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Explique detalladamente los temas o ejercicios específicos que desea repasar..."
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-[#11770e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Adjunto (Opcional: PDF, DOC, Imagen)
                  </label>
                  <div className="flex items-center gap-2">
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
                      className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#eaf8ea] file:text-[#11770e] hover:file:bg-[#dcfce4] cursor-pointer"
                    />
                  </div>
                  {attachmentName && (
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-[#11770e] font-medium bg-[#eaf8ea]/80 border border-[#bce6bc] px-2.5 py-1 rounded-md w-fit">
                      <Paperclip className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-xs">{attachmentName}</span>
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
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {submitError && (
                  <div id="alert-request-error" className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    {submitError}
                  </div>
                )}

                {submitSuccess && (
                  <div id="alert-request-success" className="p-3 bg-[#eaf8ea] border border-[#bce6bc] text-[#11770e] rounded-lg text-xs flex items-center gap-2 font-semibold">
                    <Check className="w-4 h-4 shrink-0 text-[#11770e]" />
                    {submitSuccess}
                  </div>
                )}

                <button
                  id="btn-submit-tutoring-request"
                  type="submit"
                  disabled={submitting || isReadingFile}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#11770e] hover:bg-[#0d5c0b] text-white font-medium shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Enviando solicitud...' : isReadingFile ? 'Procesando archivo adjunto...' : 'Enviar Solicitud de Tutoría'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Peer Tutorings to Join (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="px-5 py-4 bg-[#fffaed]/70 border-b border-stone-200 flex items-center justify-between">
                <h3 className="font-semibold text-stone-800 flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-[#11770e]" />
                  Próximas Tutorías de mis Compañeros
                </h3>
                <span className="text-xs text-slate-500">
                  {peerUpcomingTutorings.length} disponibles para unirse
                </span>
              </div>

              <div className="p-5">
                {peerUpcomingTutorings.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    No hay otras tutorías programadas pendientes en este momento.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {peerUpcomingTutorings.map((tut) => (
                      <div
                        key={tut.id}
                        className="p-4 rounded-lg border border-slate-200 hover:border-indigo-300 transition-all bg-white hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{tut.subject}</span>
                            <StatusBadge status={tut.status} size="sm" />
                          </div>
                          <div className="text-xs text-slate-600">
                            Asignatura: <span className="font-medium text-slate-800">{tut.subjectCourseName}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {tut.reservDate}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {tut.scheduleLabel}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {tut.assistants.length} participantes
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Solicitante: {tut.petitionerStudentName} | Docente: {tut.teacherName}
                          </div>
                        </div>

                        <button
                          id={`btn-join-tutoring-${tut.id}`}
                          onClick={() => handleJoin(tut.id)}
                          className="shrink-0 px-3.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Users className="w-3.5 h-3.5" />
                          Unirme
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Helper Box */}
            <div className="bg-[#fffaed] rounded-xl border border-[#bce6bc] p-4 text-xs text-stone-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-[#11770e]">
                <Info className="w-4 h-4 text-[#11770e]" />
                Reglas del Sistema de Tutorías (Original GT):
              </div>
              <p>
                • <strong>Anticipación:</strong> Las solicitudes deben ingresarse como mínimo con 2 días de anticipación para que el docente o administrador confirme el espacio.
              </p>
              <p>
                • <strong>Evaluación:</strong> Una vez finalizada la sesión por el docente, usted podrá otorgar entre 1 y 5 estrellas y dejar un comentario en la pestaña "Mi Historial".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HISTORY & EVALUATIONS */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold text-slate-800 text-sm">
                Tutorías Solicitadas por Mí ({myRequestedTutorings.length})
              </h3>

              <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDisplayMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    displayMode === 'list'
                      ? 'bg-white text-[#11770e] shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Lista ☰</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('calendar')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    displayMode === 'calendar'
                      ? 'bg-white text-[#11770e] shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Calendario 📅</span>
                </button>
              </div>
            </div>

            {displayMode === 'calendar' ? (
              <div className="p-4">
                <TutoringCalendarView
                  tutorings={myRequestedTutorings}
                  currentUser={currentUser}
                  onSelectTutoring={(tut) => setSelectedCalendarTutoring(tut)}
                  onSelectDate={(dateStr) => {
                    setReservDate(dateStr);
                    setActiveTab('request');
                  }}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Asunto y Materia</th>
                      <th className="px-4 py-3">Fecha y Hora</th>
                      <th className="px-4 py-3">Docente</th>
                      <th className="px-4 py-3">Espacio / Enlace</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acción / Evaluación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myRequestedTutorings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400">
                          No ha solicitado tutorías aún.
                        </td>
                      </tr>
                    ) : (
                      myRequestedTutorings.map((tut) => (
                        <tr key={tut.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3.5 font-bold text-[#11770e]">{tut.code}</td>
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-800">{tut.subject}</div>
                            <div className="text-[11px] text-slate-500">{tut.subjectCourseName}</div>
                            {tut.attachmentUrl ? (
                              <button
                                type="button"
                                onClick={() => setViewingAttachment({ fileName: tut.attachmentName || 'Archivo adjunto', fileUrl: tut.attachmentUrl! })}
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#11770e] hover:text-[#0d5c0b] hover:underline bg-[#eaf8ea] px-2 py-0.5 rounded cursor-pointer transition-colors"
                                title="Ver archivo adjunto en segundo plano"
                              >
                                <Paperclip className="w-3 h-3" />
                                <span className="truncate max-w-[150px]">{tut.attachmentName || 'Ver adjunto'}</span>
                              </button>
                            ) : tut.attachmentName ? (
                              <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                <Paperclip className="w-3 h-3" />
                                <span className="truncate max-w-[150px]">{tut.attachmentName}</span>
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">
                            <div>{tut.reservDate}</div>
                            <div className="text-[11px] text-slate-400">{tut.scheduleLabel}</div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-700 font-medium">{tut.teacherName}</td>
                          <td className="px-4 py-3.5 max-w-[200px] truncate text-slate-600">
                            {tut.space.startsWith('http') ? (
                              <a
                                href={tut.space}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#11770e] hover:underline font-semibold"
                              >
                                Abrir enlace virtual
                              </a>
                            ) : (
                              tut.space
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={tut.status} size="sm" />
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {/* If status is completed and not evaluated yet */}
                            {tut.status === TutoringStatus.COMPLETED && tut.score === 0 && (
                              <button
                                id={`btn-evaluate-tutoring-${tut.id}`}
                                onClick={() => onOpenEvaluation(tut)}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-semibold text-xs transition-colors flex items-center gap-1 ml-auto shadow-2xs"
                              >
                                <Star className="w-3.5 h-3.5 fill-white" />
                                Calificar Tutoría
                              </button>
                            )}

                            {/* If already evaluated */}
                            {tut.status === TutoringStatus.COMPLETED && tut.score > 0 && (
                              <div className="flex items-center justify-end gap-1 text-amber-600 font-bold">
                                <span>{tut.score}★</span>
                                <span className="text-[11px] text-slate-400 font-normal">Evaluada</span>
                              </div>
                            )}

                            {/* If pending, allows cancellation */}
                            {tut.status === TutoringStatus.PENDING && (
                              <button
                                id={`btn-cancel-tutoring-${tut.id}`}
                                onClick={() => handleCancelOwn(tut.id)}
                                className="text-rose-600 hover:text-rose-800 font-medium text-xs hover:underline"
                              >
                                Cancelar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Guest Tutorings */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 text-sm">
                Tutorías a las que asisto como Invitado ({myGuestTutorings.length})
              </h3>
            </div>
            <div className="p-4">
              {myGuestTutorings.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No se ha unido a tutorías de otros compañeros.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {myGuestTutorings.map((g) => {
                    const myAssistantRecord = g.assistants.find((a) => a.studentId === currentUser.id);
                    return (
                      <div key={g.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{g.subject}</span>
                          <StatusBadge status={g.status} size="sm" />
                        </div>
                        <div className="text-slate-600">Docente: {g.teacherName} | Materia: {g.subjectCourseName}</div>
                        <div className="text-slate-500">Fecha: {g.reservDate} ({g.scheduleLabel})</div>
                        <div className="pt-1 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Ubicación: {g.space}</span>
                          <span className={`font-semibold ${myAssistantRecord?.hasAttended ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {myAssistantRecord?.hasAttended ? '✓ Asistencia confirmada' : '• Asistencia pendiente'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROFILE */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
            <div className="w-16 h-16 rounded-full bg-indigo-100 border-2 border-indigo-600 flex items-center justify-center text-indigo-700 font-bold text-xl">
              {currentUser.fullName.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{currentUser.fullName}</h2>
              <p className="text-xs text-slate-500">Estudiante Registrado • Usuario: @{currentUser.username}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 block">Número de Cuenta:</span>
              <span className="font-semibold text-slate-800 text-sm">{currentUser.account}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 block">Carrera Universitaria:</span>
              <span className="font-semibold text-slate-800 text-sm">{currentUser.careerName}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 block">Semestre Actual:</span>
              <span className="font-semibold text-slate-800 text-sm">
                {currentUser.semester ? `Semestre ${currentUser.semester}` : 'No definido'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 block">Campus Asignado:</span>
              <span className="font-semibold text-slate-800 text-sm">{currentUser.campusName}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 block">Correo Institucional:</span>
              <span className="font-semibold text-slate-800 text-sm">{currentUser.email}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 block">Teléfono de Contacto:</span>
              <span className="font-semibold text-slate-800 text-sm">{currentUser.phone}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 block">Fecha de Ingreso:</span>
              <span className="font-semibold text-slate-800 text-sm">{currentUser.admissionDate}</span>
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
          onOpenEvaluation={onOpenEvaluation}
        />
      )}
    </div>
  );
};
