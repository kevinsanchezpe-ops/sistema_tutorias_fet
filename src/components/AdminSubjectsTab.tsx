import React, { useState } from 'react';
import { ApiClient } from '../core/presentation/api-client';
import { Career, SubjectCourse, User } from '../core/types';
import {
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  BookOpen,
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
  const [semesterFilter, setSemesterFilter] = useState<string>('all');

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
  const filterCareerObj = careers.find((c) => c.id === careerFilter);

  const sampleSubjects = [
    { name: 'Inteligencia Artificial y Aprendizaje Automático', code: 'IA-501', credits: 4, semester: 7 },
    { name: 'Seguridad Informática y Criptografía', code: 'IS-610', credits: 4, semester: 8 },
    { name: 'Desarrollo Web Full-Stack y Microservicios', code: 'IS-450', credits: 4, semester: 6 },
    { name: 'Cálculo Diferencial e Integral I', code: 'MM-112', credits: 5, semester: 1 },
    { name: 'Física General y Termodinámica', code: 'FS-200', credits: 4, semester: 2 },
    { name: 'Estructuras de Datos y Algoritmos', code: 'IS-210', credits: 4, semester: 3 }
  ];

  const handleFillSample = () => {
    const randomSample = sampleSubjects[Math.floor(Math.random() * sampleSubjects.length)];
    setName(randomSample.name);
    setCode(randomSample.code);
    setCredits(randomSample.credits);
    setSemester(randomSample.semester);
    setErrorMsg(null);
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    const res = await ApiClient.createSubject(
      {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        credits: Number(credits),
        semester: Number(semester),
        careerId: selectedCareerId,
        careerName: selectedCareer?.name || careers[0]?.name || 'Carrera Institucional'
      },
      currentUser
    );

    setIsSubmitting(false);

    if (res.success && res.data) {
      setSuccessMsg(`La asignatura "${res.data.name}" (${res.data.code}) ha sido creada y habilitada correctamente.`);
      setName('');
      setCode('');
      setCredits(4);
      setSemester(1);
      setShowCreateForm(false);
      onRefresh();
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(res.error?.message || 'Error al registrar la asignatura.');
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

    const matchesSemester =
      semesterFilter === 'all' ||
      (sub.semester != null && Number(sub.semester) === Number(semesterFilter));

    return matchesQuery && matchesStatus && matchesSemester;
  });

  const activeCount = careerSubjects.filter((s) => s.isActive).length;
  const inactiveCount = careerSubjects.filter((s) => !s.isActive).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-brand-700">Catálogo académico</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Asignaturas</h2>
          <p className="mt-1 text-sm text-stone-500">Organiza las materias por carrera y semestre, y controla su disponibilidad.</p>
        </div>
        <button
          type="button"
          id="btn-admin-add-subject"
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 sm:self-auto"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          <span>{showCreateForm ? 'Cerrar formulario' : 'Nueva asignatura'}</span>
        </button>
      </header>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-3.5 bg-brand-50 border border-brand-200 rounded-xl flex items-center gap-2.5 text-xs text-brand-800 animate-in fade-in">
          <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-brand-700 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Creation Form (Collapsible) */}
      {showCreateForm && (
        <div className="bg-white p-5 rounded-xl border border-[#e2e6e2] animate-in fade-in duration-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Registrar Nueva Asignatura
              </h3>
              <p className="text-xs text-slate-500">
                Ingrese los detalles académicos requeridos para incorporar la materia al catálogo.
              </p>
            </div>
            <button
              type="button"
              id="btn-quick-sample-subject"
              onClick={handleFillSample}
              className="text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline cursor-pointer"
            >
              Cargar datos de ejemplo
            </button>
          </div>

          {errorMsg && (
            <div role="alert" className="p-3.5 bg-danger-soft border border-danger-border rounded-xl flex items-center gap-2.5 text-xs text-danger animate-in fade-in">
              <AlertCircle aria-hidden="true" className="w-4 h-4 text-danger shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreateSubject} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-8">
                <label
                  htmlFor="input-subject-name"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Nombre de la Asignatura *
                </label>
                <input
                  id="input-subject-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre de la asignatura"
                  required
                  minLength={3}
                  className="w-full text-sm rounded-lg border border-stone-200 px-3.5 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                />
              </div>

              <div className="sm:col-span-4">
                <label
                  htmlFor="input-subject-code"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Código Oficial *
                </label>
                <input
                  id="input-subject-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Código oficial"
                  required
                  className="w-full text-sm rounded-lg border border-stone-200 px-3.5 py-3 text-slate-900 uppercase placeholder:text-slate-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="input-subject-career"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Carrera / Programa
                </label>
                <select
                  id="input-subject-career"
                  value={selectedCareerId}
                  onChange={(e) => setSelectedCareerId(e.target.value)}
                  className="w-full text-sm rounded-lg border border-stone-200 px-3.5 py-3 text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 bg-white font-medium"
                >
                  {careers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="input-subject-semester"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Semestre / Nivel
                </label>
                <select
                  id="input-subject-semester"
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="w-full text-sm rounded-lg border border-stone-200 px-3.5 py-3 text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 bg-white font-medium"
                >
                  {Array.from({ length: selectedCareer?.numberOfSemesters || 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      Semestre {n}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="input-subject-credits"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Créditos (UV)
                </label>
                <input
                  id="input-subject-credits"
                  type="number"
                  min={1}
                  max={8}
                  value={credits}
                  onChange={(e) => setCredits(Number(e.target.value))}
                  className="w-full text-sm rounded-lg border border-stone-200 px-3.5 py-3 text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 font-medium"
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
                id="btn-submit-create-subject"
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-brand-700 hover:bg-brand-800 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Guardando…</span>
                  </>
                ) : (
                  <span>Guardar y Habilitar Asignatura</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resumen del catálogo */}
      <dl className="grid grid-cols-3 overflow-hidden rounded-xl border border-stone-200 bg-white divide-x divide-stone-200">
        <div className="p-3.5 sm:p-4"><dt className="text-xs text-stone-500">Asignaturas</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{careerSubjects.length}</dd></div>
        <div className="p-3.5 sm:p-4"><dt className="text-xs text-stone-500">Activas</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-brand-700">{activeCount}</dd></div>
        <div className="p-3.5 sm:p-4"><dt className="text-xs text-stone-500">Inactivas</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-stone-500">{inactiveCount}</dd></div>
      </dl>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-[#dadce0] bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search aria-hidden="true" className="w-4 h-4" />
          </div>
          <input
            id="input-search-subjects"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o código…"
            className="h-10 w-full rounded-md border border-[#8792a2] bg-white pl-9 pr-3 text-sm text-[#202124] placeholder:text-[#5f6368] focus:outline-none focus:ring-2 focus:ring-[#11770e]/25"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Career Filter */}
          <select
            id="select-career-filter"
            value={careerFilter}
            onChange={(e) => {
              setCareerFilter(e.target.value);
              setSemesterFilter('all');
            }}
            className="h-10 rounded-md border border-[#8792a2] bg-white px-3 text-sm font-medium text-[#3c4043] focus:outline-none focus:ring-2 focus:ring-[#11770e]/25"
          >
            <option value="all">Todas las carreras</option>
            {careers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Semester Filter */}
          <select
            id="select-semester-filter"
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            disabled={careerFilter === 'all'}
            className="h-10 rounded-md border border-[#8792a2] bg-white px-3 text-sm font-medium text-[#3c4043] focus:outline-none focus:ring-2 focus:ring-[#11770e]/25 disabled:opacity-50"
          >
            <option value="all">Todos los semestres</option>
            {Array.from({ length: filterCareerObj?.numberOfSemesters || 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Semestre {n}
              </option>
            ))}
          </select>

          {/* Status Buttons */}
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
              Todas ({careerSubjects.length})
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
      </div>

      {/* Lista organizada de asignaturas */}
      <section aria-labelledby="subjects-list-title" className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="flex flex-col gap-1 border-b border-stone-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h3 id="subjects-list-title" className="text-sm font-semibold text-slate-900">Catálogo de asignaturas</h3>
            <p className="mt-0.5 text-xs text-stone-500">Carrera, semestre y disponibilidad de cada materia.</p>
          </div>
          <span className="text-xs font-medium text-stone-500">{filteredSubjects.length} de {careerSubjects.length} asignaturas</span>
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <BookOpen aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-stone-300" />
            <p className="text-sm font-semibold text-slate-800">No se encontraron asignaturas</p>
            <p className="mt-1 text-sm text-stone-500">Prueba con otros filtros o registra una nueva asignatura.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredSubjects.map((subject) => (
              <article key={subject.id} className="p-4 transition-colors hover:bg-stone-50/50 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-stone-200 bg-stone-50 px-2 py-1 font-mono text-[11px] font-medium text-stone-600">{subject.code || 'Sin código'}</span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${subject.isActive ? 'bg-brand-50 text-brand-700' : 'bg-stone-100 text-stone-600'}`}>
                        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${subject.isActive ? 'bg-brand-600' : 'bg-stone-400'}`} />
                        {subject.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <h4 className="mt-2 text-sm font-semibold text-slate-900 sm:text-base">{subject.name}</h4>
                    <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3">
                      <div className="min-w-0"><dt className="text-[11px] text-stone-500">Carrera</dt><dd className="mt-0.5 truncate text-xs font-medium text-slate-700">{subject.careerName}</dd></div>
                      <div><dt className="text-[11px] text-stone-500">Semestre</dt><dd className="mt-0.5 text-xs font-medium text-slate-700">{subject.semester ? `Semestre ${subject.semester}` : 'No definido'}</dd></div>
                      <div><dt className="text-[11px] text-stone-500">Créditos</dt><dd className="mt-0.5 text-xs font-medium text-slate-700">{subject.credits || 4} UV</dd></div>
                    </dl>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3 lg:justify-end lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                    <button
                      type="button"
                      id={`btn-toggle-subject-${subject.id}`}
                      onClick={() => handleToggleActive(subject.id)}
                      aria-label={subject.isActive ? `Inhabilitar ${subject.name}` : `Habilitar ${subject.name}`}
                      className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${subject.isActive ? 'border-stone-200 bg-white text-slate-700 hover:bg-stone-50' : 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100'}`}
                      title={subject.isActive ? 'Desactivar para tutorías' : 'Activar para tutorías'}
                    >
                      {subject.isActive ? <ToggleRight aria-hidden="true" className="h-4 w-4" /> : <ToggleLeft aria-hidden="true" className="h-4 w-4" />}
                      {subject.isActive ? 'Inhabilitar' : 'Habilitar'}
                    </button>
                    <button
                      type="button"
                      id={`btn-delete-subject-${subject.id}`}
                      onClick={() => { setDeletingSubject(subject); setDeleteError(null); }}
                      aria-label={`Eliminar ${subject.name}`}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-stone-200 px-3 text-xs font-medium text-stone-600 transition-colors hover:border-danger-border hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                      title="Eliminar asignatura"
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
      {/* Confirmation Modal for Deleting Subject */}
      {deletingSubject && (
        <div
          id="modal-delete-subject-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div
            id="modal-delete-subject-card"
            className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-danger-border bg-danger-soft/50">
              <div className="flex items-center gap-2 text-danger font-bold text-sm">
                <Trash2 aria-hidden="true" className="w-4 h-4 text-danger" />
                <span>Confirmar Eliminación de Asignatura</span>
              </div>
              <button
                id="btn-close-delete-subject-modal"
                aria-label="Cerrar diálogo"
                onClick={() => setDeletingSubject(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                ¿Está seguro de que desea eliminar permanentemente la siguiente asignatura del catálogo institucional?
              </p>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs font-sans">
                <div className="font-bold text-slate-900 text-sm">{deletingSubject.name}</div>
                <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                  <span>Código: <strong className="font-mono text-slate-800">{deletingSubject.code}</strong></span>
                  <span>•</span>
                  <span>Créditos: <strong>{deletingSubject.credits || 4} UV</strong></span>
                  <span>•</span>
                  <span>{deletingSubject.careerName}</span>
                </div>
              </div>

              {deleteError && (
                <div id="alert-delete-subject-error" role="alert" className="p-3 bg-danger-soft border border-danger-border rounded-xl flex items-start gap-2 text-xs text-danger">
                  <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              <p className="text-[11px] text-amber-800 bg-warning-soft p-2.5 rounded-lg border border-warning-border">
                Esta acción es irreversible y removerá la asignatura del plan de estudios y de las franjas docentes asociadas.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingSubject(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-white border border-stone-300 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-subject"
                type="button"
                onClick={handleDeleteSubject}
                disabled={deleteLoading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-b from-danger to-rose-800 hover:from-rose-800 hover:to-rose-900 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deleteLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Eliminando…</span>
                  </>
                ) : (
                  <>
                    <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
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
