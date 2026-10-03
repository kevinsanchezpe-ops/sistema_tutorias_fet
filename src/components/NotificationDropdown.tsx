import React, { useEffect, useRef } from 'react';
import { Notification, Tutoring } from '../core/types';
import { Bell, CheckCheck, ChevronRight, CircleCheck, Inbox } from 'lucide-react';

interface NotificationDropdownProps {
  notifications: Notification[];
  tutorings?: Tutoring[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onSelectTutoring?: (tutoring: Tutoring) => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

/** Resuelve la tutoría asociada: tutoringId directo primero, coincidencia por código como legado. */
function resolveTutoring(notif: Notification, tutorings: Tutoring[]): Tutoring | undefined {
  if (notif.tutoringId) {
    const direct = tutorings.find((t) => t.id === notif.tutoringId);
    if (direct) return direct;
  }
  return tutorings.find(
    (t) =>
      (t.code && (notif.content.includes(t.code) || notif.subject.includes(t.code))) ||
      notif.content.includes(t.id) ||
      notif.content.includes(t.subjectCourseName)
  );
}

/**
 * Panel de notificaciones anclado a la campana.
 */
export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  tutorings = [],
  onMarkRead,
  onMarkAllRead,
  onSelectTutoring,
  onClose,
  triggerRef
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const readNotifications = notifications.filter((n) => n.isRead);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [onClose, triggerRef]);

  const handleItemClick = (notif: Notification) => {
    if (!notif.isRead) onMarkRead(notif.id);
    const target = resolveTutoring(notif, tutorings);
    if (target && onSelectTutoring) {
      onClose();
      onSelectTutoring(target);
    }
  };

  return (
    <>
      <div
        id="notification-panel"
        ref={panelRef}
        role="dialog"
        aria-label="Notificaciones del sistema"
        tabIndex={-1}
        className="absolute right-0 top-full z-50 mt-2 flex max-h-[min(72dvh,38rem)] w-[min(92vw,24rem)] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl"
      >
        <header className="border-b border-stone-200 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                {unreadCount > 0 ? <Bell aria-hidden="true" className="h-4 w-4" /> : <CircleCheck aria-hidden="true" className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900">Notificaciones</h3>
                <p className="mt-0.5 text-xs text-stone-500">
                  {unreadCount === 0 ? 'Estás al día' : `${unreadCount} ${unreadCount === 1 ? 'notificación sin leer' : 'notificaciones sin leer'}`}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                id="btn-mark-all-read"
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
              >
                <CheckCheck aria-hidden="true" className="h-4 w-4" />
                <span>Marcar leídas</span>
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto" role="list" aria-label="Lista de notificaciones">
          {notifications.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-stone-400"><Inbox aria-hidden="true" className="h-5 w-5" /></span>
              <p className="mt-3 text-sm font-medium text-slate-800">No tienes notificaciones</p>
              <p className="mt-1 text-xs text-stone-500">Aquí aparecerán las novedades de tus tutorías.</p>
            </div>
          ) : (
            <>
              {unreadNotifications.length > 0 && (
                <section aria-label="Sin leer" role="group">
                  <h4 className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400">Sin leer</h4>
                  <ul className="space-y-1 px-2 pb-2">
                    {unreadNotifications.map((notif) => <NotificationItem key={notif.id} notification={notif} onClick={handleItemClick} />)}
                  </ul>
                </section>
              )}
              {readNotifications.length > 0 && (
                <section aria-label="Anteriores" role="group" className={unreadNotifications.length > 0 ? 'border-t border-stone-100' : ''}>
                  <h4 className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400">Anteriores</h4>
                  <ul className="space-y-1 px-2 pb-2">
                    {readNotifications.map((notif) => <NotificationItem key={notif.id} notification={notif} onClick={handleItemClick} />)}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
        {notifications.length > 0 && <div className="border-t border-stone-100 px-4 py-2.5 text-center text-[10px] text-stone-400">Selecciona una notificación para abrir su tutoría asociada</div>}
      </div>
    </>
  );
};

const NotificationItem: React.FC<{ notification: Notification; onClick: (notification: Notification) => void }> = ({ notification, onClick }) => (
  <li>
    <button
      type="button"
      onClick={() => onClick(notification)}
      className={`group flex min-h-11 w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-700 ${notification.isRead ? 'border-transparent bg-white hover:border-stone-200 hover:bg-stone-50' : 'border-brand-100 bg-brand-50/60 hover:border-brand-200 hover:bg-brand-50'}`}
    >
      <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? 'bg-stone-300' : 'bg-brand-600'}`} />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={`text-xs leading-snug ${notification.isRead ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>{notification.subject}</span>
          <span className="shrink-0 text-[10px] tabular-nums text-stone-400">{notification.createdAt}</span>
        </span>
        <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-stone-500">{notification.content}</span>
      </span>
      <ChevronRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-500" />
    </button>
  </li>
);
