import React, { useState } from 'react';
import { Tutoring, User } from '../core/types';
import { ApiClient } from '../core/presentation/api-client';
import { Star, X, MessageSquare, Award } from 'lucide-react';

interface EvaluationModalProps {
  tutoring: Tutoring;
  currentUser: User;
  onClose: () => void;
  onSuccess: (updated: Tutoring) => void;
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({
  tutoring,
  currentUser,
  onClose,
  onSuccess
}) => {
  const [score, setScore] = useState<number>(5);
  const [hoverScore, setHoverScore] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const res = await ApiClient.rateTutoring(
      {
        tutoringId: tutoring.id,
        score,
        studentComment: comment
      },
      currentUser
    );

    setLoading(false);

    if (res.success && res.data) {
      onSuccess(res.data);
      onClose();
    } else {
      setErrorMsg(res.error?.message || 'Ocurrió un error al registrar la calificación.');
    }
  };

  return (
    <div
      id="modal-evaluation-backdrop"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div
        id="modal-evaluation-card"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-brand-50/70">
          <div className="flex items-center gap-2">
            <Award aria-hidden="true" className="w-5 h-5 text-brand-700" />
            <h3 className="text-base font-semibold text-stone-900">
              Evaluar Tutoría {tutoring.code}
            </h3>
          </div>
          <button
            id="btn-close-evaluation-modal"
            onClick={onClose}
            aria-label="Cerrar evaluación"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X aria-hidden="true" className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 text-sm">
            <div className="font-semibold text-slate-800">{tutoring.subject}</div>
            <div className="text-slate-600 text-xs mt-0.5">
              Docente: <span className="font-medium">{tutoring.teacherName}</span> | Asignatura: {tutoring.subjectCourseName}
            </div>
            <div className="text-slate-500 text-xs mt-0.5">
              Fecha realizada: {tutoring.reservDate} ({tutoring.scheduleLabel})
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Calificación general del tutor (1 a 5 estrellas)
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hoverScore || score) >= star;
                return (
                  <button
                    key={star}
                    id={`btn-star-${star}`}
                    type="button"
                    onMouseEnter={() => setHoverScore(star)}
                    onMouseLeave={() => setHoverScore(0)}
                    onClick={() => setScore(star)}
                    aria-label={`Calificar con ${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
                    aria-pressed={score === star}
                    className="p-1 focus:outline-hidden transition-transform hover:scale-110"
                  >
                    <Star
                      aria-hidden="true"
                      className={`w-8 h-8 ${
                        active
                          ? 'fill-amber-400 text-amber-500'
                          : 'fill-transparent text-slate-300'
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-3 text-sm font-semibold text-warning">
                {score === 5 && '5.0 - Excelente'}
                {score === 4 && '4.0 - Muy buena'}
                {score === 3 && '3.0 - Aceptable'}
                {score === 2 && '2.0 - Regular'}
                {score === 1 && '1.0 - Insuficiente'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <MessageSquare aria-hidden="true" className="w-4 h-4 text-slate-500" />
              Comentario u observaciones de la sesión
            </label>
            <textarea
              id="input-evaluation-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comentario sobre la sesión"
              rows={3}
              required
              minLength={5}
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {errorMsg && (
            <div
              id="alert-evaluation-error"
              role="alert" className="p-3 bg-danger-soft border border-danger-border text-danger rounded-lg text-xs"
            >
              {errorMsg}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              id="btn-submit-evaluation"
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-b from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Guardando…' : 'Enviar Evaluación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
