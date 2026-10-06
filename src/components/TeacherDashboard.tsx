import React, { useState, Fragment } from 'react';
import {
  ScheduleSlot,
  SubjectCourse,
  TeacherAvailability,
  Tutoring,
  TutoringModality,
  TutoringStatus,
  TutoringType,
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
  History,
  PlusCircle
} from 'lucide-react';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import { TutoringCalendarView } from './TutoringCalendarView';
import { TutoringDetailModal } from './TutoringDetailModal';
import { UserAvatar } from './UserAvatar';
import { InstitutionalProfileCard } from './InstitutionalProfileCard';
import { ProfilePhotoCropModal } from './ProfilePhotoCropModal';
import { compressProfileImage } from '../core/utils/image-utils';
import { db } from '../core/infrastructure/database/database';

interface TeacherDashboardProps {
  currentUser: User;
  tutorings: Tutoring[];
  availabilities: TeacherAvailability[];
  schedules: ScheduleSlot[];
  subjects?: SubjectCourse[];
  onRefresh: () => void;
  onTutoringUpdated: (tutoring: Tutoring) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentUser,
  tutorings,
  availabilities,
  schedules,
  subjects = [],
  onRefresh,
  onTutoringUpdated
}) => {
  const [activeTab, setActiveTab] = useState<
    'tutorings' | 'convocations' | 'availability' | 'subjects' | 'evaluations' | 'profile'
  >('tutorings');

  const [selectedTutoringId, setSelectedTutoringId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'list' | 'calendar'>('list');
  const [selectedDetailTutoring, setSelectedDetailTutoring] = useState<Tutoring | null>(null);
  const [tutoringSearch, setTutoringSearch] = useState<string>('');
  const [tutoringStatusFilter, setTutoringStatusFilter] = useState<string>('all');
  const [viewingAttachment, setViewingAttachment] = useState<{ fileName: string; fileUrl: string } | null>(null);
  // Photo Management State for Teacher
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoSuccessMsg, setPhotoSuccessMsg] = useState<string | null>(null);
  const [photoErrorMsg, setPhotoErrorMsg] = useState<string | null>(null);
  const [photoToCrop, setPhotoToCrop] = useState<File | null>(null);

  const handleTeacherPhotoUpload = async (file: File) => {
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
        setPhotoSuccessMsg('¡Foto de perfil actualizada exitosamente!');
        onRefresh();
        setTimeout(() => setPhotoSuccessMsg(null), 4500);
      } else {
        setPhotoErrorMsg(res.error?.message || 'Error al actualizar la foto de perfil.');
      }
    } catch (err: any) {
      setPhotoErrorMsg(err.message || 'Error al procesar la imagen seleccionada.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleTeacherPhotoSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setPhotoErrorMsg('Por favor selecciona un archivo de imagen válido (.jpg, .png, .webp).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoErrorMsg('La imagen no debe superar los 8 MB.');
      return;
    }
    setPhotoErrorMsg(null);
    setPhotoToCrop(file);
  };

  const handleTeacherRemovePhoto = async () => {
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

  // Approval state for teachers
  const [approvingTutoring, setApprovingTutoring] = useState<Tutoring | null>(null);
  const [assignedSpace, setAssignedSpace] = useState<string>('');
  const [assignedBlock, setAssignedBlock] = useState<string>('');
  const [confirmedCapacity, setConfirmedCapacity] = useState<number>(10);
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approvalSuccess, setApprovalSuccess] = useState<string | null>(null);
  const [convocationAvailabilityId, setConvocationAvailabilityId] = useState('');
  const [convocationModality, setConvocationModality] = useState<TutoringModality | ''>('');
  const [convocationTopic, setConvocationTopic] = useState('');
  const [convocationDetails, setConvocationDetails] = useState('');
  const [convocationDate, setConvocationDate] = useState('');
  const [convocationSpace, setConvocationSpace] = useState('');
  const [convocationBlock, setConvocationBlock] = useState('');
  const [convocationCapacity, setConvocationCapacity] = useState(10);
  const [convocationError, setConvocationError] = useState<string | null>(null);
  const [convocationSuccess, setConvocationSuccess] = useState<string | null>(null);
  const [creatingConvocation, setCreatingConvocation] = useState(false);

  const openApproveModal = (tut: Tutoring) => {
    setApprovingTutoring(tut);
    setApprovalError(null);
    setConfirmedCapacity(Math.max(2, Math.min(tut.assistants?.length || 2, 10)));
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

    const res = await ApiClient.approveTutoring(approvingTutoring.id, assignedSpace, currentUser, assignedBlock, confirmedCapacity);
    setApproving(false);

    if (res.success) {
      setApprovingTutoring(null);
      setApprovalSuccess(`¡Tutoría ${approvingTutoring.code} aprobada con éxito!`);
      setTimeout(() => setApprovalSuccess(null), 4000);
      if (res.data) onTutoringUpdated(res.data);
    } else {
      setApprovalError(res.error?.message || 'Error al aprobar la tutoría.');
    }
  };

  const handleCreateConvocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setConvocationError(null);
    const availability = availabilities.find((item) => item.id === convocationAvailabilityId && item.teacherId === currentUser.id && item.isAvailable);
    if (!availability) {
      setConvocationError('Selecciona una franja activa de tu disponibilidad.');
      return;
    }
    if (!convocationModality) {
      setConvocationError('Selecciona la modalidad de la tutoría.');
      return;
    }
    setCreatingConvocation(true);
    const result = await ApiClient.createTutoring({
      subject: convocationTopic,
      details: convocationDetails,
      reservDate: convocationDate,
      scheduleSlotId: availability.scheduleSlotId,
      subjectCourseId: availability.subjectCourseId,
      teacherId: currentUser.id,
      modality: convocationModality,
      type: TutoringType.GROUP,
      space: convocationSpace,
      block: convocationBlock,
      maxParticipants: convocationCapacity
    }, currentUser);
    setCreatingConvocation(false);
    if (!result.success) {
      setConvocationError(result.error?.message || 'No fue posible crear la convocatoria.');
      return;
    }
    setConvocationSuccess('Tutoría grupal aprobada y publicada. Los estudiantes elegibles ya pueden inscribirse.');
    setConvocationTopic('');
    setConvocationDetails('');
    setConvocationDate('');
    if (result.data) onTutoringUpdated(result.data);
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
      if (res.data) onTutoringUpdated(res.data);
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
  const [startingTutoringId, setStartingTutoringId] = useState<string | null>(null);
  const [finishingTutoringId, setFinishingTutoringId] = useState<string | null>(null);
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
    if (startingTutoringId || finishingTutoringId) return;
    setStartingTutoringId(tutoringId);
    setActionError(null);
    try {
      const res = await ApiClient.startTutoring(tutoringId, currentUser);
      if (res.success && res.data) onTutoringUpdated(res.data);
      else setActionError(res.error?.message || 'Error al iniciar tutoría');
    } finally {
      setStartingTutoringId(null);
    }
  };

  const handleFinish = async (tutoringId: string) => {
    if (startingTutoringId || finishingTutoringId) return;
    setFinishingTutoringId(tutoringId);
    setActionError(null);
    try {
      const records = Object.entries(attendanceMap).map(([astId, hasAttended]) => ({
        assistantId: astId,
        hasAttended: Boolean(hasAttended)
      }));
      const res = await ApiClient.finishTutoring(tutoringId, currentUser, teacherComment, records);
      if (res.success) {
        if (res.data) onTutoringUpdated(res.data);
      } else {
        setActionError(res.error?.message || 'Error al finalizar tutoría');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error al finalizar tutoría');
    } finally {
      setFinishingTutoringId(null);
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
        if (res.data) onTutoringUpdated(res.data);
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

  const catalogSemesterGroups = Array.from(
    new Set(subjectsInCareerFiltered.map((subject) => subject.semester || 0))
  )
    .sort((a, b) => a - b)
    .map((semester) => ({
      semester,
      subjects: subjectsInCareerFiltered.filter((subject) => (subject.semester || 0) === semester)
    }));

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
      const newSlotIds = selectedSlotIds.filter((slotId) =>
        schedules.some((slot) => slot.id === slotId) &&
        !myAvailabilities.some((availability) => availability.subjectCourseId === newSubjectId && availability.scheduleSlotId === slotId)
      );
      if (newSlotIds.length > 0) {
        const result = await ApiClient.setTeacherAvailabilityBatch(currentUser, newSubjectId, newSlotIds);
        if (!result.success) throw new Error(result.error?.message || 'Error al registrar franjas.');
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
  const ratingCount = ratedTutorings.reduce((count, tut) => count + (tut.ratings?.length || 1), 0);
  const ratingScoreTotal = ratedTutorings.reduce(
    (total, tut) => total + (tut.ratings?.length ? tut.ratings.reduce((sum, rating) => sum + rating.score, 0) : tut.score),
    0
  );
  const avgScore = ratingCount > 0 ? ratingScoreTotal / ratingCount : 0;
  const writtenFeedbackCount = ratedTutorings.reduce(
    (count, tut) => count + (tut.ratings?.length ? tut.ratings.filter((rating) => Boolean(rating.studentComment?.trim())).length : Number(Boolean(tut.studentComment?.trim()))),
    0
  );

  // El historial conserva los resultados y cancelaciones para consulta y auditoría.
  const completedTutorings = myTutorings.filter((t) => t.status === TutoringStatus.COMPLETED);
  const cancelledTutorings = myTutorings.filter((t) => t.status === TutoringStatus.CANCELLED);
  const historyTutorings = myTutorings.filter(
    (t) => t.status === TutoringStatus.COMPLETED || t.status === TutoringStatus.CANCELLED
  );

  // Las canceladas también salen de asignadas: no son sesiones pendientes de atender.
  const activeTutorings = myTutorings.filter(
    (t) => t.status !== TutoringStatus.COMPLETED && t.status !== TutoringStatus.CANCELLED
  );

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
    <>
    <div className="flex flex-col lg:flex-row gap-6 items-start pb-12">
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-full shrink-0 space-y-4 rounded-xl border border-stone-200 bg-white p-4 shadow-xs lg:w-72 xl:w-80">
        {/* Teacher Profile Card (Referencia UI institucional) */}
        <InstitutionalProfileCard
          user={currentUser}
          variant="sidebar"
          canEditPhoto={true}
          showEmail={false}
          onSelectPhoto={handleTeacherPhotoSelect}
          onRemovePhoto={handleTeacherRemovePhoto}
          isUploadingPhoto={photoUploading}
          className="w-full mb-2"
        />

        {/* Navigation Items */}
        <div className="space-y-2">
          <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">
            Módulos del Docente
          </div>
          <nav className="space-y-1.5">
            <button
              id="tab-teacher-tutorings"
              onClick={() => setActiveTab('tutorings')}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                activeTab === 'tutorings'
                  ? 'bg-brand-50 text-brand-800 shadow-xs ring-1 ring-brand-200'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-brand-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen aria-hidden="true" className="w-4 h-4 shrink-0" />
                <span>Tutorías Asignadas</span>
              </div>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'tutorings'
                    ? 'bg-white text-brand-700'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {activeTutorings.length}
              </span>
            </button>

            <button
              id="tab-teacher-convocations"
              onClick={() => setActiveTab('convocations')}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-colors cursor-pointer ${activeTab === 'convocations' ? 'bg-brand-50 text-brand-800 shadow-xs ring-1 ring-brand-200' : 'text-stone-600 hover:bg-stone-100 hover:text-brand-800'}`}
            >
              <div className="flex items-center gap-3"><Users aria-hidden="true" className="w-4 h-4 shrink-0" /><span>Convocar grupal</span></div>
            </button>

            <button
              id="tab-teacher-history"
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-brand-50 text-brand-800 shadow-xs ring-1 ring-brand-200'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-brand-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <History aria-hidden="true" className="w-4 h-4 shrink-0" />
                <span>Historial Tutorías</span>
              </div>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'history'
                    ? 'bg-white text-brand-700'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {historyTutorings.length}
              </span>
            </button>

            <button
              id="tab-teacher-availability"
              onClick={() => setActiveTab('availability')}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                activeTab === 'availability'
                  ? 'bg-brand-50 text-brand-800 shadow-xs ring-1 ring-brand-200'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-brand-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Clock aria-hidden="true" className="w-4 h-4 shrink-0" />
                <span>Mi Disponibilidad</span>
              </div>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'availability'
                    ? 'bg-white text-brand-700'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {myAvailabilities.length}
              </span>
            </button>

            <button
              id="tab-teacher-subjects"
              onClick={() => setActiveTab('subjects')}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                activeTab === 'subjects'
                  ? 'bg-brand-50 text-brand-800 shadow-xs ring-1 ring-brand-200'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-brand-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <GraduationCap aria-hidden="true" className="w-4 h-4 shrink-0" />
                <span>Mis Asignaturas</span>
              </div>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'subjects'
                    ? 'bg-white text-brand-700'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {teacherCatalog.length}
              </span>
            </button>

            <button
              id="tab-teacher-evaluations"
              onClick={() => setActiveTab('evaluations')}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                activeTab === 'evaluations'
                  ? 'bg-brand-50 text-brand-800 shadow-xs ring-1 ring-brand-200'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-brand-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Award aria-hidden="true" className="w-4 h-4 shrink-0" />
                <span>Evaluaciones</span>
              </div>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'evaluations'
                    ? 'bg-white text-brand-700'
                    : 'bg-warning-soft text-amber-800'
                }`}
              >
                {ratedTutorings.length}
              </span>
            </button>
          </nav>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 w-full min-w-0 space-y-5">
        {/* ONBOARDING NOTIFICATION IF NO AVAILABILITY */}
        {myAvailabilities.length === 0 && activeTab !== 'availability' && (
          <div className="p-5 rounded-2xl bg-brand-50 border border-warning-border shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Sparkles aria-hidden="true" className="w-5 h-5 text-white" />
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
              className="h-10 px-4 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-xl shadow-xs shrink-0 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span>Configurar Horarios</span>
              <ChevronRight aria-hidden="true" className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: TUTORINGS & RUNNER CONSOLE */}
        {activeTab === 'tutorings' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <section aria-labelledby="assigned-tutorings-title" className="space-y-4">
              <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-medium text-brand-700">Espacio docente</p>
                  <h2 id="assigned-tutorings-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                    Tutorías asignadas
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">Gestiona solicitudes, sesiones programadas y asistencia.</p>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-1 text-xs">
                  <button
                    type="button"
                    aria-pressed={displayMode === 'list'}
                    onClick={() => setDisplayMode('list')}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 transition-colors ${displayMode === 'list' ? 'bg-brand-50 font-semibold text-brand-800' : 'text-stone-600 hover:bg-stone-50'}`}
                  >
                    <List aria-hidden="true" className="h-3.5 w-3.5" />
                    Lista
                  </button>
                  <button
                    type="button"
                    aria-pressed={displayMode === 'calendar'}
                    onClick={() => setDisplayMode('calendar')}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 transition-colors ${displayMode === 'calendar' ? 'bg-brand-50 font-semibold text-brand-800' : 'text-stone-600 hover:bg-stone-50'}`}
                  >
                    <Calendar aria-hidden="true" className="h-3.5 w-3.5" />
                    Calendario
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-stone-200 bg-white p-3.5">
                  <p className="text-xs text-stone-500">Solicitudes</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{activeTutorings.length}</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white p-3.5">
                  <p className="text-xs text-stone-500">Pendientes</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-700">{activeTutorings.filter((t) => t.status === TutoringStatus.PENDING).length}</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white p-3.5">
                  <p className="text-xs text-stone-500">Programadas</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-brand-700">{activeTutorings.filter((t) => t.status === TutoringStatus.APPROVED).length}</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white p-3.5">
                  <p className="text-xs text-stone-500">En curso</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-sky-700">{activeTutorings.filter((t) => t.status === TutoringStatus.IN_PROGRESS).length}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    type="search"
                    aria-label="Buscar tutorías asignadas"
                    placeholder="Buscar estudiante, asignatura o código"
                    value={tutoringSearch}
                    onChange={(e) => setTutoringSearch(e.target.value)}
                    className="h-10 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                  />
                </div>
                <select
                  aria-label="Filtrar tutorías por estado"
                  value={tutoringStatusFilter}
                  onChange={(e) => setTutoringStatusFilter(e.target.value)}
                  className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-slate-700 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 sm:w-auto"
                >
                  <option value="all">Todos los estados ({activeTutorings.length})</option>
                  <option value={TutoringStatus.PENDING}>Pendientes</option>
                  <option value={TutoringStatus.APPROVED}>Programadas</option>
                  <option value={TutoringStatus.IN_PROGRESS}>En curso</option>
                </select>
                <span className="px-1 text-xs text-stone-500 sm:ml-auto">{filteredMyTutorings.length} resultados</span>
              </div>

              {displayMode === 'calendar' ? (
                <div className="rounded-xl border border-stone-200 bg-white p-3 sm:p-5">
                  <TutoringCalendarView
                    tutorings={activeTutorings}
                    currentUser={currentUser}
                    onSelectTutoring={(tut) => setSelectedTutoringId(tut.id)}
                  />
                </div>
              ) : filteredMyTutorings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-14 text-center">
                  <BookOpen aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-stone-300" />
                  <p className="text-sm font-semibold text-slate-800">No hay tutorías para mostrar</p>
                  <p className="mt-1 text-xs text-stone-500">Prueba con otra búsqueda o cambia el filtro de estado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {filteredMyTutorings.map((tut) => {
                    const dt = formatTutoringDateTime(tut.reservDate, tut.scheduleLabel, tut.reservTime);
                    const creatorName = tut.createdByName || tut.petitionerStudentName;
                    const teacherCreator = (tut.createdByRole || tut.creatorRole) === UserRole.TEACHER || tut.petitionerStudentId === tut.teacherId;
                    const studentUser = db.users.find((user) => user.id === (tut.createdByUserId || tut.petitionerStudentId) || user.fullName === creatorName);
                    const participantCount = (tut.assistants || []).length;

                    return (
                      <article key={tut.id} className="rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-stone-300 sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <UserAvatar
                              user={studentUser}
                              name={creatorName}
                              photoUrl={studentUser?.photoUrl}
                              role={teacherCreator ? UserRole.TEACHER : UserRole.STUDENT}
                              size="md"
                              className="shrink-0 border border-stone-200"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{creatorName}</p>
                              <p className="mt-0.5 text-[10px] text-stone-500">{teacherCreator ? 'Convocada por el docente' : 'Estudiante solicitante'}</p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${tut.type === TutoringType.INDIVIDUAL ? 'bg-slate-100 text-slate-700' : 'bg-violet-50 text-violet-700'}`}>{tut.type === TutoringType.INDIVIDUAL ? 'Individual' : 'Grupal'}</span><span className="text-[11px] text-stone-500">{participantCount} {participantCount === 1 ? 'participante' : 'participantes'}{tut.type !== TutoringType.INDIVIDUAL && ` / ${tut.maxParticipants ?? 'cupo por confirmar'}`}</span></div>
                            </div>
                          </div>
                          <StatusBadge status={tut.status} size="sm" />
                        </div>

                        <div className="mt-4 border-t border-stone-100 pt-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-[11px] font-medium text-stone-500">{tut.code}</span>
                            <span className="inline-flex items-center gap-1.5 text-xs text-stone-600">
                              <Calendar aria-hidden="true" className="h-3.5 w-3.5 text-brand-700" />
                              {dt.formattedDate}
                              <span className="text-stone-300">·</span>
                              <Clock aria-hidden="true" className="h-3.5 w-3.5 text-brand-700" />
                              {dt.timeDisplay}
                            </span>
                          </div>
                          <h3 className="mt-3 text-sm font-semibold text-slate-900">{tut.subjectCourseName || tut.subject}</h3>
                          {tut.subjectCourseName && tut.subject && tut.subject !== tut.subjectCourseName && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">Consulta: {tut.subject}</p>
                          )}
                        </div>

                        <div className="mt-4 flex justify-end border-t border-stone-100 pt-3">
                          <button
                            type="button"
                            onClick={() => setSelectedTutoringId(tut.id)}
                            className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-700 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                          >
                            Gestionar tutoría
                            <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* MODAL: TUTORING DETAIL & EXECUTION CONSOLE */}
            {activeTutoring && (
              <div onClick={(event) => { if (event.target === event.currentTarget) setSelectedTutoringId(null); }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[2px] animate-in fade-in sm:p-6">
                <div role="dialog" aria-modal="true" aria-labelledby="manage-tutoring-title" className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl animate-in zoom-in-95">
                  {/* Header */}
                  <div className="flex shrink-0 items-start justify-between gap-4 border-b border-stone-200 px-5 py-4 sm:px-6">
                    <div className="flex min-w-0 items-start gap-3">
                      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                        <BookOpen className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-brand-700">Detalle de sesión · {activeTutoring.code}</p>
                        <h2 id="manage-tutoring-title" className="mt-0.5 truncate text-base font-semibold text-slate-900 sm:text-lg">
                          {activeTutoring.subjectCourseName || activeTutoring.subject}
                        </h2>
                        <div className="mt-1.5"><StatusBadge status={activeTutoring.status} size="sm" /></div>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Cerrar gestión de tutoría"
                      onClick={() => setSelectedTutoringId(null)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                    >
                      <X aria-hidden="true" className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-xs sm:space-y-5 sm:px-6 sm:py-5">
                    <div className="grid grid-cols-1 gap-3 rounded-xl border border-stone-200 bg-stone-50/70 p-4 sm:grid-cols-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Tema de consulta</span>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{activeTutoring.subject}</p>
                        {activeTutoring.subjectCourseName && activeTutoring.subject !== activeTutoring.subjectCourseName && (
                          <p className="mt-0.5 text-xs text-stone-500">{activeTutoring.subjectCourseName}</p>
                        )}
                      </div>
                      {(() => {
                        const petitionerUser = db.users.find(
                          (u) => u.id === activeTutoring.petitionerStudentId || u.fullName === activeTutoring.petitionerStudentName
                        );
                        return (
                          <div className="flex min-w-0 items-center gap-3 border-t border-stone-200 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                            <UserAvatar
                              user={petitionerUser}
                              name={activeTutoring.petitionerStudentName}
                              photoUrl={petitionerUser?.photoUrl}
                              role={UserRole.STUDENT}
                              size="sm"
                              className="shrink-0 border border-stone-200"
                            />
                            <div className="min-w-0">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Solicitante</span>
                              <p className="truncate text-sm font-semibold text-slate-900">{activeTutoring.petitionerStudentName}</p>
                              {petitionerUser?.careerName && <p className="truncate text-xs text-stone-500">{petitionerUser.careerName}</p>}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {activeTutoring.details && (
                      <section className="space-y-1.5">
                        <h3 className="text-xs font-semibold text-slate-800">Descripción y dudas</h3>
                        <p className="rounded-xl border border-stone-200 bg-white p-3.5 text-sm leading-relaxed text-slate-700">{activeTutoring.details}</p>
                      </section>
                    )}

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="flex items-center gap-3 rounded-xl border border-stone-200 p-3">
                        <Calendar aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-700" />
                        <div><span className="block text-[10px] font-medium uppercase tracking-wide text-stone-500">Fecha</span><span className="mt-0.5 block text-xs font-semibold text-slate-800">{formatTutoringDateTime(activeTutoring.reservDate, activeTutoring.scheduleLabel, activeTutoring.reservTime).formattedDate}</span></div>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl border border-stone-200 p-3">
                        <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-700" />
                        <div><span className="block text-[10px] font-medium uppercase tracking-wide text-stone-500">Horario</span><span className="mt-0.5 block text-xs font-semibold text-slate-800">{activeTutoring.reservTime || activeTutoring.scheduleLabel || 'Por acordar'}</span></div>
                      </div>
                      <div className="flex min-w-0 items-start gap-3 rounded-xl border border-stone-200 p-3 sm:col-span-2">
                        {activeTutoring.modality === TutoringModality.PRESENCIAL ? <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" /> : <Video aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />}
                        <div className="min-w-0">
                          <span className="block text-[10px] font-medium uppercase tracking-wide text-stone-500">Modalidad y espacio</span>
                          <div className="mt-0.5 break-words text-xs font-semibold text-slate-800">
                            {activeTutoring.modality === TutoringModality.PRESENCIAL ? (
                              <span>Presencial · {activeTutoring.space || 'Aula / Laboratorio institucional'}</span>
                            ) : (
                              <span className="inline-flex flex-wrap items-center gap-1.5">
                                <span>Virtual · </span>
                                {activeTutoring.space && activeTutoring.space.startsWith('http') ? (
                                  <a href={activeTutoring.space} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 underline">
                                    Abrir enlace <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                                  </a>
                                ) : activeTutoring.space || 'Enlace pendiente'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {(activeTutoring.startTime || activeTutoring.finishTime) && (
                      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-stone-100 pt-3 text-xs">
                        {activeTutoring.startTime && <span className="flex items-center gap-1.5 font-medium text-brand-700"><Play aria-hidden="true" className="h-3 w-3 fill-brand-700" />Inicio: {activeTutoring.startTime}</span>}
                        {activeTutoring.finishTime && <span className="flex items-center gap-1.5 font-medium text-slate-700"><Square aria-hidden="true" className="h-3 w-3 fill-slate-700" />Cierre: {activeTutoring.finishTime}</span>}
                      </div>
                    )}

                    {/* Card 2: Documento Adjunto */}
                    {activeTutoring.attachmentName && (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <Paperclip aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-700" />
                          <div className="min-w-0"><span className="block text-[10px] font-medium uppercase tracking-wide text-stone-500">Material adjunto</span><span className="block truncate text-xs font-semibold text-slate-900">{activeTutoring.attachmentName}</span></div>
                        </div>
                        {activeTutoring.attachmentUrl && (
                          <button
                            type="button"
                            onClick={() => setViewingAttachment({ fileName: activeTutoring.attachmentName || 'Documento Adjunto', fileUrl: activeTutoring.attachmentUrl! })}
                            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                          >
                            <FileText aria-hidden="true" className="h-3.5 w-3.5" />Ver archivo
                          </button>
                        )}
                      </div>
                    )}

                    {/* Card 3: Control de Asistencia */}
                    <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Users aria-hidden="true" className="h-4 w-4 text-brand-700" />
                          <h3 className="text-sm font-semibold text-slate-900">Asistencia</h3>
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">{(activeTutoring.assistants || []).length}</span>
                        </div>
                        {(activeTutoring.status === TutoringStatus.IN_PROGRESS || activeTutoring.status === TutoringStatus.COMPLETED) && (
                          <button type="button" id="btn-save-assistance" onClick={handleSaveAttendance} disabled={savingAttendance} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-700 px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-50">
                            <Check aria-hidden="true" className="h-3.5 w-3.5" />{savingAttendance ? 'Guardando…' : 'Guardar asistencia'}
                          </button>
                        )}
                      </div>

                      <div className="divide-y divide-stone-100">
                        {(activeTutoring.assistants || []).map((ast) => {
                          const astUser = db.users.find((u) => u.id === ast.studentId || u.account === ast.studentAccount || u.fullName === ast.studentName);
                          return (
                            <div key={ast.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                              <div className="flex min-w-0 items-center gap-3">
                                <UserAvatar user={astUser} name={ast.studentName} photoUrl={astUser?.photoUrl} role={UserRole.STUDENT} size="sm" className="shrink-0 border border-stone-200" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900"><span className="truncate">{ast.studentName}</span>{ast.isPetitioner && <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">Solicitante</span>}</div>
                                  <div className="mt-0.5 truncate font-mono text-[11px] text-stone-500">Código: {ast.studentAccount}</div>
                                </div>
                              </div>
                              <label className="flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs font-medium text-slate-700 hover:bg-stone-50">
                                <input
                                  type="checkbox"
                                  checked={!!attendanceMap[ast.id]}
                                  onChange={(e) => setAttendanceMap({ ...attendanceMap, [ast.id]: e.target.checked })}
                                  disabled={activeTutoring.status !== TutoringStatus.IN_PROGRESS && activeTutoring.status !== TutoringStatus.COMPLETED}
                                  className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
                                />
                                <span className={attendanceMap[ast.id] ? 'text-brand-700' : 'text-stone-500'}>{attendanceMap[ast.id] ? 'Presente' : 'Ausente'}</span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Card 4: Observaciones del Docente */}
                    {activeTutoring.status === TutoringStatus.IN_PROGRESS && (
                      <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-4">
                        <label htmlFor="teacher-session-observations" className="block text-xs font-semibold text-slate-800">Observaciones académicas</label>
                        <textarea id="teacher-session-observations" rows={3} value={teacherComment} onChange={(e) => setTeacherComment(e.target.value)} placeholder="Temas reforzados y observaciones" className="w-full rounded-lg border border-stone-200 p-3 text-sm text-slate-800 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20" />
                      </div>
                    )}

                    {/* Card 5: Evaluación del Estudiante */}
                    {activeTutoring.status === TutoringStatus.COMPLETED && activeTutoring.score > 0 && (
                      <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                        <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                          <span>Evaluación del estudiante</span>
                          <span className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"><Star aria-hidden="true" className="h-4 w-4 fill-amber-400 text-amber-500" />{activeTutoring.score} / 5</span>
                        </div>
                        {activeTutoring.studentComment && <p className="rounded-lg border border-amber-100 bg-white p-3 text-sm leading-relaxed text-slate-700">“{activeTutoring.studentComment}”</p>}
                      </div>
                    )}

                    {actionError && (
                      <div role="alert" className="flex items-center gap-2 rounded-xl border border-danger-border bg-danger-soft p-3.5 text-xs font-medium text-danger">
                        <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" /><span>{actionError}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-stone-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <span className="truncate font-mono text-[11px] text-stone-400">ID: {activeTutoring.id}</span>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {/* Action Buttons */}
                      {activeTutoring.status === TutoringStatus.PENDING && (
                        <>
                          <button
                            type="button"
                            onClick={() => openApproveModal(activeTutoring)}
                            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-700 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-brand-800"
                            title="Aprobar y asignar espacio"
                          >
                            <Check aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>Aprobar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openCancelModal(activeTutoring)}
                            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-danger-border bg-white px-3.5 text-xs font-semibold text-danger transition-colors hover:bg-danger-soft"
                            title="Rechazar solicitud"
                          >
                            <Ban aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>Rechazar</span>
                          </button>
                        </>
                      )}

                      {activeTutoring.status === TutoringStatus.APPROVED && (
                        <button
                          type="button"
                          id={`btn-start-tutoring-${activeTutoring.id}`}
                          onClick={() => handleStart(activeTutoring.id)}
                          disabled={startingTutoringId !== null || finishingTutoringId !== null}
                          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-wait disabled:opacity-60"
                          title="Iniciar la tutoría"
                        >
                          {startingTutoringId === activeTutoring.id ? <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Play aria-hidden="true" className="h-3.5 w-3.5 fill-white" />}
                          <span>{startingTutoringId === activeTutoring.id ? 'Iniciando…' : 'Iniciar Tutoría'}</span>
                        </button>
                      )}

                      {activeTutoring.status === TutoringStatus.IN_PROGRESS && (
                        <button
                          type="button"
                          id={`btn-finish-tutoring-${activeTutoring.id}`}
                          onClick={() => handleFinish(activeTutoring.id)}
                          disabled={startingTutoringId !== null || finishingTutoringId !== null}
                          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-wait disabled:opacity-60"
                          title="Concluir la sesión"
                        >
                          {finishingTutoringId === activeTutoring.id ? <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Square aria-hidden="true" className="h-3.5 w-3.5 fill-white" />}
                          <span>{finishingTutoringId === activeTutoring.id ? 'Finalizando…' : 'Finalizar Tutoría'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedTutoringId(null)}
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-stone-200 px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB HISTORY: HISTORIAL TUTORÍAS */}
        {activeTab === 'convocations' && (
          <section className="max-w-3xl space-y-4 animate-in fade-in duration-200">
            <header>
              <p className="text-xs font-medium text-brand-700">Nueva convocatoria</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Convocar tutoría grupal</h2>
              <p className="mt-1 text-sm text-stone-500">Elige una materia y franja activa. La tutoría se aprobará y publicará al crearla si el espacio, el cupo y el horario son válidos.</p>
            </header>
            {convocationSuccess && <div role="status" className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm font-medium text-brand-800">{convocationSuccess}</div>}
            <form onSubmit={handleCreateConvocation} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
              <div className="space-y-1.5">
                <label htmlFor="teacher-convocation-availability" className="block text-xs font-semibold text-slate-700">Materia y franja disponible</label>
                <select id="teacher-convocation-availability" value={convocationAvailabilityId} onChange={(e) => setConvocationAvailabilityId(e.target.value)} required className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-slate-800">
                  <option value="">Selecciona una materia y horario</option>
                  {myAvailabilities.filter((item) => item.isAvailable).map((item) => <option key={item.id} value={item.id}>{item.subjectCourseName} · {item.scheduleLabel}</option>)}
                </select>
                {myAvailabilities.filter((item) => item.isAvailable).length === 0 && <p className="text-xs text-amber-700">Primero configura una franja activa en Mi Disponibilidad.</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="teacher-convocation-date" className="block text-xs font-semibold text-slate-700">Fecha</label>
                  <input id="teacher-convocation-date" type="date" min={(() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().slice(0, 10); })()} value={convocationDate} onChange={(e) => setConvocationDate(e.target.value)} required className="h-11 w-full rounded-lg border border-stone-200 px-3 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="teacher-convocation-modality" className="block text-xs font-semibold text-slate-700">Modalidad</label>
                  <select id="teacher-convocation-modality" value={convocationModality} onChange={(e) => setConvocationModality(e.target.value === '' ? '' : Number(e.target.value) as TutoringModality)} required className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm">
                    <option value="">Selecciona modalidad</option><option value={TutoringModality.PRESENCIAL}>Presencial</option><option value={TutoringModality.VIRTUAL}>Virtual</option>
                  </select>
                </div>
              </div>
              {convocationModality === TutoringModality.PRESENCIAL ? <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><label htmlFor="teacher-convocation-room" className="block text-xs font-semibold text-slate-700">Salón</label><input id="teacher-convocation-room" value={convocationSpace} onChange={(e) => setConvocationSpace(e.target.value)} required maxLength={200} placeholder="Ej.: Salón 101" className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm" /></div>
                <div className="space-y-1.5"><label htmlFor="teacher-convocation-block" className="block text-xs font-semibold text-slate-700">Bloque / edificio</label><input id="teacher-convocation-block" value={convocationBlock} onChange={(e) => setConvocationBlock(e.target.value)} required maxLength={50} className="h-11 w-full rounded-lg border border-stone-200 px-3 text-sm" /></div>
              </div> : convocationModality === TutoringModality.VIRTUAL ? <div className="space-y-1.5"><label htmlFor="teacher-convocation-link" className="block text-xs font-semibold text-slate-700">Enlace de reunión</label><input id="teacher-convocation-link" type="url" value={convocationSpace} onChange={(e) => setConvocationSpace(e.target.value)} required placeholder="https://..." className="h-11 w-full rounded-lg border border-stone-200 px-3 text-sm" /></div> : null}
              <div className="space-y-1.5"><label htmlFor="teacher-convocation-capacity" className="block text-xs font-semibold text-slate-700">Cupo de estudiantes</label><input id="teacher-convocation-capacity" type="number" min={2} max={convocationModality === TutoringModality.VIRTUAL ? 30 : undefined} value={convocationCapacity} onChange={(e) => setConvocationCapacity(Number(e.target.value))} required className="h-11 w-full rounded-lg border border-stone-200 px-3 text-sm" /><p className="text-xs text-stone-500">El cupo incluye solo estudiantes; tú apareces como docente convocante.</p></div>
              <div className="space-y-1.5">
                <label htmlFor="teacher-convocation-topic" className="block text-xs font-semibold text-slate-700">Tema de la convocatoria</label>
                <input id="teacher-convocation-topic" value={convocationTopic} onChange={(e) => setConvocationTopic(e.target.value)} maxLength={70} minLength={3} required placeholder="Ej.: Repaso de derivadas" className="h-11 w-full rounded-lg border border-stone-200 px-3 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="teacher-convocation-details" className="block text-xs font-semibold text-slate-700">Descripción y objetivos</label>
                <textarea id="teacher-convocation-details" value={convocationDetails} onChange={(e) => setConvocationDetails(e.target.value)} minLength={5} maxLength={2000} required rows={4} placeholder="Indica qué se trabajará y qué deben preparar los estudiantes." className="w-full rounded-lg border border-stone-200 p-3 text-sm" />
              </div>
              {convocationError && <div role="alert" className="rounded-lg border border-danger-border bg-danger-soft p-3 text-sm text-danger">{convocationError}</div>}
              <button type="submit" disabled={creatingConvocation || myAvailabilities.every((item) => !item.isAvailable)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"><PlusCircle aria-hidden="true" className="h-4 w-4" />{creatingConvocation ? 'Enviando…' : 'Enviar convocatoria'}</button>
            </form>
          </section>
        )}

        {activeTab === 'history' && (
          <section aria-labelledby="teacher-history-title" className="space-y-4 animate-in fade-in duration-200">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium text-brand-700">Registro de sesiones</p>
                <h2 id="teacher-history-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Historial de tutorías</h2>
                <p className="mt-1 text-sm text-stone-500">Consulta las sesiones finalizadas y las cancelaciones con su motivo.</p>
              </div>
              <span className="text-sm text-stone-500"><strong className="font-semibold text-slate-800">{historyTutorings.length}</strong> registros archivados</span>
            </header>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200 sm:grid-cols-4">
              <div className="bg-white p-3.5 sm:p-4">
                <p className="text-xs text-stone-500">Finalizadas</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{completedTutorings.length}</p>
              </div>
              <div className="bg-white p-3.5 sm:p-4">
                <p className="text-xs text-stone-500">Canceladas</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-rose-700">{cancelledTutorings.length}</p>
              </div>
              <div className="bg-white p-3.5 sm:p-4">
                <p className="text-xs text-stone-500">Con calificación</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{ratedTutorings.filter((t) => t.status === TutoringStatus.COMPLETED).length}</p>
              </div>
              <div className="bg-white p-3.5 sm:p-4">
                <p className="text-xs text-stone-500">Participantes en sesiones realizadas</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{completedTutorings.reduce((total, tut) => total + (tut.assistants || []).length, 0)}</p>
              </div>
            </div>

            {historyTutorings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-14 text-center">
                <History aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-stone-300" />
                <p className="text-sm font-semibold text-slate-800">Aún no hay registros en el historial</p>
                <p className="mt-1 text-xs text-stone-500">Las sesiones finalizadas y las tutorías canceladas aparecerán aquí.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                <div className="hidden grid-cols-[minmax(130px,0.8fr)_minmax(190px,1.2fr)_minmax(160px,1fr)_minmax(180px,1.2fr)_auto] gap-4 border-b border-stone-200 bg-stone-50/70 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500 lg:grid">
                  <span>Fecha y hora</span>
                  <span>Asignatura</span>
                  <span>Estudiante</span>
                  <span>Resultado</span>
                  <span className="sr-only">Acción</span>
                </div>
                <div className="divide-y divide-stone-100">
                  {historyTutorings
                    .slice()
                    .sort((a, b) => new Date(b.reservDate).getTime() - new Date(a.reservDate).getTime())
                    .map((tut) => {
                      const dt = formatTutoringDateTime(tut.reservDate, tut.scheduleLabel, tut.reservTime);
                      const creatorName = tut.createdByName || tut.petitionerStudentName;
                      const teacherCreator = (tut.createdByRole || tut.creatorRole) === UserRole.TEACHER || tut.petitionerStudentId === tut.teacherId;
                      const studentUser = db.users.find((user) => user.id === (tut.createdByUserId || tut.petitionerStudentId) || user.fullName === creatorName);
                      const participantCount = (tut.assistants || []).length;
                      return (
                        <article key={tut.id} className="grid grid-cols-1 gap-3 px-4 py-4 transition-colors hover:bg-stone-50/60 lg:grid-cols-[minmax(130px,0.8fr)_minmax(190px,1.2fr)_minmax(160px,1fr)_minmax(180px,1.2fr)_auto] lg:items-center lg:gap-4">
                          <div className="flex items-center justify-between gap-3 lg:block">
                            <div>
                              <p className="text-xs font-medium text-slate-800">{dt.formattedDate}</p>
                              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-stone-500"><Clock aria-hidden="true" className="h-3.5 w-3.5" />{dt.timeDisplay}</p>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 lg:block">
                              <span className="font-mono text-[10px] text-stone-400">{tut.code}</span>
                              <span className="lg:mt-1 lg:block"><StatusBadge status={tut.status} size="sm" /></span>
                            </div>
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{tut.subjectCourseName || tut.subject}</p>
                            {tut.subjectCourseName && tut.subject && tut.subject !== tut.subjectCourseName && <p className="mt-0.5 truncate text-xs text-stone-500">Consulta: {tut.subject}</p>}
                          </div>

                          <div className="flex items-center gap-2.5">
                            <UserAvatar user={studentUser} name={creatorName} photoUrl={studentUser?.photoUrl} role={teacherCreator ? UserRole.TEACHER : UserRole.STUDENT} size="sm" className="shrink-0 border border-stone-200" />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-slate-800">{creatorName}</p>
                              <p className="text-[10px] text-stone-500">{teacherCreator ? 'Convocada por el docente' : 'Estudiante solicitante'}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${tut.type === TutoringType.INDIVIDUAL ? 'bg-slate-100 text-slate-700' : 'bg-violet-50 text-violet-700'}`}>{tut.type === TutoringType.INDIVIDUAL ? 'Individual' : 'Grupal'}</span><span className="text-[11px] text-stone-500">{participantCount} {participantCount === 1 ? 'participante' : 'participantes'}{tut.type !== TutoringType.INDIVIDUAL && ` / ${tut.maxParticipants ?? 'cupo por confirmar'}`}</span></div>
                            </div>
                          </div>

                          <div className="min-w-0 space-y-1">
                            {tut.status === TutoringStatus.CANCELLED ? (
                              <p className="text-xs font-medium text-rose-700">Tutoría cancelada</p>
                            ) : tut.score > 0 ? (
                              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-700"><Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />{tut.score} / 5{tut.studentComment ? <span className="truncate font-normal text-stone-500">· {tut.studentComment}</span> : null}</p>
                            ) : <p className="text-xs text-stone-400">Sin calificación</p>}
                            {tut.status === TutoringStatus.CANCELLED && tut.cancelReason && <p className="line-clamp-2 text-[11px] text-rose-700" title={tut.cancelReason}>Motivo: {tut.cancelReason}</p>}
                            {tut.teacherComment && <p className="truncate text-[11px] text-stone-500" title={tut.teacherComment}>Observación: {tut.teacherComment}</p>}
                          </div>

                          <button
                            type="button"
                            aria-label={`Ver detalle de tutoría ${tut.code}`}
                            onClick={() => setSelectedDetailTutoring(tut)}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 lg:justify-self-end"
                          >
                            <FileText aria-hidden="true" className="h-3.5 w-3.5" />
                            Ver detalle
                          </button>
                        </article>
                      );
                    })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: AVAILABILITY MANAGEMENT */}
        {activeTab === 'availability' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Notifications */}
            {availabilitySuccessMsg && (
              <div className="p-4 bg-brand-50 border border-brand-200 text-brand-700 rounded-2xl text-xs flex items-center gap-2 font-bold animate-in fade-in">
                <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-brand-700 shrink-0" />
                <span>{availabilitySuccessMsg}</span>
              </div>
            )}
            {availabilityErrorMsg && (
              <div role="alert" className="p-4 bg-danger-soft border border-danger-border text-danger rounded-2xl text-xs flex items-center gap-2 font-bold animate-in fade-in">
                <AlertCircle aria-hidden="true" className="w-4 h-4 text-danger shrink-0" />
                <span>{availabilityErrorMsg}</span>
              </div>
            )}

            {/* Availability workspace */}
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Clock aria-hidden="true" className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900">Mi disponibilidad</h2>
                    <p className="mt-1 text-sm text-stone-500">Organiza por asignatura los horarios que pueden reservar tus estudiantes.</p>
                  </div>
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
                  className="inline-flex h-10 items-center gap-2 self-start rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-800 sm:self-auto"
                >
                  <Plus aria-hidden="true" className="w-4 h-4" />
                  <span>{showAddSlot ? 'Cerrar configuración' : 'Agregar horario'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-stone-200 bg-white p-3.5">
                  <p className="text-xs text-stone-500">Franjas registradas</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{myAvailabilities.length}</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white p-3.5">
                  <p className="text-xs text-stone-500">Disponibles</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-brand-700">{myAvailabilities.filter((av) => av.isAvailable).length}</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white p-3.5">
                  <p className="text-xs text-stone-500">En pausa</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-stone-600">{myAvailabilities.filter((av) => !av.isAvailable).length}</p>
                </div>
              </div>

              {/* FORM TO ADD AVAILABILITY */}
              {showAddSlot && (
                <div className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5 space-y-5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-brand-700 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles aria-hidden="true" className="w-4 h-4 text-brand-700" />
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
                              <Filter aria-hidden="true" className="w-3.5 h-3.5 text-brand-700" />
                              <span>Semestre:</span>
                            </label>
                            <select
                              id="select-add-slot-semester"
                              value={addSlotSemesterFilter}
                              onChange={(e) => handleAddSlotSemesterChange(e.target.value)}
                              className="h-11 text-sm rounded-lg border border-stone-200 bg-white px-3.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 transition-colors cursor-pointer"
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
                        <div className="p-4 bg-warning-soft border border-warning-border rounded-xl space-y-2">
                          <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                            <AlertCircle aria-hidden="true" className="w-4 h-4 text-warning shrink-0" />
                            <span>Aún no ha asignado materias en su perfil</span>
                          </div>
                          <p className="text-xs text-amber-800 leading-relaxed">
                            Para poder registrar disponibilidad horaria, primero seleccione en la pestaña <strong>"Mis Asignaturas"</strong> las materias que usted imparte.
                          </p>
                          <button
                            type="button"
                            onClick={() => setActiveTab('subjects')}
                            className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-700 hover:bg-brand-800 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                          >
                            <GraduationCap aria-hidden="true" className="w-3.5 h-3.5" />
                            <span>Ir a Mis Asignaturas</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <select
                            id="select-add-subject"
                            value={newSubjectId}
                            onChange={(e) => setNewSubjectId(e.target.value)}
                            className="w-full rounded-lg border border-stone-200 bg-white p-3.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 cursor-pointer"
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
                              <span className="text-brand-700 font-bold">
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
                            className="text-brand-700 hover:underline font-bold cursor-pointer"
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
                              className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-left ${
                                isSelected
                                  ? 'bg-brand-600 border-[#11770e] text-white shadow-xs'
                                  : 'bg-white border-stone-200 text-slate-700 hover:bg-brand-50'
                              }`}
                            >
                              <Clock className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-brand-700'}`} />
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
                      className="h-10 px-5 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 shadow-xs cursor-pointer disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {addingSlot ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Guardando…</span>
                        </>
                      ) : (
                        <>
                          <Check aria-hidden="true" className="w-4 h-4" />
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
                  <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-stone-600">
                      <Filter aria-hidden="true" className="w-4 h-4 text-brand-700" />
                      <span>Filtrar por Asignatura:</span>
                    </div>
                    <select
                      value={availabilityFilterSubject}
                      onChange={(e) => setAvailabilityFilterSubject(e.target.value)}
                      className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 cursor-pointer sm:w-auto"
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
                  const filteredAvailabilities: TeacherAvailability[] =
                    availabilityFilterSubject === 'all'
                      ? myAvailabilities
                      : myAvailabilities.filter((a) => a.subjectCourseId === availabilityFilterSubject);

                  if (filteredAvailabilities.length === 0 && !showAddSlot) {
                    return (
                      <div className="p-12 text-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/50 space-y-2">
                        <Clock aria-hidden="true" className="w-9 h-9 text-stone-300 mx-auto" />
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

                  const groupedAvailabilities = filteredAvailabilities.reduce<Record<string, TeacherAvailability[]>>((groups, availability) => {
                    (groups[availability.subjectCourseId] ||= []).push(availability);
                    return groups;
                  }, {});

                  return (
                    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                      {Object.entries(groupedAvailabilities).map(([subjectId, subjectSlots]) => {
                        const subject = subjects.find((item) => item.id === subjectId);
                        return (
                          <section key={subjectId} aria-label={`Horarios de ${subjectSlots[0]?.subjectCourseName}`} className="border-b border-stone-200 last:border-b-0">
                            <header className="flex flex-col gap-1 bg-stone-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-2">
                                <BookOpen aria-hidden="true" className="h-4 w-4 text-brand-700" />
                                <h3 className="text-sm font-semibold text-slate-900">{subjectSlots[0]?.subjectCourseName}</h3>
                                {subject?.semester && <span className="text-[11px] text-stone-500">Semestre {subject.semester}</span>}
                              </div>
                              <span className="text-xs text-stone-500">{subjectSlots.length} {subjectSlots.length === 1 ? 'franja' : 'franjas'}</span>
                            </header>
                            <div className="divide-y divide-stone-100">
                              {subjectSlots.map((av) => (
                                <div key={av.id} className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[minmax(180px,1fr)_minmax(120px,0.6fr)_auto] sm:items-center sm:gap-4">
                                  <div className="flex items-center gap-2 text-sm text-slate-800">
                                    <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-stone-400" />
                                    <span>{av.scheduleLabel}</span>
                                  </div>
                                  <span className={`inline-flex w-fit items-center gap-1.5 text-xs ${av.isAvailable ? 'text-brand-700' : 'text-stone-500'}`}>
                                    <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${av.isAvailable ? 'bg-brand-600' : 'bg-stone-400'}`} />
                                    {av.isAvailable ? 'Disponible' : 'En pausa'}
                                  </span>
                                  <div className="flex items-center gap-2 sm:justify-end">
                                    <button
                                      id={`btn-toggle-availability-${av.id}`}
                                      type="button"
                                      onClick={() => handleToggleSlot(av.id)}
                                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-200 px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-stone-50"
                                      title={av.isAvailable ? 'Pausar franja' : 'Activar franja'}
                                    >
                                      {av.isAvailable ? <ToggleRight aria-hidden="true" className="h-4 w-4 text-brand-700" /> : <ToggleLeft aria-hidden="true" className="h-4 w-4 text-stone-400" />}
                                      {av.isAvailable ? 'Pausar' : 'Activar'}
                                    </button>
                                    <button
                                      type="button"
                                      aria-label={`Eliminar horario ${av.scheduleLabel} de ${av.subjectCourseName}`}
                                      disabled={deleteSlotId === av.id}
                                      onClick={() => handleDeleteSlot(av.id)}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-500 transition-colors hover:border-danger-border hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                                      title="Eliminar franja horaria"
                                    >
                                      {deleteSlotId === av.id ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" /> : <Trash2 aria-hidden="true" className="h-4 w-4" />}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SUBJECTS CATALOG */}
        {activeTab === 'subjects' && (
          <section aria-labelledby="teacher-subjects-title" className="space-y-4 animate-in fade-in duration-200">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium text-brand-700">Catálogo docente</p>
                <h2 id="teacher-subjects-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Mis asignaturas</h2>
                <p className="mt-1 text-sm text-stone-500">Elige qué materias impartes para habilitarlas en las solicitudes de tutoría.</p>
              </div>
              <p className="text-sm text-stone-500">Programa: <span className="font-medium text-slate-800">{currentUser.careerName || 'Sin asignar'}</span></p>
            </header>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-stone-200 bg-white p-3.5">
                <p className="text-xs text-stone-500">Asignaturas asignadas</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-brand-700">{teacherCatalog.length}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-3.5">
                <p className="text-xs text-stone-500">En el catálogo</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{subjectsInCareer.length}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-3.5">
                <p className="text-xs text-stone-500">Semestres disponibles</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{catalogSemesters.length}</p>
              </div>
            </div>

            {catalogMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3.5 text-xs font-medium text-brand-700 animate-in fade-in">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>{catalogMsg}</span>
              </div>
            )}
            {catalogError && (
              <div role="alert" className="flex items-center gap-2 rounded-xl border border-danger-border bg-danger-soft p-3.5 text-xs font-medium text-danger animate-in fade-in">
                <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>{catalogError}</span>
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-stone-200 bg-stone-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Materias del programa</h3>
                  <p className="mt-0.5 text-xs text-stone-500">Activa las materias que impartes.</p>
                </div>
                <div className="flex items-center gap-3">
                  <label htmlFor="select-catalog-semester-filter" className="text-xs text-stone-500">Semestre</label>
                  <select
                    id="select-catalog-semester-filter"
                    value={catalogSemesterFilter}
                    onChange={(e) => setCatalogSemesterFilter(e.target.value)}
                    aria-label="Filtrar asignaturas por semestre"
                    className="h-9 rounded-lg border border-stone-200 bg-white px-3 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 cursor-pointer"
                  >
                    <option value="all">Todos</option>
                    {catalogSemesters.map((sem) => <option key={sem} value={String(sem)}>Semestre {sem}</option>)}
                  </select>
                </div>
              </div>

              {subjectsInCareer.length === 0 ? (
                <div className="px-4 py-14 text-center">
                  <BookOpen aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-stone-300" />
                  <p className="text-sm font-semibold text-slate-800">No hay asignaturas en el catálogo</p>
                  <p className="mt-1 text-xs text-stone-500">El administrador debe registrar materias para tu programa.</p>
                </div>
              ) : subjectsInCareerFiltered.length === 0 ? (
                <div className="px-4 py-14 text-center text-sm text-stone-500">No hay materias en el semestre seleccionado.</div>
              ) : (
                <div>
                  {catalogSemesterGroups.map((group) => {
                    const assignedCount = group.subjects.filter((subject) => teacherCatalog.some((assigned) => assigned.id === subject.id)).length;
                    return (
                      <section key={group.semester} aria-label={group.semester ? `Asignaturas del semestre ${group.semester}` : 'Asignaturas sin semestre'}>
                        <header className="flex items-center justify-between border-b border-stone-100 px-4 py-2.5">
                          <h4 className="text-xs font-semibold text-stone-600">{group.semester ? `Semestre ${group.semester}` : 'Sin semestre'}</h4>
                          <span className="text-[11px] text-stone-400">{assignedCount} de {group.subjects.length} asignadas</span>
                        </header>
                        <div className="divide-y divide-stone-100">
                          {group.subjects.map((subject) => {
                            const isAssigned = teacherCatalog.some((assigned) => assigned.id === subject.id);
                            return (
                              <label key={subject.id} className={`grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-stone-50 ${savingCatalog ? 'pointer-events-none opacity-60' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={isAssigned}
                                  disabled={savingCatalog}
                                  onChange={() => handleToggleCatalogSubject(subject.id)}
                                  className="h-4 w-4 cursor-pointer rounded border-stone-300 text-brand-700 focus:ring-brand-600"
                                />
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-medium text-slate-900">{subject.name}</span>
                                  <span className="mt-0.5 block text-[11px] text-stone-500">Código {subject.code || 'sin código'}</span>
                                </span>
                                <span className={`text-xs ${isAssigned ? 'font-medium text-brand-700' : 'text-stone-400'}`}>{isAssigned ? 'Asignada' : 'No asignada'}</span>
                              </label>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 4: EVALUATIONS & REVIEWS */}
        {activeTab === 'evaluations' && (
          <section aria-labelledby="teacher-evaluations-title" className="space-y-4 animate-in fade-in duration-200">
            <header>
              <p className="text-xs font-medium text-brand-700">Voz de tus estudiantes</p>
              <h2 id="teacher-evaluations-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Evaluaciones</h2>
              <p className="mt-1 text-sm text-stone-500">Calificaciones y comentarios recibidos al finalizar las tutorías.</p>
            </header>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-stone-200 bg-white p-3.5">
                <p className="text-xs text-stone-500">Sesiones evaluadas</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{ratedTutorings.length}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-3.5">
                <p className="text-xs text-stone-500">Promedio recibido</p>
                <p className="mt-1 flex items-center gap-1.5 text-2xl font-semibold tabular-nums text-slate-900">
                  {avgScore > 0 ? avgScore.toFixed(1) : '—'}
                  {avgScore > 0 && <Star aria-hidden="true" className="h-4 w-4 fill-amber-400 text-amber-500" />}
                  {avgScore > 0 && <span className="text-xs font-normal text-stone-500">/ 5</span>}
                </p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-3.5">
                <p className="text-xs text-stone-500">Comentarios escritos</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{writtenFeedbackCount}</p>
              </div>
            </div>

            {ratedTutorings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-14 text-center">
                <Award aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-stone-300" />
                <p className="text-sm font-semibold text-slate-800">Aún no hay evaluaciones</p>
                <p className="mt-1 text-xs text-stone-500">Las calificaciones aparecerán cuando los estudiantes finalicen una tutoría.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50/70 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-900">Reseñas por sesión</h3>
                  <span className="text-xs text-stone-500">{ratingCount} {ratingCount === 1 ? 'valoración' : 'valoraciones'}</span>
                </div>
                <div className="divide-y divide-stone-100">
                  {ratedTutorings
                    .slice()
                    .sort((a, b) => new Date(b.reservDate).getTime() - new Date(a.reservDate).getTime())
                    .map((tut) => {
                      const studentUser = db.users.find((user) => user.id === tut.petitionerStudentId || user.fullName === tut.petitionerStudentName);
                      const ratings = tut.ratings?.length
                        ? tut.ratings
                        : tut.studentComment
                          ? [{ studentName: tut.petitionerStudentName, score: tut.score, studentComment: tut.studentComment }]
                          : [];
                      return (
                        <article key={tut.id} className="grid grid-cols-1 gap-4 px-4 py-4 sm:p-5 lg:grid-cols-[minmax(190px,0.9fr)_minmax(0,1.5fr)]">
                          <div className="flex items-start gap-3">
                            <UserAvatar
                              user={studentUser}
                              name={tut.petitionerStudentName}
                              photoUrl={studentUser?.photoUrl}
                              role={UserRole.STUDENT}
                              size="md"
                              className="shrink-0 border border-stone-200"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{tut.petitionerStudentName}</p>
                              <p className="mt-0.5 truncate text-xs text-stone-500">{tut.subjectCourseName}</p>
                              <p className="mt-2 text-[11px] text-stone-400">{tut.code} · {tut.reservDate}</p>
                              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-700">
                                <Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                                {tut.score} / 5
                                {(tut.ratings || []).length > 1 && <span className="font-normal text-stone-500">· {tut.ratings?.length} participantes</span>}
                              </p>
                            </div>
                          </div>

                          <div className="min-w-0 border-t border-stone-100 pt-3 sm:pt-0 lg:border-l lg:border-t-0 lg:pl-5">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-400">Comentarios</p>
                            {ratings.length === 0 ? (
                              <p className="text-xs text-stone-400">Se registró la calificación, sin comentario escrito.</p>
                            ) : (
                              <div className="space-y-2.5">
                                {ratings.map((rating: any, index: number) => (
                                  <div key={`${tut.id}-rating-${index}`} className="text-xs">
                                    <p className="flex items-center gap-1.5 font-medium text-slate-700">
                                      <span>{rating.studentName}</span>
                                      <span className="text-stone-300">·</span>
                                      <Star aria-hidden="true" className="h-3 w-3 fill-amber-400 text-amber-500" />
                                      <span>{rating.score}/5</span>
                                    </p>
                                    <p className="mt-1 leading-relaxed text-stone-600">{rating.studentComment?.trim() || 'Sin comentario escrito.'}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* SUCCESS TOASTS */}
      {approvalSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-600 text-white px-5 py-3.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-bottom-4">
          <CheckCircle2 aria-hidden="true" className="w-5 h-5" />
          <span>{approvalSuccess}</span>
        </div>
      )}

      {cancelSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-danger text-white px-5 py-3.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-bottom-4">
          <Ban aria-hidden="true" className="w-5 h-5" />
          <span>{cancelSuccess}</span>
        </div>
      )}

      
        {/* TAB 5: FICHA DOCENTE (REFERENCIA INSTITUCIONAL) */}
        {activeTab === 'profile' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {photoSuccessMsg && (
              <div className="p-4 bg-brand-50 border border-brand-200 text-brand-700 rounded-2xl text-xs flex items-center gap-2.5 font-bold animate-in slide-in-from-top-2 shadow-xs">
                <CheckCircle2 aria-hidden="true" className="w-5 h-5 text-brand-700 shrink-0" />
                <span>{photoSuccessMsg}</span>
              </div>
            )}

            {photoErrorMsg && (
              <div role="alert" className="p-4 bg-danger-soft border border-danger-border text-danger rounded-2xl text-xs flex items-center gap-2.5 font-bold animate-in slide-in-from-top-2 shadow-xs">
                <AlertCircle aria-hidden="true" className="w-5 h-5 text-danger shrink-0" />
                <span>{photoErrorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-5xl">
              {/* Tarjeta de perfil institucional tamaño completo */}
              <div className="lg:col-span-5 flex justify-center">
                <InstitutionalProfileCard
                  user={currentUser}
                  variant="full"
                  canEditPhoto={true}
                  showEmail={false}
                  onSelectPhoto={handleTeacherPhotoSelect}
                  onRemovePhoto={handleTeacherRemovePhoto}
                  isUploadingPhoto={photoUploading}
                  className="w-full max-w-sm"
                />
              </div>

              {/* Panel de Información Académica del Docente */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-5">
                  <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">
                        Ficha Profesional del Docente
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Registro oficial de profesorado en el Sistema de Tutorías FET
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                        Código Docente
                      </span>
                      <span className="font-bold text-slate-900 text-sm font-mono block">
                        {currentUser.account || 'DOC-TITULAR'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                        Programa / Facultad
                      </span>
                      <span className="font-bold text-slate-900 text-xs block leading-tight">
                        {currentUser.careerName || 'Docente Institucional'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                        Calificación Promedio
                      </span>
                      <span className="font-bold text-[#11770e] text-sm block">
                        ⭐ {avgScore ? avgScore.toFixed(1) : '5.0'} / 5.0
                      </span>
                    </div>
                  </div>

                  {/* Catálogo de Asignaturas que orienta */}
                  <div className="pt-2 border-t border-stone-100">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                        Asignaturas Autorizadas ({teacherCatalog.length})
                      </span>
                    </div>

                    {teacherCatalog.length === 0 ? (
                      <p className="text-xs text-stone-400 italic">
                        No tienes asignaturas registradas en tu catálogo. El administrador puede asignártelas desde el panel.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {teacherCatalog.map((sub) => (
                          <span
                            key={sub.id}
                            className="px-3 py-1.5 bg-stone-100 text-slate-800 text-xs font-semibold rounded-xl border border-stone-200/80"
                          >
                            {sub.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Resumen de Franjas de Disponibilidad */}
                  <div className="pt-2 border-t border-stone-100">
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-2">
                      Disponibilidad Semanal Registrada
                    </span>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Actualmente tienes <strong className="text-slate-900">{myAvailabilities.length} franja(s) horaria(s)</strong> activas para recibir solicitudes de estudiantes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: APPROVE TUTORING */}
      {approvingTutoring && (
        <div onClick={(event) => { if (event.target === event.currentTarget) setApprovingTutoring(null); }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-[#fffaed] to-[#fbf7ee] border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-600/15 text-brand-700 flex items-center justify-center font-bold text-xs">
                  <Check aria-hidden="true" className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Aprobar Tutoría {approvingTutoring.code}
                </h3>
              </div>
              <button
                onClick={() => setApprovingTutoring(null)}
                aria-label="Cerrar diálogo de aprobación"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApprove} className="p-6 space-y-4 text-xs">
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-1.5">
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
                      className="w-full rounded-xl border border-stone-200 p-3 text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 transition-colors"
                    />
                    <input
                      type="text"
                      value={assignedBlock}
                      onChange={(e) => setAssignedBlock(e.target.value)}
                      required
                      maxLength={50}
                      placeholder="Bloque o edificio"
                      className="w-full rounded-xl border border-stone-200 p-3 text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 transition-colors"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={assignedSpace}
                    onChange={(e) => setAssignedSpace(e.target.value)}
                    required
                    placeholder="Enlace de videollamada"
                    className="w-full rounded-xl border border-stone-200 p-3 text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 transition-colors"
                  />
                )}
              </div>

              {approvingTutoring.type === 'GROUP' && (
                <div>
                  <label htmlFor="approval-group-capacity" className="block font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1.5">Cupo máximo de participantes (incluye al solicitante)</label>
                  <input id="approval-group-capacity" type="number" min={Math.max(2, approvingTutoring.assistants.length)} max={approvingTutoring.modality === TutoringModality.VIRTUAL ? 30 : undefined} value={confirmedCapacity} onChange={(e) => setConfirmedCapacity(Number(e.target.value))} required className="w-full rounded-xl border border-stone-200 p-3 text-xs" />
                </div>
              )}

              {approvalError && (
                <div role="alert" className="p-3.5 bg-danger-soft border border-danger-border text-danger rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle aria-hidden="true" className="w-4 h-4 text-danger shrink-0" />
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
                  className="h-10 px-5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {approving ? 'Aprobando…' : 'Confirmar Aprobación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CANCEL / REJECT TUTORING */}
      {cancellingTutoring && (
        <div onClick={(event) => { if (event.target === event.currentTarget) setCancellingTutoring(null); }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-danger-soft border-b border-danger-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-danger-soft text-danger flex items-center justify-center font-bold text-xs">
                  <Ban aria-hidden="true" className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-danger text-sm">
                  Rechazar Solicitud {cancellingTutoring.code}
                </h3>
              </div>
              <button
                onClick={() => setCancellingTutoring(null)}
                aria-label="Cerrar diálogo de cancelación"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X aria-hidden="true" className="w-4 h-4" />
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
                  {cancelling ? 'Rechazando…' : 'Confirmar Rechazo'}
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
          variant="teacher-history"
        />
      )}

      {photoToCrop && (
        <ProfilePhotoCropModal
          file={photoToCrop}
          onCancel={() => setPhotoToCrop(null)}
          onCrop={(croppedFile) => {
            setPhotoToCrop(null);
            void handleTeacherPhotoUpload(croppedFile);
          }}
        />
      )}
    </>
  );
};
