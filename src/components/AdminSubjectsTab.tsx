import React, { useState } from 'react';
import { ApiClient } from '../core/presentation/api-client';
import { Career, SubjectCourse, User } from '../core/types';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  GraduationCap,
  Trash2,
  X
} from 'lucide-react';

interface AdminSubjectsTabProps {
  currentUser: User;
  subjects: SubjectCourse[];
  careers: Career[];
  onRefresh: () => void;
}

export const AdminSubjectsTab: React.FC<AdminSubjectsTabProps> = ({
  currentUser,
  subjects,
  careers,
  onRefresh
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [careerFilter, setCareerFilter] = useState<string>(currentUser.careerId || 'all');

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [credits, setCredits] = useState(4);
  const [semester, setSemester] = useState(1);
  const [selectedCareerId, setSelectedCareerId] = useState<string>(currentUser.careerId || careers[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Deletion state
  const [deletingSubject, setDeletingSubject] = useState<SubjectCourse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const selectedCareer = careers.find((c) => c.id === selectedCareerId);

  const sampleSubjects = [
    { name: 'Inteligencia Artificial y Aprendizaje Automático', code: 'IA-501', credits: 4 },
    { name: 'Seguridad Informática y Criptografía', code: 'IS-610', credits: 4 },
    { name: 'Desarrollo Web Full-Stack y Microservicios', code: 'IS-450', credits: 4 },
    { name: 'Cálculo Diferencial e Integral I', code: 'MM-112', credits: 5 },
    { name: 'Física General y Termodinámica', code: 'FS-200', credits: 4 }
  ];

  const handleFillSample = () => {
    const randomSample = sampleSubjects[Math.floor(Math.random() * sampleSubjects.length)];
    setName(randomSample.name);
    setCode(randomSample.code);
    setCredits(randomSample.credits);
    setSemester(1);
    setErrorMsg(null);
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    const res = await ApiClient.createSubject(
      {
        name,
        code,
        credits: Number(credits),
        semester: Number(semester),
        careerId: selectedCareerId,
        careerName: selectedCareer?.name || careers[0]?.name || 'Carrera sin nombre'
      },
      currentUser
    );

    setIsSubmitting(false);

    if (res.success && res.data) {
      setSuccessMsg(`La asignatura "${res.data.name}" (${res.data.code}) ha sido creada y activada correctamente.`);
      setName('');
      setCode('');
      setCredits(4);
      setSemester(1);
      onRefresh();
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(res.error?.message || 'Error al crear la asignatura.');
    }
  };

  const handleToggleActive = async (subjectId: string) => {
    const res = await ApiClient.toggleSubjectActive(subjectId, currentUser);
    if (res.success) {
      onRefresh();
    } else {
      alert(res.error?.message || 'Error al cambiar estado de la asignatura.');
    }
  };

  const handleDeleteSubject = async () => {
    if (!deletingSubject) return;
    setDeleteLoading(true);
    setDeleteError(null);
    const res = await ApiClient.deleteSubject(deletingSubject.id, currentUser);
    setDeleteLoading(false);
    if (res.success) {
      setSuccessMsg(`La asignatura "${deletingSubject.name}" fue eliminada exitosamente.`);
      setDeletingSubject(null);
      onRefresh();
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setDeleteError(res.error?.message || 'No se pudo eliminar la asignatura.');
    }
  };

  const careerSubjects = careerFilter === 'all'
    ? subjects
    : subjects.filter((sub) => sub.careerId === careerFilter);

  const filteredSubjects = careerSubjects.filter((sub) => {
    const matchesQuery =
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.code && sub.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      sub.careerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && sub.isActive) ||
      (statusFilter === 'inactive' && !sub.isActive);

    return matchesQuery && matchesStatus;
  });

  const activeCount = careerSubjects.filter((s) => s.isActive).length;
  const inactiveCount = careerSubjects.filter((s) => !s.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#eaf8ea] text-[#11770e] flex items-center justify-center border border-[#bce6bc]">
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Gestión y Alta de Asignaturas
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Como Administrador, administre las asignaturas ofertadas para las tutorías académicas institucionales.
          </p>
        </div>

        <button
          id="btn-admin-add-subject"
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#11770e] hover:bg-[#0d5c0b] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{showCreateForm ? 'Cerrar Formulario' : 'Nueva Asignatura'}</span>
        </button>
      </div>

      {/* Creation Form (Collapsible / Expandable) */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Dar de Alta Nueva Asignatura
              </h3>
              <p className="text-xs text-slate-500">
                Complete la información requerida para registrar la asignatura en el catálogo oficial.
              </p>
            </div>
            <button
              type="button"
              id="btn-quick-sample-subject"
              onClick={handleFillSample}
              className="text-xs font-semibold text-[#11770e] hover:text-[#0d5c0b] flex items-center gap-1.5 hover:underline cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Rellenar ejemplo rápido</span>
            </button>
          </div>

          {successMsg && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreateSubject} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="input-subject-name"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Nombre de la Asignatura *
                </label>
                <input
                  id="input-subject-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Inteligencia Artificial y Aprendizaje Automático"
                  required
                  minLength={3}
                  className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="input-subject-code"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Código Oficial *
                </label>
                <input
                  id="input-subject-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ej. IA-501"
                  required
                  className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 uppercase placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="input-subject-credits"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Unidades Valorativas (UV) / Créditos
                </label>
                <input
                  id="input-subject-credits"
                  type="number"
                  min={1}
                  max={8}
                  value={credits}
                  onChange={(e) => setCredits(Number(e.target.value))}
                  className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="input-subject-semester"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Semestre / Nivel
                </label>
                <select
                  id="input-subject-semester"
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {Array.from({ length: selectedCareer?.numberOfSemesters || 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>Semestre {n}</option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="input-subject-career"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Carrera / Departamento
                </label>
                <select
                  id="input-subject-career"
                  value={selectedCareerId}
                  onChange={(e) => setSelectedCareerId(e.target.value)}
                  className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {careers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-submit-create-subject"
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Guardando Asignatura...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Guardar y Habilitar Asignatura</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Asignaturas
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {careerSubjects.length}
          </div>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
            Asignaturas Activas
          </span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {activeCount}
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Inactivas / Archivadas
          </span>
          <div className="text-2xl font-bold text-slate-600 mt-1">
            {inactiveCount}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="input-search-subjects"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, código o carrera..."
            className="w-full text-xs rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <select
            id="select-career-filter"
            value={careerFilter}
            onChange={(e) => setCareerFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todas las carreras</option>
            {careers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({careerSubjects.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Activas ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'inactive'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Inactivas ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Subjects Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Nombre de Asignatura</th>
                <th className="py-3 px-4">Carrera / Área</th>
                <th className="py-3 px-4 text-center">Semestre</th>
                <th className="py-3 px-4 text-center">Créditos (UV)</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No se encontraron asignaturas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                      <span className="bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md text-[11px]">
                        {subject.code || 'S/C'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{subject.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {subject.careerName}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {subject.semester ? `Semestre ${subject.semester}` : 'N/D'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                      {subject.credits || 4} UV
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          subject.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {subject.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          id={`btn-toggle-subject-${subject.id}`}
                          onClick={() => handleToggleActive(subject.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                            subject.isActive
                              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title={subject.isActive ? 'Desactivar para tutorías' : 'Activar para tutorías'}
                        >
                          {subject.isActive ? (
                            <>
                              <ToggleRight className="w-3.5 h-3.5" />
                              <span>Inhabilitar</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-3.5 h-3.5" />
                              <span>Habilitar</span>
                            </>
                          )}
                        </button>

                        <button
                          id={`btn-delete-subject-${subject.id}`}
                          onClick={() => {
                            setDeletingSubject(subject);
                            setDeleteError(null);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
                          title="Eliminar asignatura permanentemente"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Deleting Subject */}
      {deletingSubject && (
        <div
          id="modal-delete-subject-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div
            id="modal-delete-subject-card"
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-rose-50/50">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <Trash2 className="w-4 h-4" />
                <span>Confirmar Eliminación de Asignatura</span>
              </div>
              <button
                id="btn-close-delete-subject-modal"
                onClick={() => setDeletingSubject(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                ¿Estás seguro de que deseas eliminar permanentemente la siguiente asignatura del catálogo institucional?
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs font-sans">
                <div className="font-bold text-slate-900 text-sm">{deletingSubject.name}</div>
                <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                  <span>Código: <strong className="font-mono text-indigo-700">{deletingSubject.code}</strong></span>
                  <span>•</span>
                  <span>Créditos: <strong>{deletingSubject.credits || 4} UV</strong></span>
                </div>
              </div>

              {deleteError && (
                <div id="alert-delete-subject-error" className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                Esta acción es irreversible y removerá la asignatura del plan de estudios y de las franjas docentes asociadas.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingSubject(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-white border border-slate-300 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-subject"
                type="button"
                onClick={handleDeleteSubject}
                disabled={deleteLoading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deleteLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Asignatura</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
