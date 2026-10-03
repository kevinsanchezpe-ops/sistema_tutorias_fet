import React, { useEffect, useState } from 'react';
import { ApiClient } from '../core/presentation/api-client';
import { db } from '../core/infrastructure/database/database';
import { Career, User } from '../core/types';
import {
  GraduationCap,
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
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Registration state
  const [fullName, setFullName] = useState('');
  const [account, setAccount] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmRegPassword, setConfirmRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmRegPassword, setShowConfirmRegPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccessMsg, setRegSuccessMsg] = useState<string | null>(null);

  // Careers catalog for registration
  const [careers, setCareers] = useState<Career[]>(() => [...db.careers]);
  const [careerId, setCareerId] = useState<string>('');
  const [semester, setSemester] = useState<string>('');

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
      setForgotError('Ingresa tu correo institucional o carnet.');
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
      setRegError('El carnet institucional es obligatorio.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setRegError('Ingresa un correo institucional válido.');
      return;
    }
    if (password !== confirmRegPassword) {
      setRegError('Las contraseñas no coinciden.');
      return;
    }
    if (!careerId) {
      setRegError('Selecciona la carrera a la que perteneces.');
      return;
    }

    setRegLoading(true);

    const res = await ApiClient.registerStudent({
      fullName: fullName.trim(),
      account: account.trim(),
      // Internal login identifier generated from the institutional email.
      username: email.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password: password,
      birthDate: '',
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
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#edf2ee] px-4 py-6 sm:px-6 sm:py-10">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl flex flex-col md:flex-row">
        <aside
          className="relative hidden md:flex md:w-[40%] min-h-[560px] flex-col justify-between overflow-hidden bg-[#0d5c0b] bg-cover bg-center p-9 lg:p-12 text-white"
          style={{ backgroundImage: "url('/assets/fet-background.png')" }}
          aria-label="Fundación Escuela Tecnológica"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d9488]/90 via-[#11770e]/85 to-[#073b08]/90" />
          <div className="relative z-10">
            <img
              src="/logo-fet-blanco.png"
              alt="Fundación Escuela Tecnológica"
              className="h-auto w-48 max-w-full object-contain object-left"
            />
          </div>
          <div className="relative z-10 max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Fundación Escuela Tecnológica</p>
            <h1 className="mt-3 text-3xl lg:text-4xl font-bold leading-tight tracking-tight">Aprender juntos, avanzar más.</h1>
            <p className="mt-4 text-sm leading-relaxed text-white/85">Conecta con docentes y encuentra acompañamiento para tus retos académicos.</p>
          </div>
          <p className="relative z-10 text-xs text-white/65">Plataforma institucional de tutorías</p>
        </aside>

        <section className="min-w-0 flex-1 px-6 py-7 sm:px-10 sm:py-9 lg:px-14 lg:py-12">
          <div className="mb-8 flex items-center justify-between gap-3 md:justify-end">
            <div className="flex items-center gap-2 md:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white">
                <GraduationCap aria-hidden="true" className="h-5 w-5" />
              </div>
              <span className="text-sm font-bold text-slate-900">Tutorías FET</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <span className="text-slate-500">{activeTab === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}</span>
              <button
                id="auth-mode-toggle"
                type="button"
                onClick={() => {
                  setActiveTab(activeTab === 'login' ? 'register' : 'login');
                  setLoginError(null);
                  setRegError(null);
                  setRegSuccessMsg(null);
                }}
                className="min-h-11 px-1 font-bold text-brand-700 hover:text-brand-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
              >
                {activeTab === 'login' ? 'Registrarse' : 'Iniciar sesión'}
              </button>
            </div>
          </div>

          {/* TAB 1: LOGIN */}
          {activeTab === 'login' && (
            <div className="mx-auto w-full max-w-md space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Iniciar sesión
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Ingresa tus credenciales para continuar
                </p>
              </div>

              {loginError && (
                <div
                  id="alert-login-error"
                  role="alert"
                  className="p-3 bg-danger-soft border border-danger-border rounded-xl flex items-start gap-2 text-xs text-danger animate-in fade-in"
                >
                  <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
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
                      <UserIcon aria-hidden="true" className="w-4 h-4" />
                    </div>
                    <input
                      id="login-identity-input"
                      type="text"
                      name="username"
                      autoComplete="username"
                      spellCheck={false}
                      value={loginIdentity}
                      onChange={(e) => setLoginIdentity(e.target.value)}
                      placeholder="Correo institucional o carnet"
                      required
                      className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
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
                      <Lock aria-hidden="true" className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password-input"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Contraseña"
                      required
                      className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-9 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff aria-hidden="true" className="w-4 h-4" /> : <Eye aria-hidden="true" className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-slate-300 text-brand-700 focus:ring-brand-600"
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
                    className="font-medium text-brand-700 hover:text-brand-800 hover:underline cursor-pointer transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <button
                  id="btn-login-submit"
                  type="submit"
                  disabled={loginLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 shadow-md shadow-brand-900/20 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loginLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Ingresando…
                    </span>
                  ) : (
                    <>
                      <span>Ingresar al Sistema</span>
                      <ArrowRight aria-hidden="true" className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

            </div>
          )}

          {/* TAB 2: REGISTER */}
          {activeTab === 'register' && (
            <div className="mx-auto w-full max-w-xl space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Crear cuenta
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Ingresa tus datos esenciales para registrarte como estudiante
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">

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
                    <Briefcase aria-hidden="true" className="w-4 h-4" />
                  </div>
                  <select
                    id="reg-career"
                    value={careerId}
                    onChange={(e) => {
                      setCareerId(e.target.value);
                      setSemester(1);
                    }}
                    required
                    className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
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

              {/* Semester selector */}
              <div>
                <label
                  htmlFor="reg-semester"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Semestre que cursas
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Layers aria-hidden="true" className="w-4 h-4" />
                    </div>
                    <select
                      id="reg-semester"
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      required
                      className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
                    >
                      <option value="" disabled>
                        Selecciona tu semestre
                      </option>
                      {Array.from(
                        { length: careers.find((c) => c.id === careerId)?.numberOfSemesters || 10 },
                        (_, i) => i + 1
                      ).map((n) => (
                        <option key={n} value={String(n)}>
                          Semestre {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

              {/* Messages */}
              {regSuccessMsg && (
                <div
                  id="alert-register-success"
                  className="sm:col-span-2 p-3 bg-brand-50 border border-brand-200 rounded-xl flex items-center gap-2 text-xs text-brand-700 font-semibold animate-in fade-in"
                >
                  <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-brand-700 shrink-0" />
                  <span>{regSuccessMsg}</span>
                </div>
              )}

              {regError && (
                <div
                  id="alert-register-error"
                  className="sm:col-span-2 p-3 bg-danger-soft border border-danger-border rounded-xl flex items-start gap-2 text-xs text-danger animate-in fade-in"
                >
                  <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{regError}</span>
                </div>
              )}

              {/* Simple unified form */}
                <div>
                  <label
                    htmlFor="reg-fullname"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <UserIcon aria-hidden="true" className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nombre completo"
                      required
                      minLength={5}
                      className="w-full min-w-0 text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
                    />
                  </div>
                </div>

                  <div>
                    <label
                      htmlFor="reg-account"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Carnet Institucional
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <CreditCard aria-hidden="true" className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-account"
                        type="text"
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                        placeholder="Carnet institucional"
                        required
                        className="w-full min-w-0 text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600 uppercase font-mono"
                      />
                    </div>
                  </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Correo Electrónico Institucional
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail aria-hidden="true" className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      spellCheck={false}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Correo institucional"
                      required
                      className="w-full min-w-0 text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600"
                    />
                  </div>
                </div>

                  <div>
                    <label
                      htmlFor="reg-password"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Contraseña
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock aria-hidden="true" className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-password"
                        type={showRegPassword ? 'text' : 'password'}
                        name="new-password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Contraseña"
                        required
                        minLength={6}
                        className="w-full min-w-0 text-sm rounded-lg border border-slate-300 pl-9 pr-9 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600"
                      />
                      <button
                        type="button"
                        aria-label={showRegPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showRegPassword ? <EyeOff aria-hidden="true" className="w-4 h-4" /> : <Eye aria-hidden="true" className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="reg-confirm-password"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Confirmar contraseña
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock aria-hidden="true" className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-confirm-password"
                        type={showConfirmRegPassword ? 'text' : 'password'}
                        name="confirm-password"
                        autoComplete="new-password"
                        value={confirmRegPassword}
                        onChange={(e) => setConfirmRegPassword(e.target.value)}
                        placeholder="Confirmar contraseña"
                        required
                        minLength={6}
                        aria-invalid={confirmRegPassword.length > 0 && password !== confirmRegPassword}
                        className="w-full min-w-0 text-sm rounded-lg border border-slate-300 pl-9 pr-9 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600"
                      />
                      <button
                        type="button"
                        aria-label={showConfirmRegPassword ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                        onClick={() => setShowConfirmRegPassword(!showConfirmRegPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmRegPassword ? <EyeOff aria-hidden="true" className="w-4 h-4" /> : <Eye aria-hidden="true" className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                <button
                  id="btn-submit-register"
                  type="submit"
                  disabled={regLoading}
                  className="sm:col-span-2 w-full mt-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 shadow-md shadow-brand-900/20 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {regLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creando cuenta…
                    </span>
                  ) : (
                    <>
                      <span>Registrarme como Estudiante</span>
                      <ArrowRight aria-hidden="true" className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

            </div>
          )}
        </section>
      </div>

      {/* MODAL: RECUPERACIÓN DE CONTRASEÑA */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
                  <KeyRound aria-hidden="true" className="w-4 h-4" />
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
                aria-label="Cerrar recuperación de contraseña"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>

            {forgotError && (
              <div role="alert" className="p-3 bg-danger-soft border border-danger-border rounded-xl flex items-start gap-2 text-xs text-danger animate-in fade-in">
                <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl flex items-start gap-2 text-xs text-brand-700 animate-in fade-in">
                <CheckCircle2 aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {/* PASO 1: Ingresar correo / usuario */}
            {forgotStep === 'request' && (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ingresa tu correo institucional o carnet. Te enviaremos un código de seguridad para restablecer el acceso a tu cuenta.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo o Usuario Institucional
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail aria-hidden="true" className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={forgotIdentity}
                      onChange={(e) => setForgotIdentity(e.target.value)}
                      placeholder="Correo o usuario"
                      required
                      className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
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
                    className="flex-1 py-2 px-3 bg-gradient-to-b from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? 'Enviando…' : 'Enviar Código'}
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
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    spellCheck={false}
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Código de 6 dígitos"
                    required
                    maxLength={6}
                    className="w-full text-center tracking-widest font-mono text-base font-bold rounded-lg border border-slate-300 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
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
                    placeholder="Nueva contraseña"
                    required
                    className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
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
                    placeholder="Confirmar contraseña"
                    required
                    className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
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
                    className="flex-1 py-2 px-3 bg-gradient-to-b from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? 'Actualizando…' : 'Cambiar Contraseña'}
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
