import React from 'react';
import { Tutoring, TutoringModality, TutoringStatus, User, UserRole } from '../core/types';
import { StatusBadge } from './StatusBadge';
import {
  X,
  Calendar,
  Clock,
  BookOpen,
  User as UserIcon,
  MapPin,
  Video,
  Users,
  Star,
  MessageSquare,
  FileText,
  ExternalLink,
  ShieldAlert,
  Paperclip
} from 'lucide-react';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import { UserAvatar } from './UserAvatar';
import { db } from '../core/infrastructure/database/database';

interface TutoringDetailModalProps {
  tutoring: Tutoring;
  currentUser: User;
  onClose: () => void;
  onOpenEvaluation?: (tutoring: Tutoring) => void;
  onGoToSection?: (section: 'requests' | 'history' | 'tutorings') => void;
  variant?: 'default' | 'teacher-history' | 'notification' | 'admin-requests';
}

export const TutoringDetailModal: React.FC<TutoringDetailModalProps> = ({
  tutoring,
  currentUser,
  onClose,
  onOpenEvaluation,
  variant = 'default'
}) => {
  const [viewingAttachment, setViewingAttachment] = React.useState<{ fileName: string; fileUrl: string } | null>(null);
  const isTeacherHistory = variant === 'teacher-history';
  const isRedesigned = isTeacherHistory || variant === 'notification' || variant === 'admin-requests';
  const sessionDate = (() => {
    if (!tutoring.reservDate) return 'Sin fecha definida';
    const parsedDate = new Date(`${tutoring.reservDate.slice(0, 10)}T12:00:00`);
    return Number.isNaN(parsedDate.getTime())
      ? tutoring.reservDate
      : parsedDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  })();

  return (
    <div onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className={`w-full overflow-hidden border border-stone-200 bg-white shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 ${isRedesigned ? 'max-w-xl rounded-xl' : 'max-w-lg rounded-2xl'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-stone-200 px-5 py-4 sm:px-6 ${isRedesigned ? 'bg-white' : 'bg-brand-50'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600/15 text-brand-700 flex items-center justify-center font-bold text-xs">
              {tutoring.code || 'TUT'}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                {isRedesigned ? 'Detalle de tutoría' : 'Detalle de la Solicitud'}
              </h3>
              <p className="text-[11px] text-stone-500">
                {isRedesigned ? `Código ${tutoring.code || 'sin asignar'}` : tutoring.id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={tutoring.status} size="sm" />
            <button
              onClick={onClose}
              aria-label="Cerrar detalle"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer ml-1"
            >
              <X aria-hidden="true" className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {isRedesigned ? (
          <div className="space-y-4 overflow-y-auto px-5 py-5 text-sm text-slate-700 sm:px-6">
            <section className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-stone-500">{tutoring.code || 'Tutoría'}</p>
                  <h4 className="mt-1 text-base font-semibold tracking-tight text-slate-900">{tutoring.subjectCourseName || tutoring.subject}</h4>
                  {tutoring.subjectCourseName && tutoring.subject && tutoring.subject !== tutoring.subjectCourseName && <p className="mt-1 text-xs text-stone-500">Tema: {tutoring.subject}</p>}
                </div>
                <StatusBadge status={tutoring.status} size="sm" />
              </div>
              {tutoring.details && <p className="mt-3 border-t border-stone-200 pt-3 text-xs leading-5 text-slate-600">{tutoring.details}</p>}
            </section>

            <section aria-label="Datos de la sesión" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-stone-200 px-3 py-3">
                <p className="flex items-center gap-1.5 text-[11px] text-stone-500"><Calendar aria-hidden="true" className="h-3.5 w-3.5" />Fecha</p>
                <p className="mt-1.5 text-xs font-medium capitalize text-slate-800">{sessionDate}</p>
              </div>
              <div className="rounded-lg border border-stone-200 px-3 py-3">
                <p className="flex items-center gap-1.5 text-[11px] text-stone-500"><Clock aria-hidden="true" className="h-3.5 w-3.5" />Horario</p>
                <p className="mt-1.5 text-xs font-medium text-slate-800">{tutoring.reservTime || tutoring.scheduleLabel || 'Sin horario'}</p>
              </div>
              <div className="col-span-2 rounded-lg border border-stone-200 px-3 py-3 sm:col-span-1">
                <p className="flex items-center gap-1.5 text-[11px] text-stone-500">{tutoring.modality === TutoringModality.PRESENCIAL ? <MapPin aria-hidden="true" className="h-3.5 w-3.5" /> : <Video aria-hidden="true" className="h-3.5 w-3.5" />}Modalidad</p>
                <p className="mt-1.5 text-xs font-medium text-slate-800">{tutoring.modality === TutoringModality.PRESENCIAL ? 'Presencial' : 'Virtual'}</p>
              </div>
            </section>

            <section aria-label="Participantes" className="rounded-xl border border-stone-200 p-4">
              <h4 className="text-xs font-semibold text-slate-800">Participantes</h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(() => {
                  const petitionerUser = db.users.find((u) => u.id === tutoring.petitionerStudentId || u.fullName === tutoring.petitionerStudentName);
                  const teacherUser = db.users.find((u) => u.id === tutoring.teacherId || u.fullName === tutoring.teacherName);
                  return (
                    <>
                      <div className="flex min-w-0 items-center gap-2.5 rounded-lg bg-stone-50 px-3 py-2.5">
                        <UserAvatar user={petitionerUser} name={tutoring.petitionerStudentName} photoUrl={petitionerUser?.photoUrl} role={UserRole.STUDENT} size="sm" />
                        <div className="min-w-0"><p className="text-[10px] text-stone-500">Estudiante</p><p className="truncate text-xs font-medium text-slate-800">{tutoring.petitionerStudentName}</p>{petitionerUser?.account && <p className="mt-0.5 text-[10px] text-stone-500">Carnet {petitionerUser.account}</p>}</div>
                      </div>
                      <div className="flex min-w-0 items-center gap-2.5 rounded-lg bg-stone-50 px-3 py-2.5">
                        <UserAvatar user={teacherUser} name={tutoring.teacherName} photoUrl={teacherUser?.photoUrl} role={UserRole.TEACHER} size="sm" />
                        <div className="min-w-0"><p className="text-[10px] text-stone-500">Docente responsable</p><p className="truncate text-xs font-medium text-slate-800">{tutoring.teacherName}</p></div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </section>

            {(tutoring.space || tutoring.block) && (
              <section aria-label="Lugar o enlace" className="rounded-xl border border-stone-200 px-4 py-3">
                <p className="text-[11px] font-medium text-stone-500">{tutoring.modality === TutoringModality.PRESENCIAL ? 'Espacio asignado' : 'Enlace de sesión'}</p>
                {tutoring.modality === TutoringModality.VIRTUAL && tutoring.space?.startsWith('http') ? (
                  <a href={tutoring.space} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 break-all text-xs font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"><span>Acceder a la sesión</span><ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /></a>
                ) : <p className="mt-1 text-xs font-medium text-slate-800">{tutoring.space || 'Sin asignar'}{tutoring.block ? ` · Bloque ${tutoring.block}` : ''}</p>}
              </section>
            )}

            {tutoring.assistants && tutoring.assistants.length > 0 && (
              <section aria-label="Asistentes registrados" className="rounded-xl border border-stone-200 p-4">
                <h4 className="flex items-center gap-2 text-xs font-semibold text-slate-800"><Users aria-hidden="true" className="h-4 w-4 text-stone-500" />Asistentes <span className="font-normal text-stone-500">{tutoring.assistants.length}</span></h4>
                <ul className="mt-3 divide-y divide-stone-100">
                  {tutoring.assistants.map((assistant) => (
                    <li key={assistant.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                      <span className="truncate text-xs text-slate-700">{assistant.studentName}</span>
                      <span className="shrink-0 text-[10px] text-stone-500">{assistant.isPetitioner ? 'Solicitante' : 'Participante'}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(tutoring.teacherComment || tutoring.score > 0 || tutoring.studentComment || (tutoring.ratings?.length || 0) > 0) && (
              <section aria-label="Evaluación y observaciones" className="rounded-xl border border-stone-200 p-4">
                <h4 className="text-xs font-semibold text-slate-800">Evaluación y observaciones</h4>
                {tutoring.score > 0 && <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-700"><Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />{tutoring.score} / 5</p>}
                {tutoring.studentComment && <p className="mt-2 text-xs leading-5 text-slate-600">“{tutoring.studentComment}”</p>}
                {tutoring.teacherComment && <p className="mt-2 text-xs leading-5 text-slate-600"><span className="font-medium text-slate-700">Observación docente:</span> {tutoring.teacherComment}</p>}
                {tutoring.ratings?.map((rating, index) => <p key={`${rating.studentId || rating.studentName}-${index}`} className="mt-2 text-xs leading-5 text-slate-600"><span className="font-medium text-slate-700">{rating.studentName} · {rating.score}/5:</span> {rating.studentComment || 'Sin comentario'}</p>)}
              </section>
            )}

            {tutoring.status === TutoringStatus.CANCELLED && tutoring.cancelReason && <p role="alert" className="rounded-lg border border-danger-border bg-danger-soft px-3.5 py-3 text-xs text-danger"><span className="font-semibold">Motivo de cancelación:</span> {tutoring.cancelReason}</p>}

            {tutoring.attachmentName && (
              <section className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-2.5"><Paperclip aria-hidden="true" className="h-4 w-4 shrink-0 text-stone-500" /><div className="min-w-0"><p className="text-[10px] text-stone-500">Archivo adjunto</p><p className="truncate text-xs font-medium text-slate-800">{tutoring.attachmentName}</p></div></div>
                {tutoring.attachmentUrl ? <button type="button" onClick={() => setViewingAttachment({ fileName: tutoring.attachmentName || 'Documento adjunto', fileUrl: tutoring.attachmentUrl! })} className="min-h-9 shrink-0 rounded-lg border border-stone-200 px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-stone-50">Ver archivo</button> : <span className="text-[10px] text-stone-400">Sin vista previa</span>}
              </section>
            )}
          </div>
        ) : (
        <div className="p-6 space-y-4 overflow-y-auto text-xs text-slate-700">
          {/* Asunto y Materia */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Asunto / Tema
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  {tutoring.subject}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-stone-700 font-medium pt-1 border-t border-slate-200/60">
              <BookOpen aria-hidden="true" className="w-3.5 h-3.5 text-brand-700" />
              <span>Asignatura: <strong>{tutoring.subjectCourseName}</strong></span>
            </div>

            {tutoring.details && (
              <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed mt-2">
                {tutoring.details}
              </p>
            )}
          </div>

          {/* Motivo de cancelación */}
          {tutoring.status === TutoringStatus.CANCELLED && tutoring.cancelReason && (
            <div role="alert" className="p-3 bg-danger-soft border border-danger-border rounded-xl text-xs text-danger">
              <span className="text-[10px] uppercase font-bold text-danger tracking-wider block mb-1">
                Motivo de cancelación
              </span>
              <span>{tutoring.cancelReason}</span>
            </div>
          )}

          {/* Archivo Adjunto */}
          {tutoring.attachmentName && (
            <div className="p-3 bg-white border border-stone-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-brand-600/10 text-brand-700 flex items-center justify-center shrink-0">
                  <Paperclip aria-hidden="true" className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Documento Adjunto</span>
                  <span className="text-xs font-semibold text-slate-800 truncate block">
                    {tutoring.attachmentName}
                  </span>
                </div>
              </div>
              {tutoring.attachmentUrl ? (
                <button
                  type="button"
                  onClick={() => setViewingAttachment({ fileName: tutoring.attachmentName || 'Documento Adjunto', fileUrl: tutoring.attachmentUrl! })}
                  className="shrink-0 px-3 py-1.5 bg-gradient-to-b from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText aria-hidden="true" className="w-3.5 h-3.5" />
                  <span>Ver Archivo</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 italic shrink-0">Sin vista previa</span>
              )}
            </div>
          )}

          {/* Horario y Fecha */}
          {(() => {
            let dayName = '';
            let formattedDate = tutoring.reservDate || 'Fecha sin definir';
            if (tutoring.reservDate) {
              const parts = tutoring.reservDate.split('-');
              if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const d = new Date(year, month, day);
                const rawDay = d.toLocaleDateString('es-CO', { weekday: 'long' });
                dayName = rawDay.charAt(0).toUpperCase() + rawDay.slice(1);
                const rawMonth = d.toLocaleDateString('es-CO', { month: 'short' });
                formattedDate = `${dayName}, ${day} ${rawMonth} ${year}`;
              }
            }
            return (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-1 shadow-2xs">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                    <Calendar aria-hidden="true" className="w-3.5 h-3.5 text-brand-700" />
                    Fecha Programada
                  </span>
                  <p className="text-xs font-bold text-slate-800">
                    {formattedDate}
                  </p>
                  {tutoring.reservDate && (
                    <span className="text-[10px] font-mono text-stone-400 block">
                      {tutoring.reservDate}
                    </span>
                  )}
                </div>

                <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-1 shadow-2xs">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                    <Clock aria-hidden="true" className="w-3.5 h-3.5 text-brand-700" />
                    Horario
                  </span>
                  <div className="pt-0.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-brand-50 text-brand-700 border border-brand-200/60">
                      {tutoring.reservTime || tutoring.scheduleLabel || 'Por definir'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Personas involucradas */}
          <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-3">
            {(() => {
              const petitionerUser = db.users.find(
                (u) => u.id === tutoring.petitionerStudentId || u.fullName === tutoring.petitionerStudentName
              );
              const teacherUser = db.users.find(
                (u) => u.id === tutoring.teacherId || u.fullName === tutoring.teacherName
              );

              return (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        user={petitionerUser}
                        name={tutoring.petitionerStudentName}
                        photoUrl={petitionerUser?.photoUrl}
                        role={UserRole.STUDENT}
                        size="md"
                        className="border border-brand-200/60 shadow-2xs"
                      />
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-bold block">Estudiante Solicitante</span>
                        <span className="font-bold text-slate-900 text-xs">{tutoring.petitionerStudentName}</span>
                        {petitionerUser?.careerName && (
                          <span className="text-[10px] text-stone-500 block truncate">
                            {petitionerUser.careerName} {petitionerUser.semester ? `• Sem. ${petitionerUser.semester}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        user={teacherUser}
                        name={tutoring.teacherName}
                        photoUrl={teacherUser?.photoUrl}
                        role={UserRole.TEACHER}
                        size="md"
                        className="border border-brand-200/60 shadow-2xs"
                      />
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-bold block">Docente Titular</span>
                        <span className="font-bold text-slate-900 text-xs">{tutoring.teacherName}</span>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Modalidad y Espacio / Link */}
          <div className="p-3.5 bg-brand-50 border border-stone-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                {tutoring.modality === TutoringModality.PRESENCIAL ? (
                  <>
                    <MapPin aria-hidden="true" className="w-4 h-4 text-brand-700" />
                    Modalidad Presencial
                  </>
                ) : (
                  <>
                    <Video aria-hidden="true" className="w-4 h-4 text-info" />
                    Modalidad Virtual
                  </>
                )}
              </span>
              <span className="text-[11px] text-stone-500 font-medium">
                {tutoring.space
                  ? `Asignado: ${tutoring.space}${tutoring.modality === TutoringModality.PRESENCIAL && tutoring.block ? ` (Bloque ${tutoring.block})` : ''}`
                  : 'Pendiente de confirmación'}
              </span>
            </div>

            {tutoring.modality === TutoringModality.VIRTUAL && tutoring.space && (tutoring.space.startsWith('http://') || tutoring.space.startsWith('https://')) && (
              <a
                href={tutoring.space}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-gradient-to-b from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Acceder a Videoconferencia</span>
                <ExternalLink aria-hidden="true" className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Participantes / Asistentes */}
          {tutoring.assistants && tutoring.assistants.length > 0 && (
            <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-bold uppercase text-slate-600 flex items-center gap-1">
                  <Users aria-hidden="true" className="w-3.5 h-3.5 text-brand-700" />
                  Asistentes Registrados ({tutoring.assistants.length})
                </span>
              </div>
              <div className="space-y-1.5">
                {tutoring.assistants.map((a) => {
                  const astUser = db.users.find((u) => u.id === a.studentId || u.account === a.studentAccount);
                  return (
                    <div key={a.id} className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-slate-50 text-xs gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserAvatar
                          user={astUser}
                          name={a.studentName}
                          photoUrl={astUser?.photoUrl}
                          role={UserRole.STUDENT}
                          size="xs"
                        />
                        <span className="font-semibold text-slate-800 truncate">{a.studentName}</span>
                      </div>
                      <span className="text-[10px] text-stone-500 shrink-0 font-medium">{a.isPetitioner ? 'Solicitante' : 'Par inscrito'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reseña / Calificación si existe */}
          {((tutoring.ratings && tutoring.ratings.length > 0) || tutoring.score > 0) && (
            <div className="p-3 bg-warning-soft border border-warning-border rounded-xl space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-amber-800 flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                Evaluaciones de Participantes
                {(tutoring.ratings || []).length > 0
                  ? ` (promedio ${(tutoring.ratings!.reduce((s, r) => s + r.score, 0) / tutoring.ratings!.length).toFixed(1)} / 5)`
                  : ` (${tutoring.score} / 5 estrellas)`}
              </span>
              {(tutoring.ratings && tutoring.ratings.length > 0
                ? tutoring.ratings
                : tutoring.studentComment
                  ? [{ studentName: tutoring.petitionerStudentName, score: tutoring.score, studentComment: tutoring.studentComment }]
                  : []
              ).map((r: any, i: number) => (
                <div key={i} className="bg-white/70 rounded-lg px-2.5 py-1.5 border border-amber-100">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                    {r.studentName} — {r.score}<Star aria-hidden="true" className="w-3 h-3 fill-amber-400 text-amber-500" />
                  </span>
                  {r.studentComment && (
                    <p className="text-xs text-amber-900 italic">"{r.studentComment}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Footer actions */}
        <div className="px-6 py-3 bg-slate-50 border-t border-stone-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            {tutoring.createdAt ? `Creada el ${tutoring.createdAt.split(' ')[0]}` : ''}
          </div>

          <div className="flex items-center gap-2">
            {currentUser.role === UserRole.STUDENT && tutoring.status === TutoringStatus.COMPLETED && !(tutoring.ratings || []).some((r) => r.studentId === currentUser.id) && onOpenEvaluation && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEvaluation(tutoring);
                }}
                className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>Calificar Tutoría</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="py-1.5 px-4 bg-white border border-stone-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

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
