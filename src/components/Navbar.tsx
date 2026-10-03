import React, { useRef, useState } from 'react';
import { Notification, Tutoring, User } from '../core/types';
import {
  Bell,
  LogOut
} from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';

interface NavbarProps {
  currentUser: User;
  allUsers: User[];
  notifications: Notification[];
  tutorings: Tutoring[];
  onSelectUser: (user: User) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onSelectTutoring: (tutoring: Tutoring) => void;
  onOpenRegister: () => void;
  onOpenTests: () => void;
  onLogout: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  notifications,
  tutorings,
  onMarkRead,
  onMarkAllRead,
  onSelectTutoring,
  onLogout
}) => {
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const [notifOpen, setNotifOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);

  const closeNotif = () => {
    setNotifOpen(false);
    bellRef.current?.focus();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img
              src="/logo-fet-verde.png"
              alt="Logo de la Fundación Escuela Tecnológica"
              className="h-9 w-12 shrink-0 object-contain"
            />
            <div>
              <div>
                <span className="font-bold text-stone-900 tracking-tight text-base sm:text-lg">
                  Agendamientos Tutorias FET
                </span>
              </div>
              <p className="text-[11px] text-stone-500 hidden sm:block">
                Fundación Escuela Tecnológica (FET)
              </p>
            </div>
          </div>

          {/* Right Navigation: Current User Profile & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Notification button + anchored dropdown */}
            <div className="relative">
              <button
                id="btn-open-notifications"
                ref={bellRef}
                onClick={() => setNotifOpen((v) => !v)}
                aria-expanded={notifOpen}
                aria-haspopup="dialog"
                aria-controls="notification-panel"
                aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
                className={`relative flex min-h-11 min-w-11 items-center justify-center rounded-xl border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${notifOpen ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50 hover:text-brand-700'}`}
                title={unreadCount > 0 ? `${unreadCount} notificaciones sin leer` : 'Notificaciones'}
              >
                <Bell aria-hidden="true" className="h-[18px] w-[18px]" />
                {unreadCount > 0 && (
                  <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-brand-700 px-1 text-[9px] font-bold leading-none text-white tabular-nums">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <NotificationDropdown
                  notifications={notifications}
                  tutorings={tutorings}
                  onMarkRead={onMarkRead}
                  onMarkAllRead={onMarkAllRead}
                  onSelectTutoring={onSelectTutoring}
                  onClose={closeNotif}
                />
              )}
            </div>

            {/* Logout button */}
            <button
              id="btn-navbar-logout"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-danger-soft hover:text-danger hover:border-danger-border rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Cerrar sesión"
            >
              <LogOut aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
