import React from 'react';
import { Notification, User, UserRole } from '../core/types';
import {
  GraduationCap,
  Bell,
  LogOut,
  User as UserIcon,
  Shield,
  Briefcase
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';

interface NavbarProps {
  currentUser: User;
  allUsers: User[];
  notifications: Notification[];
  onSelectUser: (user: User) => void;
  onOpenNotifications: () => void;
  onOpenRegister: () => void;
  onOpenTests: () => void;
  onLogout: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  notifications,
  onOpenNotifications,
  onLogout
}) => {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.STUDENT:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Estudiante</span>
          </span>
        );
      case UserRole.TEACHER:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#eaf8ea] text-[#11770e] border border-[#bce6bc] shadow-2xs">
            <Briefcase className="w-3.5 h-3.5 text-[#11770e]" />
            <span>Docente</span>
          </span>
        );
      case UserRole.ADMIN:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>Administrador</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#11770e] flex items-center justify-center text-white shadow-sm shadow-[#11770e]/20 border border-[#7ce200]/40">
              <GraduationCap className="w-5 h-5 text-[#fffaed]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#2b2b2b] tracking-tight text-base sm:text-lg">
                  Agendamientos Tutorias FET
                </span>
                {getRoleBadge(currentUser.role)}
              </div>
              <p className="text-[11px] text-stone-500 hidden sm:block">
                Fundación Escuela Tecnológica (FET)
              </p>
            </div>
          </div>

          {/* Right Navigation: Current User Profile & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* User identity card */}
            <div className="hidden sm:flex items-center gap-2.5 pl-2 pr-3 py-1.5 bg-[#fffaed]/70 border border-stone-200 rounded-xl">
              <UserAvatar
                user={currentUser}
                size="sm"
                className="border border-[#bce6bc]/50 shadow-2xs"
              />
              <div className="text-left">
                <p className="text-xs font-semibold text-[#2b2b2b] leading-tight truncate max-w-[160px]">
                  {currentUser.fullName}
                </p>
                <p className="text-[10px] text-stone-500 font-mono">
                  {currentUser.account || currentUser.username}
                </p>
              </div>
            </div>

            {/* Notification button */}
            <button
              id="btn-open-notifications"
              onClick={onOpenNotifications}
              className="relative p-2 text-stone-600 hover:text-[#11770e] hover:bg-[#eaf8ea] rounded-lg transition-colors cursor-pointer"
              title="Notificaciones"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#11770e] text-[10px] font-bold text-[#fffaed] shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Logout button */}
            <button
              id="btn-navbar-logout"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 rounded-lg transition-all cursor-pointer shadow-2xs"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
