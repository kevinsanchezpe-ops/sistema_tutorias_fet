import React, { useState } from 'react';
import { ApiClient } from '../core/presentation/api-client';
import { db } from '../core/infrastructure/database/database';
import { Career, User } from '../core/types';
import { GraduationCap, UserPlus, X } from 'lucide-react';

interface RegisterModalProps {
  onClose: () => void;
  onSuccess: (newUser: User) => void;
  careers?: Career[];
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ onClose, onSuccess, careers = db.careers }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [account, setAccount] = useState('');
  const [careerId, setCareerId] = useState<string>('');
  const [semester, setSemester] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  const selectedCareer = careers.find((c) => c.id === careerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!careerId) {
      setErrorMsg('Selecciona la carrera del estudiante.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    const res = await ApiClient.registerStudentByAdmin({
      fullName,
      email,
      birthDate,
      admissionDate,
      account,
      careerId,
      semester: Number(semester),
      campusId: 'cmp-1',
      // El identificador interno se genera desde el correo institucional.
      username: email.trim().toLowerCase()
    });

    setLoading(false);
    if (res.success && res.data) {
      onSuccess(res.data);
      setTemporaryPassword(res.data.temporaryPassword);
    } else {
      setErrorMsg(res.error?.message || 'Error al registrar al estudiante.');
    }
  };

  return (
    <div
      id="modal-register-backdrop"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[2px] animate-in fade-in sm:p-5"
    >
      <div
        id="modal-register-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-student-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <GraduationCap aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-brand-700">Gestión de cuentas</p>
              <h2 id="register-student-title" className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">Registrar estudiante</h2>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">Completa la información personal y académica para crear su cuenta.</p>
            </div>
          </div>
          <button
            id="btn-close-register-modal"
            type="button"
            onClick={onClose}
            aria-label="Cerrar registro"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        {temporaryPassword ? (
          <div className="space-y-5 p-5 sm:p-7">
            <div role="status" className="rounded-xl border border-brand-200 bg-brand-50 p-4">
              <p className="text-sm font-semibold text-brand-900">Cuenta creada</p>
              <p className="mt-1 text-sm text-brand-800">Entrega esta contraseña temporal al estudiante. Se le pedirá cambiarla al iniciar sesión.</p>
              <code className="mt-3 block select-all rounded-lg border border-brand-200 bg-white px-3 py-2 font-mono text-base font-bold text-slate-900">{temporaryPassword}</code>
            </div>
            <button type="button" onClick={onClose} className="min-h-10 w-full rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800">Listo</button>
          </div>
        ) : <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <div className="space-y-6 overflow-y-auto px-5 py-5 sm:px-7">
            <section aria-labelledby="student-personal-heading" className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-800" id="student-personal-heading">Información personal</span>
                <span className="text-[11px] text-stone-400">Datos del estudiante</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="reg-fullname" className="mb-1.5 block text-xs font-medium text-slate-700">Nombre completo <span className="text-danger">*</span></label>
                  <input id="reg-fullname" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nombres y apellidos" minLength={10} required autoComplete="name" className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-stone-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15" />
                </div>

                <div>
                  <label htmlFor="reg-account" className="mb-1.5 block text-xs font-medium text-slate-700">Carnet institucional <span className="text-danger">*</span></label>
                  <input id="reg-account" type="text" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Número de carnet" required minLength={8} autoComplete="off" className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-stone-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15" />
                </div>

                <div>
                  <label htmlFor="reg-email" className="mb-1.5 block text-xs font-medium text-slate-700">Correo institucional <span className="text-danger">*</span></label>
                  <input id="reg-email" type="email" name="email" autoComplete="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@fet.edu.co" required className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-stone-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15" />
                </div>

                <div>
                  <label htmlFor="reg-birthdate" className="mb-1.5 block text-xs font-medium text-slate-700">Fecha de nacimiento <span className="text-danger">*</span></label>
                  <input id="reg-birthdate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15" />
                </div>

                <div>
                  <label htmlFor="reg-admissiondate" className="mb-1.5 block text-xs font-medium text-slate-700">Fecha de ingreso <span className="text-danger">*</span></label>
                  <input id="reg-admissiondate" type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} required className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15" />
                </div>
              </div>
            </section>

            <section aria-labelledby="student-academic-heading" className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-800" id="student-academic-heading">Información académica</span>
                <span className="text-[11px] text-stone-400">Programa y nivel actual</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="reg-career" className="mb-1.5 block text-xs font-medium text-slate-700">Carrera / programa <span className="text-danger">*</span></label>
                  <select id="reg-career" value={careerId} onChange={(e) => { setCareerId(e.target.value); setSemester(''); }} required className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15">
                    <option value="">Elige una carrera</option>
                    {careers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="reg-semester" className="mb-1.5 block text-xs font-medium text-slate-700">Semestre que cursa <span className="text-danger">*</span></label>
                  <select id="reg-semester" value={semester} onChange={(e) => setSemester(e.target.value)} required disabled={!careerId} className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400">
                    <option value="">Elige un semestre</option>
                    {Array.from({ length: selectedCareer?.numberOfSemesters || 0 }, (_, i) => i + 1).map((n) => <option key={n} value={String(n)}>Semestre {n}</option>)}
                  </select>
                </div>
              </div>
              {selectedCareer && semester && (
                <p className="rounded-lg bg-stone-50 px-3 py-2.5 text-xs text-stone-600">
                  Registro para <span className="font-semibold text-slate-800">{selectedCareer.name}</span> · Semestre <span className="font-semibold text-slate-800">{semester}</span>
                </p>
              )}
            </section>

            {errorMsg && <div id="alert-register-error" role="alert" className="rounded-lg border border-danger-border bg-danger-soft px-3.5 py-3 text-sm text-danger">{errorMsg}</div>}
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-stone-200 bg-stone-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button type="button" onClick={onClose} className="min-h-10 rounded-lg border border-stone-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Cancelar</button>
            <button id="btn-submit-registration" type="submit" disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
              <UserPlus aria-hidden="true" className="h-4 w-4" />
              {loading ? 'Registrando…' : 'Crear cuenta de estudiante'}
            </button>
          </footer>
        </form>}
      </div>
    </div>
  );
};
