import React, { useState } from 'react';
import { ApiClient } from '../core/presentation/api-client';
import { User } from '../core/types';
import { GraduationCap, Sparkles, UserPlus, X } from 'lucide-react';

interface RegisterModalProps {
  onClose: () => void;
  onSuccess: (newUser: User) => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ onClose, onSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('2002-05-15');
  const [admissionDate, setAdmissionDate] = useState('2023-01-20');
  const [account, setAccount] = useState('');
  const [username, setUsername] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleQuickFill = () => {
    const rnd = Math.floor(1000 + Math.random() * 9000);
    setFullName(`Laura Isabel Medina ${rnd}`);
    setAccount(`1241${rnd}`);
    setUsername(`laura_medina_${rnd}`);
    setEmail(`laura.medina${rnd}@gt.edu`);
    setPhone('+504 9876-1122');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const res = await ApiClient.registerStudent({
      fullName,
      email,
      phone,
      birthDate,
      admissionDate,
      account,
      careerId: 'car-1',
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
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-[11px] font-semibold text-[#11770e] hover:text-[#0d5c0b] flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              Rellenar ejemplo
            </button>
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
              placeholder="Dennis Mauricio Andino Paz"
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
                placeholder="11921099"
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
                placeholder="dennis_andino"
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
                placeholder="alumno@gt.edu"
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
                placeholder="+504 9876-5432"
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

          <div className="p-2.5 bg-[#eaf8ea] rounded-lg text-xs text-[#11770e] border border-[#bce6bc] font-medium">
            <span className="font-semibold">Centro asignado:</span> Campus Central • Ingeniería en Sistemas
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
