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
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-2xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-10">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2 md:flex-nowrap md:py-0">
          {/* Brand */}
          <div className="flex shrink-0 items-center gap-3">
            <img
              src="/logo-fet-verde.png"
              alt="Logo de la Fundación Escuela Tecnológica"
              className="h-10 w-14 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <span className="whitespace-nowrap text-sm font-bold tracking-tight text-stone-900 sm:text-base">
                Agendamientos Tutorías FET
              </span>
              <p className="hidden text-[11px] text-stone-500 sm:block">Fundación Escuela Tecnológica (FET)</p>
            </div>
          </div>

          {/* Role navigation is portaled here from the active dashboard. */}
          <div id="dashboard-navigation-slot" className="order-3 min-w-0 basis-full lg:order-none lg:ml-1 lg:flex-1 lg:basis-0 lg:border-l lg:border-stone-300 lg:pl-3 [&>nav]:lg:ml-0 [&>nav]:lg:w-fit" />

          {/* Right Navigation: Current User Profile & Actions */}
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
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
                  triggerRef={bellRef}
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
