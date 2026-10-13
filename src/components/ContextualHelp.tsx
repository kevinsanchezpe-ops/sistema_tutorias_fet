import React, { useEffect, useRef, useState } from 'react';
import { HelpCircle, X, ChevronDown, ArrowRight } from 'lucide-react';

export type HelpRole = 'student' | 'teacher' | 'admin';

interface HelpQuestion {
  question: string;
  answer: string;
  section?: string;
  link?: { label: string; section: string };
}

interface ContextualHelpProps {
  role: HelpRole;
  activeSectionId: string;
  onNavigate: (section: string) => void;
}

const sectionLabels: Record<HelpRole, Record<string, string>> = {
  student: { requests: 'Solicitar tutoría', my: 'Mis tutorías', peers: 'Explorar grupales', history: 'Historial', profile: 'Mi perfil' },
  teacher: { tutorings: 'Mis tutorías', convocations: 'Programar tutoría', history: 'Historial', availability: 'Mi disponibilidad', subjects: 'Mis asignaturas', evaluations: 'Evaluaciones', profile: 'Mi perfil' },
  admin: { overview: 'Resumen', careers: 'Carreras', subjects: 'Asignaturas', teachers: 'Docentes', tutorings: 'Solicitudes pendientes', users: 'Estudiantes', binnacle: 'Auditoría del sistema' },
};

const questions: Record<HelpRole, HelpQuestion[]> = {
  student: [
    { question: '¿Cómo solicito una tutoría?', answer: 'En Solicitar tutoría, elige la asignatura y el tema, selecciona modalidad, docente, fecha y horario disponibles, describe qué necesitas y envía la solicitud.', section: 'requests', link: { label: 'Ir a Solicitar tutoría', section: 'requests' } },
    { question: '¿Dónde consulto el estado de mi solicitud?', answer: 'Mis tutorías reúne las solicitudes y sesiones activas. Allí puedes revisar el estado, los detalles y las acciones disponibles para cada tutoría.', section: 'my', link: { label: 'Ir a Mis tutorías', section: 'my' } },
    { question: '¿Cómo me uno a una tutoría grupal?', answer: 'En Explorar grupales puedes consultar tutorías abiertas y unirte cuando haya cupos disponibles.', section: 'peers', link: { label: 'Explorar grupales', section: 'peers' } },
    { question: '¿Cómo consulto tutorías anteriores o califico una sesión?', answer: 'Abre Historial para consultar tutorías finalizadas o canceladas. Las sesiones completadas pueden ofrecer la opción de calificarlas.', section: 'history', link: { label: 'Abrir Historial', section: 'history' } },
    { question: '¿Dónde actualizo mis datos?', answer: 'La sección Mi perfil muestra tu ficha y la información de tu cuenta disponible para consulta.', section: 'profile', link: { label: 'Ver Mi perfil', section: 'profile' } },
  ],
  teacher: [
    { question: '¿Cómo publico mis horarios disponibles?', answer: 'En Mi disponibilidad, selecciona una asignatura y marca los bloques semanales en los que puedes atender. Guarda los cambios para que estén disponibles al solicitar tutorías.', section: 'availability', link: { label: 'Configurar disponibilidad', section: 'availability' } },
    { question: '¿Cómo programo una tutoría?', answer: 'En Programar tutoría, define la asignatura, modalidad y datos solicitados en el formulario. Para una tutoría grupal, configura sus cupos y horario antes de guardarla.', section: 'convocations', link: { label: 'Ir a Programar tutoría', section: 'convocations' } },
    { question: '¿Dónde atiendo las solicitudes que recibo?', answer: 'Mis tutorías muestra las tutorías asignadas y sus acciones disponibles, como revisar detalles y gestionar el avance de la sesión.', section: 'tutorings', link: { label: 'Abrir Mis tutorías', section: 'tutorings' } },
    { question: '¿Dónde consulto sesiones anteriores y evaluaciones?', answer: 'Usa Historial para revisar tutorías finalizadas o canceladas y Evaluaciones para consultar las valoraciones recibidas.', section: 'history', link: { label: 'Ver Historial', section: 'history' } },
    { question: '¿Qué asignaturas tengo asignadas?', answer: 'Mi asignaturas permite consultar el catálogo académico asociado a tu perfil docente.', section: 'subjects', link: { label: 'Ver Mis asignaturas', section: 'subjects' } },
  ],
  admin: [
    { question: '¿Cómo reviso y respondo solicitudes?', answer: 'En Solicitudes pendientes puedes consultar las solicitudes de tutoría y usar las acciones que aparecen para aprobarlas o rechazarlas.', section: 'tutorings', link: { label: 'Revisar solicitudes', section: 'tutorings' } },
    { question: '¿Cómo gestiono estudiantes y docentes?', answer: 'Abre Estudiantes o Docentes desde el grupo Usuarios para ver el listado correspondiente y acceder a sus opciones de gestión.', section: 'users', link: { label: 'Ver estudiantes', section: 'users' } },
    { question: '¿Cómo organizo carreras y asignaturas?', answer: 'En Académico, usa Carreras para administrar programas y Asignaturas para gestionar las materias y su asociación académica.', section: 'subjects', link: { label: 'Gestionar asignaturas', section: 'subjects' } },
    { question: '¿Dónde consulto la actividad del sistema?', answer: 'Auditoría del sistema permite revisar los registros de actividad disponibles para administración.', section: 'binnacle', link: { label: 'Abrir auditoría', section: 'binnacle' } },
    { question: '¿Qué muestra el resumen?', answer: 'Resumen reúne indicadores generales del programa de tutorías para apoyar el seguimiento administrativo.', section: 'overview', link: { label: 'Volver al resumen', section: 'overview' } },
  ],
};

export const ContextualHelp: React.FC<ContextualHelpProps> = ({ role, activeSectionId, onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeLabel = sectionLabels[role][activeSectionId] ?? 'Panel';
  const orderedQuestions = [...questions[role]].sort((a, b) => Number(b.section === activeSectionId) - Number(a.section === activeSectionId));

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="fixed bottom-5 right-5 z-[60]">
      {open && (
        <section id="contextual-help-panel" role="dialog" aria-labelledby="contextual-help-title" className="absolute bottom-[calc(100%+0.75rem)] right-0 flex max-h-[min(70vh,38rem)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
          <header className="flex items-start justify-between gap-3 border-b border-stone-100 bg-white p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Ayuda para {activeLabel}</p>
              <h2 id="contextual-help-title" className="mt-1 text-lg font-bold text-slate-900">Preguntas frecuentes</h2>
              <p className="mt-1 text-sm text-stone-600">Guía rápida para usar tu panel.</p>
            </div>
            <button type="button" onClick={() => { setOpen(false); triggerRef.current?.focus(); }} aria-label="Cerrar ayuda" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-brand-700"><X aria-hidden="true" className="h-5 w-5" /></button>
          </header>
          <div className="overflow-y-auto p-3">
            {orderedQuestions.map((item) => {
              const isExpanded = expanded === item.question;
              return (
                <article key={item.question} className="border-b border-stone-100 last:border-b-0">
                  <button type="button" aria-expanded={isExpanded} onClick={() => setExpanded(isExpanded ? null : item.question)} className="flex min-h-12 w-full items-center justify-between gap-3 px-2 py-3 text-left text-sm font-semibold text-slate-800 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-brand-700">
                    <span>{item.question}</span><ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {isExpanded && <div className="px-2 pb-4 text-sm leading-6 text-stone-600"><p>{item.answer}</p>{item.link && <button type="button" onClick={() => { onNavigate(item.link!.section); setOpen(false); }} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-50 px-3 font-semibold text-brand-800 hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-brand-700">{item.link.label}<ArrowRight aria-hidden="true" className="h-4 w-4" /></button>}</div>}
                </article>
              );
            })}
          </div>
          <footer className="border-t border-stone-100 px-4 py-3 text-xs text-stone-500">Las opciones pueden variar según el estado de cada tutoría.</footer>
        </section>
      )}
      <button ref={triggerRef} type="button" aria-label={open ? 'Cerrar ayuda y preguntas frecuentes' : 'Abrir ayuda y preguntas frecuentes'} aria-expanded={open} aria-controls="contextual-help-panel" onClick={() => setOpen((value) => !value)} className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" title="Ayuda y preguntas frecuentes">
        {open ? <X aria-hidden="true" className="h-5 w-5" /> : <HelpCircle aria-hidden="true" className="h-6 w-6" />}
      </button>
    </div>
  );
};
