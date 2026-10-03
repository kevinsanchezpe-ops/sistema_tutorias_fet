import React, { useState } from 'react';
import { Plus, CheckCircle2, AlertCircle, Trash2, Power, X, GraduationCap, Search } from 'lucide-react';
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
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-brand-700">Catálogo académico</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Carreras y programas</h2>
          <p className="mt-1 text-sm text-stone-500">Administra la oferta académica, su duración y disponibilidad.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            clearMsgs();
          }}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 sm:self-auto"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          <span>{showCreateForm ? 'Cerrar formulario' : 'Nueva carrera'}</span>
        </button>
      </header>

      {/* Mensajes de éxito / error */}
      {successMsg && (
        <div className="p-3.5 bg-brand-50 border border-brand-200 rounded-xl flex items-center gap-2.5 text-xs text-brand-800 animate-in fade-in">
          <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-brand-700 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div role="alert" className="p-3.5 bg-danger-soft border border-danger-border rounded-xl flex items-center gap-2.5 text-xs text-danger animate-in fade-in">
          <AlertCircle aria-hidden="true" className="w-4 h-4 text-danger shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Formulario crear carrera */}
      {showCreateForm && (
        <div className="rounded-xl border border-[#e2e6e2] bg-white p-5 space-y-4 animate-in fade-in duration-200">
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
                  className="w-full text-sm rounded-lg border border-stone-200 px-3.5 py-3 text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
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
                  className="w-full text-sm rounded-lg border border-stone-200 px-3.5 py-3 text-slate-900 uppercase font-mono font-bold focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
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
                  className="w-full text-sm rounded-lg border border-stone-200 px-3.5 py-3 text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
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
                className="px-5 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold shadow-xs hover:bg-brand-700 transition-colors cursor-pointer"
              >
                Guardar Carrera
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resumen de programas */}
      <dl className="grid grid-cols-3 divide-x divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="p-3.5 sm:p-4"><dt className="text-xs text-stone-500">Programas</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{careers.length}</dd></div>
        <div className="p-3.5 sm:p-4"><dt className="text-xs text-stone-500">Activos</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-brand-700">{activeCount}</dd></div>
        <div className="p-3.5 sm:p-4"><dt className="text-xs text-stone-500">Inactivos</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-stone-500">{inactiveCount}</dd></div>
      </dl>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-[#dadce0] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f6368]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre o prefijo…"
          aria-label="Buscar carrera por nombre o prefijo"
          className="h-10 w-full rounded-md border border-[#8792a2] bg-white pl-9 pr-3 text-sm text-[#202124] placeholder:text-[#5f6368] focus:outline-none focus:ring-2 focus:ring-[#11770e]/25"
        />
        </div>

        <div className="flex items-center gap-1 rounded-md border border-[#dadce0] bg-[#f5f7f5] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`inline-flex min-h-10 items-center rounded-lg px-3 transition-colors cursor-pointer ${
              statusFilter === 'all'
              ? 'bg-[#edf6ec] text-[#155b13] font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({careers.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`inline-flex min-h-10 items-center rounded-lg px-3 transition-colors cursor-pointer ${
              statusFilter === 'active'
              ? 'bg-[#edf6ec] text-[#155b13] font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Activas ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={`inline-flex min-h-10 items-center rounded-lg px-3 transition-colors cursor-pointer ${
              statusFilter === 'inactive'
              ? 'bg-[#edf6ec] text-[#155b13] font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inactivas ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Lista organizada de programas */}
      <section aria-labelledby="careers-list-title" className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="flex flex-col gap-1 border-b border-stone-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h3 id="careers-list-title" className="text-sm font-semibold text-slate-900">Programas académicos</h3>
            <p className="mt-0.5 text-xs text-stone-500">Duración, prefijo y estado de cada carrera.</p>
          </div>
          <span className="text-xs font-medium text-stone-500">{filteredCareers.length} de {careers.length} carreras</span>
        </div>

        {filteredCareers.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <GraduationCap aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-stone-300" />
            <p className="text-sm font-semibold text-slate-800">No se encontraron carreras</p>
            <p className="mt-1 text-sm text-stone-500">Prueba con otra búsqueda o registra un nuevo programa.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredCareers.map((career) => (
              <article key={career.id} className="p-4 transition-colors hover:bg-stone-50/50 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-stone-200 bg-stone-50 px-2 py-1 font-mono text-[11px] font-medium text-stone-600">{career.codePrefix || 'Sin prefijo'}</span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${career.isActive ? 'bg-brand-50 text-brand-700' : 'bg-stone-100 text-stone-600'}`}>
                        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${career.isActive ? 'bg-brand-600' : 'bg-stone-400'}`} />
                        {career.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <h4 className="mt-2 text-sm font-semibold text-slate-900 sm:text-base">{career.name}</h4>
                    <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3">
                      <div><dt className="text-[11px] text-stone-500">Duración</dt><dd className="mt-0.5 text-xs font-medium text-slate-700">{career.numberOfSemesters} semestres</dd></div>
                      <div><dt className="text-[11px] text-stone-500">Prefijo institucional</dt><dd className="mt-0.5 font-mono text-xs font-medium text-slate-700">{career.codePrefix || 'No definido'}</dd></div>
                    </dl>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3 lg:justify-end lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                    <button
                      type="button"
                      onClick={() => handleToggle(career.id)}
                      aria-label={career.isActive ? `Inhabilitar ${career.name}` : `Activar ${career.name}`}
                      className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${career.isActive ? 'border-stone-200 bg-white text-slate-700 hover:bg-stone-50' : 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100'}`}
                      title={career.isActive ? 'Inhabilitar carrera' : 'Activar carrera'}
                    >
                      <Power aria-hidden="true" className="h-4 w-4" />{career.isActive ? 'Inhabilitar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(career)}
                      aria-label={`Eliminar ${career.name}`}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-stone-200 px-3 text-xs font-medium text-stone-600 transition-colors hover:border-danger-border hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                      title="Eliminar carrera permanentemente"
                    >
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />Eliminar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {/* Modal de confirmación de eliminación */}
      {deleting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-danger-border bg-danger-soft/50">
              <div className="flex items-center gap-2 text-danger font-bold text-sm">
                <Trash2 aria-hidden="true" className="w-4 h-4 text-danger" />
                <span>Confirmar Eliminación de Carrera</span>
              </div>
              <button
                onClick={() => setDeleting(null)}
                aria-label="Cerrar diálogo"
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X aria-hidden="true" className="w-4 h-4" />
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

              <p className="text-[11px] text-amber-800 bg-warning-soft p-2.5 rounded-lg border border-warning-border">
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
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-b from-danger to-rose-800 hover:from-rose-800 hover:to-rose-900 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                <span>Eliminar Carrera</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
