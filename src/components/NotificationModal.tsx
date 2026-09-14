import React from 'react';
import { Notification, Tutoring } from '../core/types';
import { ApiClient } from '../core/presentation/api-client';
import { Bell, CheckCheck, X, ArrowUpRight } from 'lucide-react';

interface NotificationModalProps {
  notifications: Notification[];
  userId: string;
  tutorings?: Tutoring[];
  onClose: () => void;
  onRefresh: () => void;
  onSelectTutoring?: (tutoring: Tutoring) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  notifications,
  userId,
  tutorings = [],
  onClose,
  onRefresh,
  onSelectTutoring
}) => {
  const handleMarkAllRead = async () => {
    await ApiClient.markAllNotificationsRead(userId);
    onRefresh();
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await ApiClient.markNotificationRead(notif.id);
      onRefresh();
    }

    // Buscar la tutoría asociada por ID o por coincidencia de código en el texto
    let targetTutoring: Tutoring | undefined;

    if (notif.tutoringId) {
      targetTutoring = tutorings.find((t) => t.id === notif.tutoringId);
    }

    if (!targetTutoring) {
      // Buscar si el código (ej. TUT-001 o #14) está mencionado en el contenido o asunto
      targetTutoring = tutorings.find(
        (t) =>
          (t.code && (notif.content.includes(t.code) || notif.subject.includes(t.code))) ||
          notif.content.includes(t.id) ||
          notif.content.includes(t.subjectCourseName)
      );
    }

    if (targetTutoring && onSelectTutoring) {
      onClose();
      onSelectTutoring(targetTutoring);
    }
  };

  return (
    <div
      id="modal-notifications-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in"
    >
      <div
        id="modal-notifications-card"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-[#fffaed]/70">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#11770e]" />
            <h3 className="text-base font-semibold text-[#2b2b2b]">
              Notificaciones del Sistema
            </h3>
            <span className="text-xs bg-[#eaf8ea] text-[#11770e] font-semibold px-2 py-0.5 rounded-full border border-[#bce6bc]/60">
              {notifications.filter((n) => !n.isRead).length} nuevas
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-mark-all-read"
              onClick={handleMarkAllRead}
              className="text-xs font-medium text-[#11770e] hover:text-[#0d5c0b] flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[#eaf8ea] transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar leídas
            </button>
            <button
              id="btn-close-notifications-modal"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No tiene notificaciones pendientes.
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer group ${
                  notif.isRead
                    ? 'bg-white border-stone-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50/70'
                    : 'bg-[#eaf8ea]/80 border-[#bce6bc] text-slate-900 shadow-xs hover:border-[#11770e]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#11770e] flex items-center gap-1 group-hover:underline">
                    {notif.subject}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {notif.createdAt}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-700">
                  {notif.content}
                </p>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-black/5">
                  {!notif.isRead ? (
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#11770e]">
                      • No leída
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Leída</span>
                  )}
                  <span className="text-[10px] font-medium text-stone-500 group-hover:text-[#11770e] flex items-center gap-0.5">
                    Ver solicitud →
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
