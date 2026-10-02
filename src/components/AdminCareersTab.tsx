import React, { useState } from 'react';
import { Plus, CheckCircle2, AlertCircle, Trash2, Power, X } from 'lucide-react';
import { Career, User } from '../core/types';
import { ApiClient } from '../core/presentation/api-client';

interface AdminCareersTabProps {
  currentUser: User;
  careers: Career[];
  onRefresh: () => void;
}

export const AdminCareersTab: React.FC<AdminCareersTabProps> = ({ currentUser, careers, onRefresh }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [codePrefix, setCodePrefix] = useState('');
  const [numberOfSemesters, setNumberOfSemesters] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
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
      {
        name: name.trim(),
        codePrefix: codePrefix.trim().toUpperCase(),
        numberOfSemesters: Number(numberOfSemesters)
      },
      currentUser
    );
    if (res.success) {
      setSuccessMsg(`Carrera "${res.data!.name}" creada exitosamente.`);
      setName('');
      setCodePrefix('');
      setNumberOfSemesters(10);
      setShowCreateForm(false);
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

  const activeCount = careers.filter((c) => c.isActive).length;
  const inactiveCount = careers.filter((c) => !c.isActive).length;

  const filteredCareers = careers.filter((c) => {
    const matchesQuery =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.codePrefix && c.codePrefix.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && c.isActive) ||
      (statusFilter === 'inactive' && !c.isActive);

    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Gestión de Carreras y Programas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administración de facultades, planes de estudio y duración curricular ({careers.length} carreras registradas).
          </p>
        </div>

        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            clearMsgs();
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#11770e] hover:bg-[#0d5c0b] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>{showCreateForm ? 'Cerrar Formulario' : 'Nueva Carrera'}</span>
        </button>
      </div>

      {/* Mensajes de éxito / error */}
      {successMsg && (
        <div className="p-3.5 bg-[#eaf8ea] border border-[#bce6bc] rounded-xl flex items-center gap-2.5 text-xs text-[#0d5c0b] animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#11770e] shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-800 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Formulario crear carrera */}
      {showCreateForm && (
        <div className="rounded-2xl border border-stone-200 shadow-xs bg-white p-6 space-y-4 animate-in fade-in duration-200">
          <div className="pb-3 border-b border-stone-100">
            <h3 className="text-sm font-bold text-slate-900">
              Registrar Nueva Carrera Académica
            </h3>
            <p className="text-xs text-slate-500">
              Defina el nombre del programa, su prefijo de código institucional y el número total de semestres.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre de la Carrera *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-stone-300 px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#11770e]"
                  placeholder="Nombre de la carrera"
                  required
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Prefijo de Código
                </label>
                <input
                  type="text"
                  value={codePrefix}
                  onChange={(e) => setCodePrefix(e.target.value.toUpperCase())}
                  className="w-full text-xs rounded-xl border border-stone-300 px-3.5 py-2 text-slate-900 uppercase font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#11770e]"
                  placeholder="Prefijo"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Total Semestres
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={numberOfSemesters}
                  onChange={(e) => setNumberOfSemesters(parseInt(e.target.value, 10) || 1)}
                  className="w-full text-xs rounded-xl border border-stone-300 px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#11770e]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#11770e] text-white text-xs font-semibold shadow-xs hover:bg-[#0d5c0b] transition-colors cursor-pointer"
              >
                Guardar Carrera
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Programas
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {careers.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Carreras ofertadas</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Carreras Activas
          </span>
          <div className="text-2xl font-black text-[#11770e] mt-1">
            {activeCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Disponibles para matrícula</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Inactivas / Pausadas
          </span>
          <div className="text-2xl font-black text-slate-600 mt-1">
            {inactiveCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Inhabilitadas temporalmente</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre o prefijo..."
          className="w-full sm:w-72 text-xs rounded-xl border border-stone-200 px-3.5 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#11770e]"
        />

        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-[#11770e] font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({careers.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-white text-[#11770e] font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Activas ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'inactive'
                ? 'bg-white text-slate-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inactivas ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Tabla de carreras */}
      <div className="rounded-2xl border border-stone-200 shadow-xs bg-white overflow-hidden">
        {filteredCareers.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No se encontraron carreras con los filtros seleccionados.
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-stone-200 text-slate-600 uppercase font-semibold text-[11px]">
                <th className="px-4 py-3.5">Nombre del Programa</th>
                <th className="px-4 py-3.5 text-center">Prefijo</th>
                <th className="px-4 py-3.5 text-center">Duración (Semestres)</th>
                <th className="px-4 py-3.5 text-center">Estado</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCareers.map((career) => (
                <tr key={career.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-900">{career.name}</td>
                  <td className="px-4 py-3.5 text-center font-mono">
                    {career.codePrefix ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-stone-100 text-slate-800 font-bold border border-stone-200 text-[11px]">
                        {career.codePrefix}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center font-semibold text-slate-700">
                    <span className="bg-[#eaf8ea] text-[#11770e] border border-[#bce6bc] px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {career.numberOfSemesters} Semestres
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        career.isActive
                          ? 'bg-[#eaf8ea] text-[#11770e] border border-[#bce6bc]'
                          : 'bg-stone-100 text-stone-500 border border-stone-200'
                      }`}
                    >
                      {career.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggle(career.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                          career.isActive
                            ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                            : 'bg-[#eaf8ea] text-[#11770e] border-[#bce6bc] hover:bg-[#bce6bc]/40'
                        }`}
                        title={career.isActive ? 'Inhabilitar carrera' : 'Activar carrera'}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{career.isActive ? 'Inhabilitar' : 'Activar'}</span>
                      </button>

                      <button
                        onClick={() => setDeleting(career)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-stone-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
                        title="Eliminar carrera permanentemente"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de confirmación de eliminación */}
      {deleting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-rose-100 bg-rose-50/50">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Confirmar Eliminación de Carrera</span>
              </div>
              <button
                onClick={() => setDeleting(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                ¿Está seguro de que desea eliminar permanentemente la siguiente carrera del sistema?
              </p>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs font-sans">
                <div className="font-bold text-slate-900 text-sm">{deleting.name}</div>
                <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                  <span>Prefijo: <strong className="font-mono text-slate-800">{deleting.codePrefix || 'N/A'}</strong></span>
                  <span>•</span>
                  <span>Duración: <strong>{deleting.numberOfSemesters} semestres</strong></span>
                </div>
              </div>

              <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                Esta acción removerá el programa del catálogo institucional.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-white border border-stone-300 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Carrera</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};