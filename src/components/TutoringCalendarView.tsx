import React, { useState } from 'react';
import { Tutoring, TutoringModality, TutoringStatus, User } from '../core/types';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  MapPin,
  Paperclip,
  Star,
  Users
} from 'lucide-react';

interface TutoringCalendarViewProps {
  tutorings: Tutoring[];
  currentUser: User;
  onSelectTutoring: (tutoring: Tutoring) => void;
  onSelectDate?: (dateStr: string) => void;
}

export const TutoringCalendarView: React.FC<TutoringCalendarViewProps> = ({
  tutorings,
  currentUser,
  onSelectTutoring,
  onSelectDate
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Formatear YYYY-MM-DD local
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayKey = formatDateKey(new Date());

  // Navegación de fechas
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else {
      next.setDate(next.getDate() - 7);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Nombres de meses y días en español
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Agrupar tutorías por fecha reservDate (YYYY-MM-DD)
  const tutoringsByDate: { [dateStr: string]: Tutoring[] } = {};
  tutorings.forEach((t) => {
    if (!tutoringsByDate[t.reservDate]) {
      tutoringsByDate[t.reservDate] = [];
    }
    tutoringsByDate[t.reservDate].push(t);
  });

  // Estilos según el estado de la tutoría
  const getStatusBadgeStyle = (status: TutoringStatus) => {
    switch (status) {
      case TutoringStatus.PENDING:
        return 'bg-warning-soft text-amber-900 border-warning-border hover:bg-warning-border/40';
      case TutoringStatus.APPROVED:
        return 'bg-brand-50 text-brand-700 border-brand-200 hover:bg-[#dcfce4]';
      case TutoringStatus.IN_PROGRESS:
        return 'bg-info-soft text-indigo-900 border-indigo-300 animate-pulse hover:bg-info-border/40';
      case TutoringStatus.COMPLETED:
        return 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200';
      case TutoringStatus.CANCELLED:
        return 'bg-danger-soft text-danger border-danger-border line-through opacity-60 hover:opacity-100';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // --- CÁLCULO DE DÍAS DEL MES ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  let dayOfWeekIndex = firstDayOfMonth.getDay() - 1;
  if (dayOfWeekIndex === -1) dayOfWeekIndex = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const calendarDays: { date: Date; isCurrentMonth: boolean }[] = [];

  // Días del mes anterior
  for (let i = dayOfWeekIndex - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    calendarDays.push({ date: d, isCurrentMonth: false });
  }

  // Días del mes actual
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    calendarDays.push({ date: dateObj, isCurrentMonth: true });
  }

  // Días del mes siguiente
  const totalSlots = calendarDays.length > 35 ? 42 : 35;
  const remaining = totalSlots - calendarDays.length;
  for (let d = 1; d <= remaining; d++) {
    const dateObj = new Date(year, month + 1, d);
    calendarDays.push({ date: dateObj, isCurrentMonth: false });
  }

  // --- CÁLCULO DE DÍAS DE LA SEMANA ---
  const startOfWeek = new Date(currentDate);
  const currentDayIndex = startOfWeek.getDay() - 1 === -1 ? 6 : startOfWeek.getDay() - 1;
  startOfWeek.setDate(startOfWeek.getDate() - currentDayIndex);

  const weekDaysList: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    weekDaysList.push(d);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
      {/* Bar de Controles e Información del Calendario */}
      <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span>{monthNames[month]} {year}</span>
            {viewMode === 'week' && (
              <span className="text-xs font-normal text-slate-500">
                (Semana del {weekDaysList[0].getDate()} al {weekDaysList[6].getDate()} de {monthNames[weekDaysList[6].getMonth()]})
              </span>
            )}
          </h3>
          <p className="text-[11px] text-slate-500">
            {tutorings.length} tutoría{tutorings.length === 1 ? '' : 's'} en el sistema
          </p>
        </div>

        {/* Botones de Navegación y Conmutador Mes/Semana */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white border border-stone-300 rounded-xl overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Período anterior"
              aria-label="Período anterior"
            >
              <ChevronLeft aria-hidden="true" className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 border-x border-stone-200 cursor-pointer"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Período siguiente"
              aria-label="Período siguiente"
            >
              <ChevronRight aria-hidden="true" className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center bg-slate-200 p-0.5 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white text-brand-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mes
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-white text-brand-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semana
            </button>
          </div>
        </div>
      </div>

      {/* Leyenda de Estados */}
      <div className="px-4 py-1 flex items-center gap-3 text-[11px] overflow-x-auto text-slate-600">
        <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Leyenda:</span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pendiente
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-600" /> Programada
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-info" /> En Proceso
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500" /> Finalizada
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-danger" /> Cancelada
        </span>
      </div>

      {/* VISTA MES */}
      {viewMode === 'month' && (
        <div className="p-4 pt-0">
          <div className="grid grid-cols-7 border-b border-slate-200 text-center font-bold text-xs text-slate-500 uppercase pb-2">
            {weekDays.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 border-l border-t border-slate-200 mt-1">
            {calendarDays.map(({ date, isCurrentMonth }, idx) => {
              const dateStr = formatDateKey(date);
              const dayTutorings = tutoringsByDate[dateStr] || [];
              const isToday = dateStr === todayKey;

              return (
                <div
                  key={idx}
                  role={onSelectDate ? 'button' : undefined}
                  tabIndex={onSelectDate ? 0 : undefined}
                  aria-label={onSelectDate ? `Agendar el ${date.getDate()} de ${monthNames[month]}` : undefined}
                  onClick={() => onSelectDate && onSelectDate(dateStr)}
                  onKeyDown={(e) => {
                    if (onSelectDate && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onSelectDate(dateStr);
                    }
                  }}
                  className={`min-h-[110px] p-1.5 border-r border-b border-slate-200 transition-colors ${
                    isCurrentMonth ? 'bg-white' : 'bg-slate-50/50 text-slate-400'
                  } ${isToday ? 'bg-brand-50/30' : ''} ${onSelectDate ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold inline-flex items-center justify-center w-5 h-5 rounded-full ${
                        isToday
                          ? 'bg-brand-600 text-white'
                          : isCurrentMonth
                          ? 'text-slate-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {dayTutorings.length > 0 && (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-full">
                        {dayTutorings.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 max-h-[85px] overflow-y-auto">
                    {dayTutorings.map((tut) => (
                      <button
                        key={tut.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTutoring(tut);
                        }}
                        className={`w-full text-left p-1 rounded-md border text-[10px] transition-colors cursor-pointer truncate flex items-center justify-between gap-1 shadow-2xs ${getStatusBadgeStyle(
                          tut.status
                        )}`}
                        title={`${tut.code} - ${tut.subject} (${tut.scheduleLabel})`}
                      >
                        <div className="truncate flex items-center gap-1">
                          <span className="font-bold shrink-0">{tut.code}</span>
                          <span className="truncate">{tut.subject}</span>
                        </div>
                        {tut.attachmentName && (
                          <Paperclip aria-hidden="true" className="w-2.5 h-2.5 shrink-0 opacity-75" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA SEMANA */}
      {viewMode === 'week' && (
        <div className="p-4 pt-0 overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[700px] border border-slate-200 rounded-xl overflow-hidden divide-x divide-slate-200">
            {weekDaysList.map((date, idx) => {
              const dateStr = formatDateKey(date);
              const dayTutorings = tutoringsByDate[dateStr] || [];
              const isToday = dateStr === todayKey;

              return (
                <div
                  key={idx}
                  role={onSelectDate ? 'button' : undefined}
                  tabIndex={onSelectDate ? 0 : undefined}
                  aria-label={onSelectDate ? `Agendar el ${date.getDate()} de ${monthNames[date.getMonth()]}` : undefined}
                  onClick={() => onSelectDate && onSelectDate(dateStr)}
                  onKeyDown={(e) => {
                    if (onSelectDate && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onSelectDate(dateStr);
                    }
                  }}
                  className={`min-h-[350px] p-2 bg-white flex flex-col ${
                    isToday ? 'bg-brand-50/30' : ''
                  } ${onSelectDate ? 'cursor-pointer hover:bg-slate-50/80' : ''}`}
                >
                  <div className="text-center pb-2 border-b border-slate-100 mb-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      {weekDays[idx]}
                    </span>
                    <span
                      className={`text-sm font-black inline-flex items-center justify-center w-7 h-7 rounded-full mt-0.5 ${
                        isToday ? 'bg-brand-600 text-white shadow-2xs' : 'text-slate-800'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto">
                    {dayTutorings.length === 0 ? (
                      <div className="text-center py-6 text-[11px] text-slate-300 italic">
                        Sin tutorías
                      </div>
                    ) : (
                      dayTutorings.map((tut) => (
                        <div
                          key={tut.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Ver detalle de ${tut.code}, ${tut.subject}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTutoring(tut);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              onSelectTutoring(tut);
                            }
                          }}
                          className={`p-2 rounded-xl border text-xs shadow-2xs cursor-pointer space-y-1 transition-transform hover:-translate-y-0.5 ${getStatusBadgeStyle(
                            tut.status
                          )}`}
                        >
                          <div className="flex items-center justify-between gap-1 font-bold text-[11px]">
                            <span>{tut.code}</span>
                            <span className="flex items-center gap-0.5 text-[10px] opacity-80">
                              <Clock aria-hidden="true" className="w-2.5 h-2.5" />
                              {tut.scheduleLabel}
                            </span>
                          </div>

                          <div className="font-semibold line-clamp-2 leading-tight">
                            {tut.subject}
                          </div>

                          <div className="text-[10px] opacity-90 truncate font-medium">
                            {tut.subjectCourseName}
                          </div>

                          <div className="pt-1 border-t border-black/10 flex items-center justify-between text-[10px] opacity-90">
                            <span className="truncate flex items-center gap-1">
                              {tut.modality === TutoringModality.PRESENCIAL ? (
                                <MapPin aria-hidden="true" className="w-2.5 h-2.5 shrink-0" />
                              ) : (
                                <Video aria-hidden="true" className="w-2.5 h-2.5 shrink-0" />
                              )}
                              <span className="truncate max-w-[80px]">{tut.space || 'Pendiente'}</span>
                            </span>
                            {tut.attachmentName && (
                              <Paperclip aria-hidden="true" className="w-3 h-3 shrink-0 text-brand-700" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
