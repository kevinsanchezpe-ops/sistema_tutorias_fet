import React from 'react';
import { Tutoring, TutoringModality, User, UserRole } from '../core/types';
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

interface TutoringDetailModalProps {
  tutoring: Tutoring;
  currentUser: User;
  onClose: () => void;
  onOpenEvaluation?: (tutoring: Tutoring) => void;
  onGoToSection?: (section: 'requests' | 'history' | 'tutorings') => void;
}

export const TutoringDetailModal: React.FC<TutoringDetailModalProps> = ({
  tutoring,
  currentUser,
  onClose,
  onOpenEvaluation
}) => {
  const [viewingAttachment, setViewingAttachment] = React.useState<{ fileName: string; fileUrl: string } | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 bg-[#fffaed] border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#11770e]/15 text-[#11770e] flex items-center justify-center font-bold text-xs">
              {tutoring.code || 'TUT'}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Detalle de la Solicitud
              </h3>
              <p className="text-[11px] text-stone-500 font-mono">
                {tutoring.id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={tutoring.status} size="sm" />
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
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
              <BookOpen className="w-3.5 h-3.5 text-[#11770e]" />
              <span>Asignatura: <strong>{tutoring.subjectCourseName}</strong></span>
            </div>

            {tutoring.details && (
              <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed mt-2">
                {tutoring.details}
              </p>
            )}
          </div>

          {/* Archivo Adjunto */}
          {tutoring.attachmentName && (
            <div className="p-3 bg-white border border-stone-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-[#11770e]/10 text-[#11770e] flex items-center justify-center shrink-0">
                  <Paperclip className="w-4 h-4" />
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
                  className="shrink-0 px-3 py-1.5 bg-[#11770e] hover:bg-[#0d5c0b] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ver Archivo</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 italic shrink-0">Sin vista previa</span>
              )}
            </div>
          )}

          {/* Horario y Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#11770e]" />
                Fecha
              </span>
              <p className="text-xs font-semibold text-slate-800">
                {tutoring.reservDate}
              </p>
            </div>

            <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#11770e]" />
                Horario
              </span>
              <p className="text-xs font-semibold text-slate-800">
                {tutoring.scheduleLabel}
              </p>
            </div>
          </div>

          {/* Personas involucradas */}
          <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                  E
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Estudiante Solicitante</span>
                  <span className="font-semibold text-slate-800">{tutoring.petitionerStudentName}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#11770e]/20 text-[#11770e] flex items-center justify-center font-bold text-[10px]">
                  D
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Docente Titular</span>
                  <span className="font-semibold text-slate-800">{tutoring.teacherName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modalidad y Espacio / Link */}
          <div className="p-3.5 bg-[#fffaed] border border-stone-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                {tutoring.modality === TutoringModality.PRESENCIAL ? (
                  <>
                    <MapPin className="w-4 h-4 text-[#11770e]" />
                    Modalidad Presencial
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 text-indigo-600" />
                    Modalidad Virtual
                  </>
                )}
              </span>
              <span className="text-[11px] text-stone-500">
                {tutoring.space ? `Asignado: ${tutoring.space}` : 'Pendiente de confirmación'}
              </span>
            </div>

            {tutoring.modality === TutoringModality.VIRTUAL && tutoring.space && (tutoring.space.startsWith('http://') || tutoring.space.startsWith('https://')) && (
              <a
                href={tutoring.space}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Acceder a Videoconferencia</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Participantes / Asistentes */}
          {tutoring.assistants && tutoring.assistants.length > 0 && (
            <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-bold uppercase text-slate-600 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#11770e]" />
                  Asistentes Registrados ({tutoring.assistants.length})
                </span>
              </div>
              <div className="space-y-1">
                {tutoring.assistants.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-1 px-2 rounded-md bg-slate-50 text-xs">
                    <span className="font-medium text-slate-700">{a.studentName}</span>
                    <span className="text-[10px] text-slate-400">{a.isPetitioner ? 'Solicitante' : 'Par inscrito'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reseña / Calificación si existe */}
          {tutoring.score && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-amber-800 flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                Evaluación del Estudiante ({tutoring.score} / 5 estrellas)
              </span>
              {tutoring.studentComment && (
                <p className="text-xs text-amber-900 italic">"{tutoring.studentComment}"</p>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3 bg-slate-50 border-t border-stone-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            {tutoring.createdAt ? `Creada el ${tutoring.createdAt.split(' ')[0]}` : ''}
          </div>

          <div className="flex items-center gap-2">
            {currentUser.role === UserRole.STUDENT && tutoring.status === 2 && !tutoring.score && onOpenEvaluation && (
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
