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
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [account, setAccount] = useState('');
  const [username, setUsername] = useState('');
  const [careerId, setCareerId] = useState<string>('');
  const [semester, setSemester] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedCareer = careers.find((c) => c.id === careerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!careerId) {
      setErrorMsg('Selecciona la carrera del estudiante.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    const res = await ApiClient.registerStudent({
      fullName,
      email,
      phone,
      birthDate,
      admissionDate,
      account,
      careerId,
      semester: Number(semester),
      campusId: 'cmp-1',
      username
    });

    setLoading(false);
    if (res.success && res.data) {
      onSuccess(res.data);
      onClose();
    } else {
      setErrorMsg(res.error?.message || 'Error al registrar al estudiante.');
    }
  };

  return (
    <div
      id="modal-register-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
    >
      <div
        id="modal-register-card"
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-[#fffaed]/70">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#eaf8ea] text-[#11770e] rounded-lg border border-[#bce6bc]/60">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2b2b2b]">
                Alta Institucional de Estudiante
              </h3>
              <p className="text-[11px] text-stone-500">
                Registro de expediente de alumno para el sistema FET
              </p>
            </div>
          </div>
          <button
            id="btn-close-register-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Datos del Alumno
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nombre Completo (Mín. 10 caracteres)
            </label>
            <input
              id="reg-fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre completo"
              minLength={10}
              required
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Número de Cuenta / Carnet
              </label>
              <input
                id="reg-account"
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="Número de cuenta"
                required
                minLength={8}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Nombre de Usuario
              </label>
              <input
                id="reg-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                placeholder="Nombre de usuario"
                minLength={3}
                required
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Correo Institucional
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo institucional"
                required
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Teléfono Móvil
              </label>
              <input
                id="reg-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Teléfono"
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Fecha de Nacimiento
              </label>
              <input
                id="reg-birthdate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Fecha de Ingreso
              </label>
              <input
                id="reg-admissiondate"
                type="date"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                required
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-career" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Carrera / Programa
              </label>
              <select
                id="reg-career"
                value={careerId}
                onChange={(e) => {
                  setCareerId(e.target.value);
                  setSemester(1);
                }}
                required
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Seleccionar carrera...</option>
                {careers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reg-semester" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Semestre que cursa
              </label>
              <select
                id="reg-semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                required
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="" disabled>
                  Selecciona tu semestre
                </option>
                {Array.from(
                  { length: selectedCareer?.numberOfSemesters || 10 },
                  (_, i) => i + 1
                ).map((n) => (
                  <option key={n} value={String(n)}>Semestre {n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-2.5 bg-[#eaf8ea] rounded-lg text-xs text-[#11770e] border border-[#bce6bc] font-medium">
            <span className="font-semibold">Centro asignado:</span> Sede Única • {selectedCareer?.name || 'Ingeniería de Software'} • Semestre {semester}
          </div>

          {errorMsg && (
            <div id="alert-register-error" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
              {errorMsg}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="btn-submit-registration"
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-white bg-[#11770e] hover:bg-[#0d5c0b] rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? 'Registrando...' : 'Registrar Estudiante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
