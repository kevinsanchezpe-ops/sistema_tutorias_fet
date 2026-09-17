import React, { useState } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, GraduationCap, Trash2, Power, BookOpen } from 'lucide-react';
import { Career, User } from '../core/types';
import { ApiClient } from '../core/presentation/api-client';

interface AdminCareersTabProps {
  currentUser: User;
  careers: Career[];
  onRefresh: () => void;
}

export const AdminCareersTab: React.FC<AdminCareersTabProps> = ({ currentUser, careers, onRefresh }) => {
  const [name, setName] = useState('');
  const [codePrefix, setCodePrefix] = useState('');
  const [numberOfSemesters, setNumberOfSemesters] = useState<number>(10);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [deleting, setDeleting] = useState<Career | null>(null);

  const clearMsgs = () => {
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMsgs();
    if (!name.trim()) {
      setErrorMsg('El nombre de la carrera es obligatorio.');
      return;
    }
    const res = await ApiClient.createCareer(
      { name: name.trim(), codePrefix: codePrefix.trim(), numberOfSemesters },
      currentUser
    );
    if (res.success) {
      setSuccessMsg(`Carrera "${res.data!.name}" creada exitosamente.`);
      setName('');
      setCodePrefix('');
      setNumberOfSemesters(10);
      onRefresh();
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error?.message || 'Error al crear la carrera.');
    }
  };

  const handleToggle = async (careerId: string) => {
    clearMsgs();
    const res = await ApiClient.toggleCareerActive(careerId, currentUser);
    if (res.success) {
      setSuccessMsg(`Carrera ${res.data!.isActive ? 'activada' : 'inhabilitada'} exitosamente.`);
      onRefresh();
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error?.message || 'Error al cambiar estado.');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    clearMsgs();
    const res = await ApiClient.deleteCareer(deleting.id, currentUser);
    if (res.success) {
      setSuccessMsg(`Carrera "${deleting.name}" eliminada permanentemente.`);
      setDeleting(null);
      onRefresh();
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error?.message || 'Error al eliminar la carrera.');
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-stone-200 shadow-xs bg-white p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#11770e]/10 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-[#11770e]" />
        </div>
        <div>
          <h3 className="text-base font-bold text-stone-900">Gestión de Carreras</h3>
          <p className="text-xs text-stone-500">
            Administrar las carreras disponibles en la institución ({careers.length} en total).
          </p>
        </div>
      </div>

      {/* Mensajes de éxito / error */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <span className="text-sm text-green-800">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="text-sm text-red-800">{errorMsg}</span>
        </div>
      )}

      {/* Formulario crear carrera */}
      <div className="rounded-2xl border border-stone-200 shadow-xs bg-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#11770e]/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#11770e]" />
          </div>
          <h4 className="text-sm font-semibold text-stone-900">Crear nueva carrera</h4>
        </div>
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-stone-600 mb-1">Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e]"
              placeholder="Ej. Ingeniería de Software"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-semibold text-stone-600 mb-1">Prefijo</label>
            <input
              type="text"
              value={codePrefix}
              onChange={(e) => setCodePrefix(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e]"
              placeholder="Ej. IS"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-semibold text-stone-600 mb-1">Semestres</label>
            <input
              type="number"
              min={1}
              max={20}
              value={numberOfSemesters}
              onChange={(e) => setNumberOfSemesters(parseInt(e.target.value, 10) || 1)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#11770e]/30 focus:border-[#11770e]"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-[#11770e] text-white text-xs font-semibold shadow-xs hover:bg-[#0d5c0b] transition-colors"
          >
            Crear Carrera
          </button>
        </form>
      </div>

      {/* Tabla de carreras */}
      <div className="rounded-xl border border-stone-200 shadow-xs bg-white overflow-hidden">
        {careers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
              <Sparkles className="w-7 h-7 text-stone-400" />
            </div>
            <h3 className="text-base font-semibold text-stone-900 mb-1">No hay carreras registradas</h3>
            <p className="text-sm text-stone-500">Crea la primera carrera usando el formulario de arriba.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-4 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wider text-center">Prefijo</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wider text-center">Semestres</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wider text-center">Estado</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wider text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {careers.map((career, idx) => (
                <tr
                  key={career.id}
                  className={`hover:bg-green-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}`}
                >
                  <td className="px-4 py-3 font-medium text-stone-900">{career.name}</td>
                  <td className="px-4 py-3 text-center">
                    {career.codePrefix ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-semibold">
                        {career.codePrefix}
                      </span>
                    ) : (
                      <span className="text-stone-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-stone-700 text-xs">{career.numberOfSemesters}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(career.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                        career.isActive
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                      title={career.isActive ? 'Inhabilitar carrera' : 'Activar carrera'}
                    >
                      <Power className="w-3 h-3" />
                      {career.isActive ? 'Activa' : 'Inactiva'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setDeleting(career)}
                      className="inline-flex items-center justify-center p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Eliminar carrera permanentemente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de confirmación de eliminación */}
      {deleting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Eliminar carrera</h3>
                <p className="text-sm text-stone-500">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-stone-700">
                Se eliminará permanentemente la carrera{' '}
                <span className="font-semibold text-stone-900">"{deleting.name}"</span>{' '}
                ({deleting.codePrefix || 'sin prefijo'}, {deleting.numberOfSemesters} semestres).
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleting(null)}
                className="px-4 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold shadow-xs hover:bg-red-700 transition-colors cursor-pointer"
              >
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};