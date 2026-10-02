import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { StudentDashboard } from './components/StudentDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { EvaluationModal } from './components/EvaluationModal';
import { RegisterModal } from './components/RegisterModal';
import { NotificationModal } from './components/NotificationModal';
import { TestsModal } from './components/TestsModal';
import { AuthView } from './components/AuthView';
import { ChangePasswordView } from './components/ChangePasswordView';
import { TutoringDetailModal } from './components/TutoringDetailModal';
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
import { GraduationCap, ShieldCheck, UserCheck, BookOpen, Clock, LogOut, LogIn, UserPlus, MapPin, Phone, Mail } from 'lucide-react';

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
  const [showNotifications, setShowNotifications] = useState(false);
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

    const [uRes, tRes, sRes, schRes, secRes, avRes, bRes, instRes, anRes, cRes] = await Promise.all([
      ApiClient.getUsers(),
      ApiClient.getTutorings(),
      ApiClient.getSubjects(),
      ApiClient.getScheduleSlots(),
      ApiClient.getSections(),
      ApiClient.getTeacherAvailability(),
      ApiClient.getBinnacle(),
      ApiClient.getInstitution(),
      ApiClient.getAnalytics(),
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
        {showTests && <TestsModal onClose={() => setShowTests(false)} />}
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
    <div className="min-h-screen bg-[#fffaed]/40 text-[#2b2b2b] flex flex-col font-sans antialiased selection:bg-[#11770e] selection:text-white">
      {renderDbBanner()}
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        allUsers={allUsers}
        notifications={notifications}
        onSelectUser={handleLoginSuccess}
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenRegister={() => setShowRegisterModal(true)}
        onOpenTests={() => setShowTests(true)}
        onLogout={handleLogout}
        onOpenAuth={(mode) => {
          setAuthMode(mode || 'login');
          setCurrentUser(null);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentUser.role === UserRole.STUDENT && (
          <StudentDashboard
            currentUser={currentUser}
            tutorings={tutorings}
            subjects={subjects}
            schedules={schedules}
            availabilities={availabilities}
            onRefresh={refreshData}
            onOpenEvaluation={(tut) => setEvaluatingTutoring(tut)}
          />
        )}

        {currentUser.role === UserRole.TEACHER && (
          <TeacherDashboard
            currentUser={currentUser}
            tutorings={tutorings}
            availabilities={availabilities}
            schedules={schedules}
            subjects={subjects}
            sections={sections}
            onRefresh={refreshData}
          />
        )}

        {currentUser.role === UserRole.ADMIN && (
          <AdminDashboard
            currentUser={currentUser}
            tutorings={tutorings}
            subjects={subjects}
            careers={careers}
            users={allUsers}
            binnacle={binnacle}
            institution={institution}
            schedules={schedules}
            sections={sections}
            onRefresh={refreshData}
            analytics={analytics}
          />
        )}
      </main>

      {/* Footer Institucional y Profesional */}
      <footer className="bg-[#2b2b2b] text-slate-300 border-t border-[#3b3b3b] mt-auto">
        {/* Main Footer Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Columna 1: Identidad Institucional */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#11770e] flex items-center justify-center text-white font-bold shadow-md shadow-[#11770e]/30 border border-[#7ce200]/30">
                  <GraduationCap className="w-6 h-6 text-[#fffaed]" />
                </div>
                <div>
                  <span className="text-base font-bold tracking-tight text-white block">
                    Agendamientos Tutorias FET
                  </span>
                  <span className="text-xs text-[#7ce200] font-medium">
                    {institution.name}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {institution.mission || 'Plataforma oficial para la gestión, reserva y seguimiento pedagógico integral de tutorías universitarias presenciales y virtuales.'}
              </p>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#11770e]/20 border border-[#11770e]/40 text-[11px] text-[#fffaed]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#7ce200]" />
                <span>Acompañamiento Académico Certificado</span>
              </div>
            </div>

            {/* Columna 2: Sedes y Contacto */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-[#fffaed] border-b border-[#3b3b3b] pb-2">
                Sedes y Contacto
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#7ce200] shrink-0 mt-0.5" />
                  <span>{institution.address || 'Kilómetro 12 Vía al Sur, Rivera - Huila'}, Neiva, Huila</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#7ce200] shrink-0" />
                  <span>{institution.phone || '(+57) 8 838 8000'}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#7ce200] shrink-0" />
                  <a href={`mailto:${institution.email}`} className="hover:text-[#7ce200] transition-colors">
                    {institution.email || 'tutorias@fet.edu.co'}
                  </a>
                </li>
              </ul>
            </div>

            {/* Columna 3: Canales de Tutoría */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-[#fffaed] border-b border-[#3b3b3b] pb-2">
                Modalidades & Servicios
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7ce200]" />
                  <span>Tutorías Presenciales en Aulas y Laboratorios</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7ce200]" />
                  <span>Tutorías Virtuales vía Google Meet / Teams</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7ce200]" />
                  <span>Acompañamiento Individual y Grupal</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7ce200]" />
                  <span>Evaluación de Aprendizaje y Feedback Continuo</span>
                </li>
              </ul>
            </div>

            {/* Columna 4: Horarios y Enlaces */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-[#fffaed] border-b border-[#3b3b3b] pb-2">
                Atención Institucional
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Horario de atención pedagógica de Lunes a Viernes de 7:00 a.m. a 9:00 p.m. y Sábados de 7:00 a.m. a 1:00 p.m.
              </p>
              <div className="pt-1 text-xs">
                <span className="text-slate-400">Vigilada por el </span>
                <span className="text-[#fffaed] font-medium">Ministerio de Educación Nacional</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-bar Copyright */}
        <div className="border-t border-[#3b3b3b] bg-[#1e1e1e] py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <div>
              © {new Date().getFullYear()} {institution.name}. Todos los derechos reservados.
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="text-[#7ce200]">Portal de Agendamiento Académico FET</span>
              <span>•</span>
              <span>Neiva, Huila - Colombia</span>
            </div>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {showNotifications && (
        <NotificationModal
          notifications={notifications}
          userId={currentUser.id}
          tutorings={tutorings}
          onClose={() => setShowNotifications(false)}
          onRefresh={refreshData}
          onSelectTutoring={(tut) => setSelectedTutoringDetail(tut)}
        />
      )}

      {selectedTutoringDetail && (
        <TutoringDetailModal
          tutoring={selectedTutoringDetail}
          currentUser={currentUser}
          onClose={() => setSelectedTutoringDetail(null)}
          onOpenEvaluation={(tut) => setEvaluatingTutoring(tut)}
        />
      )}

      {showRegisterModal && (
        <RegisterModal
          careers={careers}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={(newUser) => {
            handleLoginSuccess(newUser);
            refreshData();
          }}
        />
      )}

      {showTests && <TestsModal onClose={() => setShowTests(false)} />}

      {evaluatingTutoring && (
        <EvaluationModal
          tutoring={evaluatingTutoring}
          currentUser={currentUser}
          onClose={() => setEvaluatingTutoring(null)}
          onSuccess={() => refreshData()}
        />
      )}
    </div>
  );
}
