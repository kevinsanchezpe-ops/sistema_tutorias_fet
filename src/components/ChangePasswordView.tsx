import React, { useState } from 'react';
import { ApiClient } from '../core/presentation/api-client';
import { User } from '../core/types';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, LogOut, ShieldCheck } from 'lucide-react';

interface ChangePasswordViewProps {
  currentUser: User;
  onPasswordChanged: (user: User) => void;
  onLogout: () => void;
}

export const ChangePasswordView: React.FC<ChangePasswordViewProps> = ({
  currentUser,
  onPasswordChanged,
  onLogout
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.trim().length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const res = await ApiClient.changePassword(newPassword, confirmPassword);
    setLoading(false);

    if (res.success && res.data) {
      setSuccess('¡Contraseña actualizada! Entrando a tu panel…');
      onPasswordChanged(res.data);
    } else {
      setError(res.error?.message || 'No se pudo actualizar la contraseña.');
    }
  };

  return (
    <div className="min-h-screen bg-brand-50/40 flex items-center justify-center px-4 py-10 font-sans antialiased">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center border border-brand-200">
            <ShieldCheck aria-hidden="true" className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Cambio de contraseña obligatorio</h1>
            <p className="text-xs text-slate-500">
              Hola, {currentUser.fullName}. Define tu contraseña definitiva para continuar.
            </p>
          </div>
        </div>

        <div className="mb-5 p-3 bg-warning-soft border border-warning-border rounded-xl text-xs text-amber-800">
          Tu cuenta tiene una contraseña temporal. Por seguridad debes cambiarla antes de usar el sistema.
        </div>

        {error && (
          <div role="alert" className="mb-4 p-3 bg-danger-soft border border-danger-border rounded-xl flex items-start gap-2 text-xs text-danger">
            <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-brand-50 border border-brand-200 rounded-xl flex items-center gap-2 text-xs text-brand-700 font-semibold">
            <CheckCircle2 aria-hidden="true" className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700 mb-1">
              Nueva contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock aria-hidden="true" className="w-4 h-4" />
              </div>
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nueva contraseña"
                required
                minLength={6}
                className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-10 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff aria-hidden="true" className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-700 mb-1">
              Confirmar contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock aria-hidden="true" className="w-4 h-4" />
              </div>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar contraseña"
                required
                minLength={6}
                className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Actualizando…' : 'Guardar nueva contraseña'}
          </button>
        </form>

        <button
          type="button"
          onClick={onLogout}
          className="w-full mt-4 flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
        >
          <LogOut aria-hidden="true" className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};
