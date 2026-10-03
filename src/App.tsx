import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
const StudentDashboard = lazy(() => import('./components/StudentDashboard').then((module) => ({ default: module.StudentDashboard })));
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard').then((module) => ({ default: module.TeacherDashboard })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));
const EvaluationModal = lazy(() => import('./components/EvaluationModal').then((module) => ({ default: module.EvaluationModal })));
const RegisterModal = lazy(() => import('./components/RegisterModal').then((module) => ({ default: module.RegisterModal })));
const TestsModal = lazy(() => import('./components/TestsModal').then((module) => ({ default: module.TestsModal })));
import { AuthView } from './components/AuthView';
import { ChangePasswordView } from './components/ChangePasswordView';
const TutoringDetailModal = lazy(() => import('./components/TutoringDetailModal').then((module) => ({ default: module.TutoringDetailModal })));
import { ApiClient } from './core/presentation/api-client';
import { db } from './core/infrastructure/database/database';
import {
  BinnacleEntry,
  Career,
  InstitutionInfo,
  Notification,
  ScheduleSlot,
  SectionClassroom,
  SubjectCourse,
  TeacherAvailability,
  Tutoring,
  User,
  UserRole
} from './core/types';
import { ShieldCheck, UserCheck, BookOpen, Clock, LogOut, LogIn, UserPlus, MapPin, Phone, Mail } from 'lucide-react';

export default function App() {
  // Session authentication state - starts at null so user sees Login / Register screen
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('gt_auth_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) return parsed;
      }
    } catch (e) {}
    return null;
  });

  const [dbHealth, setDbHealth] = useState<{ status: string; database: string; error?: string } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [allUsers, setAllUsers] = useState<User[]>(() => [...db.users]);
  const [tutorings, setTutorings] = useState<Tutoring[]>(() => [...db.tutorings]);
  const [subjects, setSubjects] = useState<SubjectCourse[]>(() => [...db.subjects]);
  const [careers, setCareers] = useState<Career[]>(() => [...db.careers]);
  const [schedules, setSchedules] = useState<ScheduleSlot[]>(() => [...db.scheduleSlots]);
  const [sections, setSections] = useState<SectionClassroom[]>(() => [...db.sections]);
  const [availabilities, setAvailabilities] = useState<TeacherAvailability[]>(() => [...db.teacherAvailability]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [binnacle, setBinnacle] = useState<BinnacleEntry[]>([]);
  const [institution, setInstitution] = useState<InstitutionInfo>(() => ({ ...db.institution }));
  const [analytics, setAnalytics] = useState<any>(null);

  // Modals state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showTests, setShowTests] = useState(false);
  const [evaluatingTutoring, setEvaluatingTutoring] = useState<Tutoring | null>(null);
  const [selectedTutoringDetail, setSelectedTutoringDetail] = useState<Tutoring | null>(null);

  // Refresh all state from reactive database
  const refreshData = async () => {
    try {
      const health = await ApiClient.getHealth();
      setDbHealth(health);
    } catch (e) {}

    // Catálogos públicos siempre; datos sensibles solo con sesión (evita 401s en login)
    const hasSession = (() => {
      try {
        return !!localStorage.getItem('gt_auth_user');
      } catch {
        return false;
      }
    })();
    const [uRes, tRes, sRes, schRes, secRes, avRes, bRes, instRes, anRes, cRes] = await Promise.all([
      hasSession ? ApiClient.getUsers() : Promise.resolve({ success: false as const, data: undefined }),
      hasSession ? ApiClient.getTutorings() : Promise.resolve({ success: false as const, data: undefined }),
      ApiClient.getSubjects(),
      ApiClient.getScheduleSlots(),
      ApiClient.getSections(),
      ApiClient.getTeacherAvailability(),
      hasSession ? ApiClient.getBinnacle() : Promise.resolve({ success: false as const, data: undefined }),
      ApiClient.getInstitution(),
      hasSession ? ApiClient.getAnalytics() : Promise.resolve({ success: false as const, data: undefined }),
      ApiClient.getCareers()
    ]);

    if (uRes.data) {
      setAllUsers(uRes.data);
      // Sync in-memory db so components reading db.users directly get fresh data (e.g. photoUrl)
      db.users = uRes.data;
    }
    if (tRes.data) setTutorings(tRes.data);
    if (sRes.data) setSubjects(sRes.data);
    if (schRes.data) setSchedules(schRes.data);
    if (secRes.data) setSections(secRes.data);
    if (avRes.data) setAvailabilities(avRes.data);
    if (bRes.data) setBinnacle(bRes.data);
    if (instRes.data) setInstitution(instRes.data);
    if (anRes.data) setAnalytics(anRes.data);
    if (cRes.data) setCareers(cRes.data);

    if (currentUser) {
      const nRes = await ApiClient.getNotifications(currentUser.id);
      if (nRes.data) setNotifications(nRes.data);

      // Keep current user updated if changed in DB and session is still valid
      const updatedCurr = uRes.data?.find((u) => u.id === currentUser.id);
      if (updatedCurr && localStorage.getItem('gt_auth_user')) {
        setCurrentUser(updatedCurr);
      } else if (!uRes.data && localStorage.getItem('gt_auth_user')) {
        // Offline fallback: sync currentUser from in-memory db (e.g. after photo upload)
        const dbUser = db.users.find((u) => u.id === currentUser.id);
        if (dbUser) {
          setCurrentUser({ ...dbUser });
        }
      }
    }
  };

  // Subscribe to DB notifications
  useEffect(() => {
    refreshData();
    const unsubscribe = db.subscribe(() => {
      // If user logged out (no storage), do not trigger state refresh that could re-bind
      if (!localStorage.getItem('gt_auth_user')) return;
      refreshData();
    });
    return () => unsubscribe();
  }, [currentUser?.id]);

  // Renovación deslizante de sesión (token 2h): refresca cada 90 min si hay sesión
  useEffect(() => {
    if (!currentUser) return;
    const id = window.setInterval(async () => {
      try {
        const res = await ApiClient.refreshSession();
        if (!res.success) {
          handleLogout();
        }
      } catch {
        /* offline: se reintenta en el siguiente ciclo */
      }
    }, 90 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [currentUser?.id]);

  // Handle Login success
  const handleLoginSuccess = (user: User) => {
    try {
      localStorage.setItem('gt_auth_user_id', user.id);
      localStorage.setItem('gt_auth_user', JSON.stringify(user));
    } catch (e) {}
    setCurrentUser(user);
  };

  // Handle password change (clears mustChangePassword and refresh session)
  const handlePasswordChanged = (user: User) => {
    try {
      localStorage.setItem('gt_auth_user', JSON.stringify(user));
    } catch (e) {}
    setCurrentUser(user);
  };

  // Handle Logout (limpia cookie HttpOnly en servidor + sesión local)
  const handleLogout = () => {
    ApiClient.logout().catch(() => {});
    try {
      localStorage.clear(); // Limpiar de raíz todo token, usuario y clave temporal
    } catch (e) {}
    setCurrentUser(null);
    setAuthMode('login');
  };

  // Optimistic read: actualiza el badge al instante y reconcilia en segundo plano.
  // (ApiClient notifica a los listeners y refreshData reconcilia sin vaciar la vista.)
  const handleMarkNotificationRead = async (id: string) => {
    const prev = notifications;
    setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    const res = await ApiClient.markNotificationRead(id);
    if (!res.success) setNotifications(prev);
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!currentUser) return;
    const prev = notifications;
    setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })));
    const res = await ApiClient.markAllNotificationsRead(currentUser.id);
    if (!res.success) setNotifications(prev);
  };

  // Role Switcher helper
  const handleSwitchRole = (role: UserRole) => {
    const targetUser = allUsers.find((u) => u.role === role);
    if (targetUser) {
      handleLoginSuccess(targetUser);
    }
  };

  // Banner if DB is not connected
  const renderDbBanner = () => {
    if (dbHealth && dbHealth.status !== 'ok') {
      return (
        <div className="bg-amber-500 text-slate-900 px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <span className="bg-amber-700 text-white rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Aviso PostgreSQL</span>
            <span>
              La base de datos PostgreSQL local no está conectada. Abre tu archivo <code className="bg-amber-600/30 px-1 py-0.5 rounded text-amber-950 font-mono">.env</code> en el proyecto y coloca tu contraseña en <code className="bg-amber-600/30 px-1 py-0.5 rounded text-amber-950 font-mono">PGPASSWORD</code> o <code className="bg-amber-600/30 px-1 py-0.5 rounded text-amber-950 font-mono">DATABASE_URL</code>.
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // If user is not authenticated, display full Login / Register screen
  if (!currentUser) {
    return (
      <>
        {renderDbBanner()}
        <AuthView
          initialMode={authMode}
          onLoginSuccess={handleLoginSuccess}
          onOpenTests={() => setShowTests(true)}
        />
        {showTests && <Suspense fallback={null}><TestsModal onClose={() => setShowTests(false)} /></Suspense>}
      </>
    );
  }

  // Force password change for accounts with a temporary credential
  if (currentUser.mustChangePassword) {
    return (
      <>
        {renderDbBanner()}
        <ChangePasswordView
          currentUser={currentUser}
          onPasswordChanged={handlePasswordChanged}
          onLogout={handleLogout}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-brand-50/40 text-stone-900 flex flex-col font-sans antialiased selection:bg-brand-600 selection:text-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[70] focus:bg-white focus:text-brand-800 focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold focus:text-xs"
      >
        Saltar al contenido principal
      </a>
      {renderDbBanner()}
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        allUsers={allUsers}
        notifications={notifications}
        tutorings={tutorings}
        onSelectUser={handleLoginSuccess}
        onMarkRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onSelectTutoring={(tut) => setSelectedTutoringDetail(tut)}
        onOpenRegister={() => setShowRegisterModal(true)}
        onOpenTests={() => setShowTests(true)}
        onLogout={handleLogout}
        onOpenAuth={(mode) => {
          setAuthMode(mode || 'login');
          setCurrentUser(null);
        }}
      />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentUser.role === UserRole.STUDENT && (
          <Suspense fallback={<div className="rounded-xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-500">Cargando panel estudiantil…</div>}>
            <StudentDashboard
            currentUser={currentUser}
            tutorings={tutorings}
            subjects={subjects}
            schedules={schedules}
            availabilities={availabilities}
            onRefresh={refreshData}
            onOpenEvaluation={(tut) => setEvaluatingTutoring(tut)}
            />
          </Suspense>
        )}

        {currentUser.role === UserRole.TEACHER && (
          <Suspense fallback={<div className="rounded-xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-500">Cargando panel docente…</div>}>
            <TeacherDashboard
            currentUser={currentUser}
            tutorings={tutorings}
            availabilities={availabilities}
            schedules={schedules}
            subjects={subjects}
            sections={sections}
            onRefresh={refreshData}
            />
          </Suspense>
        )}

        {currentUser.role === UserRole.ADMIN && (
          <Suspense fallback={<div className="rounded-xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-500">Cargando panel administrativo…</div>}>
            <AdminDashboard
            currentUser={currentUser}
            tutorings={tutorings}
            subjects={subjects}
            careers={careers}
            users={allUsers}
            binnacle={binnacle}
            schedules={schedules}
            sections={sections}
            onRefresh={refreshData}
            analytics={analytics}
            onOpenRegister={() => setShowRegisterModal(true)}
            onOpenTests={() => setShowTests(true)}
            />
          </Suspense>
        )}
      </main>

      {/* Footer institucional */}
      <footer className="mt-auto border-t-2 border-brand-600 bg-slate-950 text-slate-300">
        <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr] xl:gap-12">
            <div className="sm:col-span-2 xl:col-span-1">
              <div className="flex items-center gap-4">
                <img src="/logo-fet-blanco.png" alt="FET" className="h-14 w-20 shrink-0 object-contain" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight text-white">Tutorías FET</p>
                  <p className="mt-0.5 text-xs text-slate-400">Fundación Escuela Tecnológica de Neiva</p>
                </div>
              </div>
              <p className="mt-4 max-w-md text-xs leading-5 text-slate-400">
                Plataforma para solicitar y gestionar tutorías académicas presenciales y virtuales entre docentes y estudiantes.
              </p>
            </div>

            <section aria-labelledby="footer-campus-title">
              <h2 id="footer-campus-title" className="text-xs font-semibold text-white">Sede principal</h2>
              <ul className="mt-3 space-y-2.5 text-xs text-slate-400">
                <li className="flex items-start gap-2.5">
                  <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                  <span>Kilómetro 12, vía Neiva – Rivera</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                  <a href="mailto:gestiontutorias@fet.edu.co" className="break-all transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-brand-400">
                    gestiontutorias@fet.edu.co
                  </a>
                </li>
              </ul>
            </section>

            <section aria-labelledby="footer-service-title">
              <h2 id="footer-service-title" className="text-xs font-semibold text-white">Atención al ciudadano</h2>
              <ul className="mt-3 space-y-2.5 text-xs text-slate-400">
                <li className="flex items-start gap-2.5">
                  <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                  <span>Calle 12 #5-59, Neiva, Huila</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Phone aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                  <span>6088674935 · (+57) 3223041567</span>
                </li>
              </ul>
            </section>
          </div>

          <div className="mt-7 flex flex-col gap-2 border-t border-white/10 pt-4 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Fundación Escuela Tecnológica de Neiva - FET. Todos los derechos reservados.</span>
            <span>Sistema Institucional de Gestión de Tutorías Académicas</span>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {selectedTutoringDetail && (
        <Suspense fallback={null}>
          <TutoringDetailModal
            tutoring={selectedTutoringDetail}
            currentUser={currentUser}
            onClose={() => setSelectedTutoringDetail(null)}
            onOpenEvaluation={(tut) => setEvaluatingTutoring(tut)}
            variant="notification"
          />
        </Suspense>
      )}

      {showRegisterModal && (
        <Suspense fallback={null}>
          <RegisterModal
            careers={careers}
            onClose={() => setShowRegisterModal(false)}
            onSuccess={() => refreshData()}
          />
        </Suspense>
      )}

      {showTests && <Suspense fallback={null}><TestsModal onClose={() => setShowTests(false)} /></Suspense>}

      {evaluatingTutoring && (
        <Suspense fallback={null}>
          <EvaluationModal
            tutoring={evaluatingTutoring}
            currentUser={currentUser}
            onClose={() => setEvaluatingTutoring(null)}
            onSuccess={() => refreshData()}
          />
        </Suspense>
      )}
    </div>
  );
}
