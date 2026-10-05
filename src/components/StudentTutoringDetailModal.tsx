import React from 'react';
import { Tutoring, TutoringModality, TutoringStatus, User, UserRole } from '../core/types';
import { StatusBadge } from './StatusBadge';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import { UserAvatar } from './UserAvatar';
import { db } from '../core/infrastructure/database/database';
import {
  X,
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  Video,
  Users,
  Star,
  FileText,
  ExternalLink,
  Paperclip,
  GraduationCap
} from 'lucide-react';

interface StudentTutoringDetailModalProps {
  tutoring: Tutoring;
  currentUser: User;
  onClose: () => void;
  onOpenEvaluation?: (tutoring: Tutoring) => void;
}

export const StudentTutoringDetailModal: React.FC<StudentTutoringDetailModalProps> = ({
  tutoring,
  currentUser,
  onClose,
  onOpenEvaluation
}) => {
  const [viewingAttachment, setViewingAttachment] = React.useState<{ fileName: string; fileUrl: string } | null>(null);
  const creatorName = tutoring.createdByName || tutoring.petitionerStudentName;
  const petitioner = db.users.find((user) => user.id === (tutoring.createdByUserId || tutoring.petitionerStudentId) || user.fullName === creatorName);
  const teacherCreator = (tutoring.createdByRole || tutoring.creatorRole) === UserRole.TEACHER || tutoring.petitionerStudentId === tutoring.teacherId;
  const teacher = db.users.find((user) => user.id === tutoring.teacherId || user.fullName === tutoring.teacherName);
  const participantRatings = tutoring.ratings?.length
    ? tutoring.ratings
    : tutoring.score > 0 && tutoring.studentComment
      ? [{ studentName: creatorName, score: tutoring.score, studentComment: tutoring.studentComment }]
      : [];

  let displayDate = 'Fecha pendiente';
  if (tutoring.reservDate) {
    const parsedDate = new Date(`${tutoring.reservDate}T00:00:00`);
    if (!Number.isNaN(parsedDate.getTime())) {
      displayDate = parsedDate.toLocaleDateString('es-CO', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    } else {
      displayDate = tutoring.reservDate;
    }
  }

  const videoLink = tutoring.modality === TutoringModality.VIRTUAL &&
    (tutoring.space?.startsWith('http://') || tutoring.space?.startsWith('https://'));

  return (
    <div onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[2px] animate-in fade-in sm:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="student-tutoring-detail-title" className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl animate-in zoom-in-95">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-stone-200 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-brand-700">Detalle de tutoría · {tutoring.code}</p>
              <h2 id="student-tutoring-detail-title" className="mt-0.5 truncate text-base font-semibold text-slate-900 sm:text-lg">
                {tutoring.subjectCourseName || tutoring.subject}
              </h2>
              <div className="mt-1.5"><StatusBadge status={tutoring.status} size="sm" /></div>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar detalle de tutoría" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5">
          <section className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
            <div className="flex items-start gap-2.5">
              <BookOpen aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-slate-900">Tema de consulta</h3>
                <p className="mt-1 text-sm font-medium text-slate-800">{tutoring.subject}</p>
              </div>
            </div>
            {tutoring.details && <p className="mt-3 whitespace-pre-wrap rounded-lg border border-stone-200 bg-white p-3 text-sm leading-relaxed text-slate-700">{tutoring.details}</p>}
          </section>

          <section aria-label="Fecha, horario y modalidad" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-stone-200 p-3.5">
              <Calendar aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
              <div><p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">Fecha</p><p className="mt-1 text-sm font-medium capitalize text-slate-800">{displayDate}</p></div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-stone-200 p-3.5">
              <Clock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
              <div><p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">Horario</p><p className="mt-1 text-sm font-medium text-slate-800">{tutoring.reservTime || tutoring.scheduleLabel || 'Por definir'}</p></div>
            </div>
            <div className="flex min-w-0 items-start gap-3 rounded-xl border border-stone-200 p-3.5 sm:col-span-2">
              {tutoring.modality === TutoringModality.PRESENCIAL
                ? <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                : <Video aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">{tutoring.modality === TutoringModality.PRESENCIAL ? 'Sesión presencial' : 'Sesión virtual'}</p>
                <p className="mt-1 break-words text-sm font-medium text-slate-800">
                  {tutoring.space
                    ? `${tutoring.space}${tutoring.modality === TutoringModality.PRESENCIAL && tutoring.block ? ` · Bloque ${tutoring.block}` : ''}`
                    : 'Espacio pendiente de confirmación'}
                </p>
              </div>
              {videoLink && <a href={tutoring.space} target="_blank" rel="noreferrer" className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-brand-700 px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">Acceder <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /></a>}
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold text-slate-900">Personas</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar user={petitioner} name={creatorName} photoUrl={petitioner?.photoUrl} role={teacherCreator ? UserRole.TEACHER : UserRole.STUDENT} size="sm" className="shrink-0 border border-stone-200" />
                <div className="min-w-0"><p className="text-[10px] text-stone-500">{teacherCreator ? 'Convocada por el docente' : 'Estudiante solicitante'}</p><p className="truncate text-sm font-medium text-slate-800">{creatorName}</p></div>
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar user={teacher} name={tutoring.teacherName} photoUrl={teacher?.photoUrl} role={UserRole.TEACHER} size="sm" className="shrink-0 border border-stone-200" />
                <div className="min-w-0"><p className="text-[10px] text-stone-500">Docente</p><p className="truncate text-sm font-medium text-slate-800">{tutoring.teacherName}</p></div>
              </div>
            </div>
            {!!tutoring.assistants?.length && (
              <div className="mt-4 border-t border-stone-100 pt-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-700"><Users aria-hidden="true" className="h-4 w-4 text-stone-500" />Participantes ({tutoring.assistants.length})</div>
                <div className="divide-y divide-stone-100">
                  {tutoring.assistants.map((assistant) => {
                    const assistantUser = db.users.find((user) => user.id === assistant.studentId || user.account === assistant.studentAccount);
                    return (
                      <div key={assistant.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <UserAvatar user={assistantUser} name={assistant.studentName} photoUrl={assistantUser?.photoUrl} role={UserRole.STUDENT} size="xs" />
                          <span className="truncate text-xs font-medium text-slate-800">{assistant.studentName}</span>
                        </div>
                        <span className="shrink-0 text-[10px] text-stone-500">{assistant.isPetitioner ? 'Solicitante' : 'Invitado'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {tutoring.attachmentName && (
            <section className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 p-3.5">
              <div className="flex min-w-0 items-center gap-3"><Paperclip aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-700" /><div className="min-w-0"><p className="text-[10px] text-stone-500">Material adjunto</p><p className="truncate text-sm font-medium text-slate-800">{tutoring.attachmentName}</p></div></div>
              {tutoring.attachmentUrl && <button type="button" onClick={() => setViewingAttachment({ fileName: tutoring.attachmentName || 'Documento adjunto', fileUrl: tutoring.attachmentUrl! })} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"><FileText aria-hidden="true" className="h-3.5 w-3.5" />Ver archivo</button>}
            </section>
          )}

          {tutoring.status === TutoringStatus.CANCELLED && tutoring.cancelReason && (
            <section role="alert" className="rounded-xl border border-danger-border bg-danger-soft p-4"><h3 className="text-xs font-semibold text-danger">Motivo de cancelación</h3><p className="mt-1 text-sm leading-relaxed text-danger">{tutoring.cancelReason}</p></section>
          )}

          {participantRatings.length > 0 && (
            <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-900"><Star aria-hidden="true" className="h-4 w-4 fill-amber-400 text-amber-500" />Evaluaciones
                {tutoring.ratings?.length ? <span className="font-normal text-stone-500">· Promedio {(tutoring.ratings.reduce((sum, rating) => sum + rating.score, 0) / tutoring.ratings.length).toFixed(1)} / 5</span> : null}
              </h3>
              {participantRatings.map((rating, index) => (
                <div key={index} className="rounded-lg border border-amber-100 bg-white p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-800">{rating.studentName} · {rating.score}/5 <Star aria-hidden="true" className="h-3 w-3 fill-amber-400 text-amber-500" /></p>
                  {rating.studentComment && <p className="mt-1 text-sm leading-relaxed text-stone-600">{rating.studentComment}</p>}
                </div>
              ))}
            </section>
          )}
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-stone-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="text-[11px] text-stone-400">{tutoring.createdAt ? `Creada el ${tutoring.createdAt.split(' ')[0]}` : ''}</span>
          <div className="flex items-center justify-end gap-2">
            {currentUser.role === UserRole.STUDENT && tutoring.status === TutoringStatus.COMPLETED && !(tutoring.ratings || []).some((rating) => rating.studentId === currentUser.id) && onOpenEvaluation && (
              <button type="button" onClick={() => { onClose(); onOpenEvaluation(tutoring); }} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"><Star aria-hidden="true" className="h-3.5 w-3.5 fill-white" />Calificar tutoría</button>
            )}
            <button type="button" onClick={onClose} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-200 px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">Cerrar</button>
          </div>
        </footer>
      </section>

      {viewingAttachment && <AttachmentViewerModal fileName={viewingAttachment.fileName} fileUrl={viewingAttachment.fileUrl} onClose={() => setViewingAttachment(null)} />}
    </div>
  );
};
