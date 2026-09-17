import React, { useEffect, useState } from 'react';
import { ApiClient } from '../core/presentation/api-client';
import { db } from '../core/infrastructure/database/database';
import { Career, User } from '../core/types';
import {
  GraduationCap,
  LogIn,
  UserPlus,
  Lock,
  Mail,
  User as UserIcon,
  CreditCard,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Briefcase,
  Layers,
  Phone,
  UserCheck,
  X,
  KeyRound
} from 'lucide-react';

interface AuthViewProps {
  onLoginSuccess: (user: User) => void;
  onOpenTests?: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthView: React.FC<AuthViewProps> = ({
  onLoginSuccess,
  initialMode = 'login'
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialMode);

  // Login form state
  const [loginIdentity, setLoginIdentity] = useState('');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Registration state
  const [registerRole, setRegisterRole] = useState<'student' | 'teacher'>('student');
  const [fullName, setFullName] = useState('');
  const [account, setAccount] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccessMsg, setRegSuccessMsg] = useState<string | null>(null);

  // Careers catalog for registration
  const [careers, setCareers] = useState<Career[]>(() => [...db.careers]);
  const [careerId, setCareerId] = useState<string>(db.careers[0]?.id || '');
  const [semester, setSemester] = useState(1);

  useEffect(() => {
    ApiClient.getCareers().then((res) => {
      if (res.data && res.data.length > 0) setCareers(res.data);
    });
  }, []);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [forgotIdentity, setForgotIdentity] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    if (!forgotIdentity.trim()) {
      setForgotError('Ingresa tu correo o nombre de usuario.');
      return;
    }

    setForgotLoading(true);
    const res = await ApiClient.forgotPassword(forgotIdentity.trim());
    setForgotLoading(false);

    if (res.success) {
      setForgotSuccess(res.message || 'Código enviado exitosamente.');
      if (res.data?.debugToken) {
        setResetToken(res.data.debugToken);
      }
      setForgotStep('reset');
    } else {
      setForgotError(res.error?.message || 'Error al solicitar código.');
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (!resetToken.trim()) {
      setForgotError('Ingresa el código de 6 dígitos que recibiste.');
      return;
    }
    if (newPassword.length < 6) {
      setForgotError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Las contraseñas no coinciden.');
      return;
    }

    setForgotLoading(true);
    const res = await ApiClient.resetPassword(resetToken.trim(), newPassword);
    setForgotLoading(false);

    if (res.success) {
      setForgotSuccess('¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.');
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotStep('request');
        setForgotSuccess(null);
        setLoginPassword(newPassword);
      }, 1500);
    } else {
      setForgotError(res.error?.message || 'Código inválido o expirado.');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginIdentity.trim()) {
      setLoginError('Por favor ingresa tu usuario, correo o carnet.');
      return;
    }

    setLoginLoading(true);
    const res = await ApiClient.login(loginIdentity.trim(), loginPassword);
    setLoginLoading(false);

    if (res.success && res.data) {
      onLoginSuccess(res.data);
    } else {
      setLoginError(res.error?.message || 'Credenciales no válidas.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccessMsg(null);

    if (fullName.trim().length < 5) {
      setRegError('El nombre completo debe tener al menos 5 caracteres.');
      return;
    }
    if (!account.trim()) {
      setRegError(registerRole === 'student' ? 'El carnet institucional es obligatorio.' : 'El código de docente es obligatorio.');
      return;
    }
    if (!username.trim()) {
      setRegError('El nombre de usuario es obligatorio.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setRegError('Ingresa un correo institucional válido.');
      return;
    }
    if (!careerId) {
      setRegError('Selecciona la carrera a la que perteneces.');
      return;
    }

    setRegLoading(true);

    if (registerRole === 'student') {
      const res = await ApiClient.registerStudent({
        fullName: fullName.trim(),
        account: account.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: password || 'password123',
        birthDate: '2004-01-01',
        admissionDate: new Date().toISOString().split('T')[0],
        careerId,
        semester: Number(semester),
        campusId: 'cmp-1'
      });
      setRegLoading(false);

      if (res.success && res.data) {
        setRegSuccessMsg(`¡Estudiante ${res.data.fullName} registrado con éxito! Ahora inicia sesión con tus credenciales.`);
        setTimeout(() => {
          setActiveTab('login');
          setRegSuccessMsg(null);
          setLoginError(null);
        }, 900);
      } else {
        setRegError(res.error?.message || 'Error al registrar al estudiante.');
      }
    } else {
      const res = await ApiClient.registerTeacher({
        fullName: fullName.trim(),
        account: account.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: password || 'password123',
        careerId
      });
      setRegLoading(false);

      if (res.success && res.data) {
        setRegSuccessMsg(`¡Docente ${res.data.fullName} registrado con éxito! Ahora inicia sesión con tus credenciales.`);
        setTimeout(() => {
          setActiveTab('login');
          setRegSuccessMsg(null);
          setLoginError(null);
        }, 900);
      } else {
        setRegError(res.error?.message || 'Error al registrar al docente.');
      }
    }
  };

  const handleFillAdmin = () => {
    setLoginIdentity('admin');
    setLoginPassword('password123');
    setLoginError(null);
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center py-8 px-4 sm:px-6 relative overflow-hidden bg-[#2b2b2b] bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/assets/fet-background.png')" }}
    >
      {/* Overlay para legibilidad sobre la foto del campus FET */}
      <div className="absolute inset-0 bg-[#2b2b2b]/70 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#11770e]/30 via-transparent to-[#2b2b2b]/80 pointer-events-none" />

      {/* Brand Header */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#11770e] to-[#7ce200] text-white shadow-xl shadow-[#11770e]/30 mb-3 border border-[#7ce200]/30">
          <GraduationCap className="w-8 h-8 text-[#fffaed]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#fffaed]">
          Agendamientos Tutorias FET
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-stone-300 font-medium">
          Plataforma Institucional de Tutorías
        </p>
      </div>

      {/* Main card */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl border border-stone-200/80 overflow-hidden">
          {/* Tabs: Iniciar Sesión / Registrarse */}
          <div className="flex border-b border-stone-200 bg-[#fffaed]/50 p-1.5 gap-1.5">
            <button
              id="tab-login-btn"
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-[#11770e] shadow-xs border border-stone-200/80'
                  : 'text-stone-600 hover:text-[#2b2b2b] hover:bg-[#eaf8ea]'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar Sesión</span>
            </button>

            <button
              id="tab-register-btn"
              type="button"
              onClick={() => {
                setActiveTab('register');
                setRegError(null);
                setRegSuccessMsg(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white text-[#11770e] shadow-xs border border-stone-200/80'
                  : 'text-stone-600 hover:text-[#2b2b2b] hover:bg-[#eaf8ea]'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrarse</span>
            </button>
          </div>

          {/* TAB 1: LOGIN */}
          {activeTab === 'login' && (
            <div className="p-6 sm:p-7 space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Acceso al Sistema
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ingresa tus credenciales para continuar
                </p>
              </div>

              {loginError && (
                <div
                  id="alert-login-error"
                  className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-identity-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Usuario, Correo o Carnet
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      id="login-identity-input"
                      type="text"
                      value={loginIdentity}
                      onChange={(e) => setLoginIdentity(e.target.value)}
                      placeholder="admin, carnet o correo..."
                      required
                      className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#11770e] focus:border-[#11770e]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="login-password-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-9 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#11770e] focus:border-[#11770e]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-slate-300 text-[#11770e] focus:ring-[#11770e]"
                    />
                    <span>Recordar sesión</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotIdentity(loginIdentity);
                      setForgotStep('request');
                      setForgotError(null);
                      setForgotSuccess(null);
                      setShowForgotModal(true);
                    }}
                    className="font-medium text-[#11770e] hover:text-[#0d5c0b] hover:underline cursor-pointer transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <button
                  id="btn-login-submit"
                  type="submit"
                  disabled={loginLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#11770e] hover:bg-[#0d5c0b] shadow-md shadow-[#11770e]/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loginLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Ingresando...
                    </span>
                  ) : (
                    <>
                      <span>Ingresar al Sistema</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Discreet footer with links & quick demo */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  ¿No tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="font-semibold text-[#11770e] hover:text-[#0d5c0b] hover:underline cursor-pointer"
                  >
                    Regístrate
                  </button>
                </span>
                <button
                  type="button"
                  onClick={handleFillAdmin}
                  className="text-[11px] text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                  title="Rellenar credenciales de administrador (admin / password123)"
                >
                  Acceso admin demo
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTER */}
          {activeTab === 'register' && (
            <div className="p-6 sm:p-7 space-y-4 animate-in fade-in duration-150">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Crear Cuenta
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecciona tu rol e ingresa tus datos esenciales
                </p>
              </div>

              {/* Role selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#fffaed] border border-stone-200 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRegisterRole('student')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    registerRole === 'student'
                      ? 'bg-[#11770e] text-white shadow-xs'
                      : 'text-stone-600 hover:text-[#2b2b2b] hover:bg-[#eaf8ea]'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Estudiante</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterRole('teacher')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    registerRole === 'teacher'
                      ? 'bg-[#11770e] text-white shadow-xs'
                      : 'text-stone-600 hover:text-[#2b2b2b] hover:bg-[#eaf8ea]'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Docente</span>
                </button>
              </div>

              {/* Career selector */}
              <div>
                <label
                  htmlFor="reg-career"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Carrera
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <select
                    id="reg-career"
                    value={careerId}
                    onChange={(e) => {
                      setCareerId(e.target.value);
                      setSemester(1);
                    }}
                    required
                    className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-[#11770e] focus:border-[#11770e]"
                  >
                    <option value="" disabled>
                      Selecciona tu carrera
                    </option>
                    {careers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Semester selector (students only) */}
              {registerRole === 'student' && (
                <div>
                  <label
                    htmlFor="reg-semester"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Semestre que cursas
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Layers className="w-4 h-4" />
                    </div>
                    <select
                      id="reg-semester"
                      value={semester}
                      onChange={(e) => setSemester(Number(e.target.value))}
                      required
                      className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-[#11770e] focus:border-[#11770e]"
                    >
                      {Array.from(
                        { length: careers.find((c) => c.id === careerId)?.numberOfSemesters || 10 },
                        (_, i) => i + 1
                      ).map((n) => (
                        <option key={n} value={n}>
                          Semestre {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Messages */}
              {regSuccessMsg && (
                <div
                  id="alert-register-success"
                  className="p-3 bg-[#eaf8ea] border border-[#bce6bc] rounded-xl flex items-center gap-2 text-xs text-[#11770e] font-semibold animate-in fade-in"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#11770e] shrink-0" />
                  <span>{regSuccessMsg}</span>
                </div>
              )}

              {regError && (
                <div
                  id="alert-register-error"
                  className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{regError}</span>
                </div>
              )}

              {/* Simple unified form */}
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div>
                  <label
                    htmlFor="reg-fullname"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej. Juan Camilo Pérez"
                      required
                      minLength={5}
                      className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#11770e] focus:border-[#11770e]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="reg-account"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      {registerRole === 'student' ? 'Carnet Institucional' : 'Código Docente'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-account"
                        type="text"
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                        placeholder={registerRole === 'student' ? '20241012' : 'DOC-102'}
                        required
                        className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#11770e] uppercase font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="reg-username"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Nombre de Usuario
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="juan_perez"
                        required
                        minLength={3}
                        className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#11770e] lowercase font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Correo Electrónico Institucional
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="estudiante@fet.edu.co"
                      required
                      className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#11770e]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="reg-password"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Contraseña
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-password"
                        type={showRegPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={4}
                        className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-9 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#11770e]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="reg-phone"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Teléfono (Opcional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="310 123 4567"
                        className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#11770e]"
                      />
                    </div>
                  </div>
                </div>

                <button
                  id="btn-submit-register"
                  type="submit"
                  disabled={regLoading}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#11770e] hover:bg-[#0d5c0b] shadow-md shadow-[#11770e]/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {regLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creando cuenta...
                    </span>
                  ) : (
                    <>
                      <span>{registerRole === 'student' ? 'Registrarme como Estudiante' : 'Registrarme como Docente'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
                ¿Ya tienes una cuenta registrada?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setRegError(null);
                  }}
                  className="font-semibold text-[#11770e] hover:text-[#0d5c0b] hover:underline cursor-pointer"
                >
                  Inicia sesión aquí
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: RECUPERACIÓN DE CONTRASEÑA */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#eaf8ea] text-[#11770e] flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Restablecer Contraseña
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {forgotStep === 'request' ? 'Paso 1: Solicitud de código' : 'Paso 2: Definir nueva clave'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-700 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {/* PASO 1: Ingresar correo / usuario */}
            {forgotStep === 'request' && (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ingresa tu correo institucional o nombre de usuario. Te enviaremos un código de seguridad para restablecer el acceso a tu cuenta.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo o Usuario Institucional
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={forgotIdentity}
                      onChange={(e) => setForgotIdentity(e.target.value)}
                      placeholder="ejemplo@gt.edu o tu usuario..."
                      required
                      className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#11770e] focus:border-[#11770e]"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2 px-3 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2 px-3 bg-[#11770e] hover:bg-[#0d5c0b] text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? 'Enviando...' : 'Enviar Código'}
                  </button>
                </div>
              </form>
            )}

            {/* PASO 2: Ingresar código y nueva contraseña */}
            {forgotStep === 'reset' && (
              <form onSubmit={handleConfirmReset} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código de Seguridad (6 dígitos)
                  </label>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="123456"
                    required
                    maxLength={6}
                    className="w-full text-center tracking-widest font-mono text-base font-bold rounded-lg border border-slate-300 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#11770e] focus:border-[#11770e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#11770e] focus:border-[#11770e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                    className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#11770e] focus:border-[#11770e]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    className="py-2 px-3 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2 px-3 bg-[#11770e] hover:bg-[#0d5c0b] text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? 'Actualizando...' : 'Cambiar Contraseña'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
