import React, { useState } from 'react';
import { ApiClient } from '../core/presentation/api-client';
import { Career, ScheduleSlot, SubjectCourse, TeacherAvailability, User, UserRole } from '../core/types';
import { UserAvatar } from './UserAvatar';
import {
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Mail,
  BookOpen,
  Clock,
  Trash2,
  Pencil,
  GraduationCap,
  X
} from 'lucide-react';

interface AdminTeachersTabProps {
  currentUser: User;
  users: User[];
  subjects: SubjectCourse[];
  careers: Career[];
  schedules?: ScheduleSlot[];
  availabilities?: TeacherAvailability[];
  onRefresh: () => void;
}

export const AdminTeachersTab: React.FC<AdminTeachersTabProps> = ({
  currentUser,
  users,
  subjects,
  careers,
  schedules = [],
  availabilities = [],
  onRefresh
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [careerFilter, setCareerFilter] = useState<string>('all');

  // Form State
  const [fullName, setFullName] = useState('');
  const [account, setAccount] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCareerId, setSelectedCareerId] = useState<string>(currentUser.careerId || careers[0]?.id || '');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    fullName: string;
    username: string;
    temporaryPassword: string;
  } | null>(null);

  // Deletion state
  const [deletingTeacher, setDeletingTeacher] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const teacherUsers = users.filter((u) => u.role === UserRole.TEACHER);

  // Edit state
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);
  const [editCareerId, setEditCareerId] = useState<string>('');
  const [editSubjects, setEditSubjects] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Catálogo de materias por docente
  const [teacherCatalogMap, setTeacherCatalogMap] = useState<{ [teacherId: string]: SubjectCourse[] }>({});
  const teacherIdsKey = teacherUsers.map((t) => t.id).join('|');

  React.useEffect(() => {
    (async () => {
      const map: { [teacherId: string]: SubjectCourse[] } = {};
      for (const tid of teacherUsers.map((t) => t.id)) {
        const res = await ApiClient.getTeacherSubjects(tid);
        if (res.success && res.data) {
          map[tid] = res.data;
        }
      }
      setTeacherCatalogMap(map);
    })();
  }, [teacherIdsKey]);

  const openEditTeacher = async (teacher: User) => {
    setEditingTeacher(teacher);
    setEditCareerId(teacher.careerId || careers[0]?.id || '');
    const existing = teacherCatalogMap[teacher.id];
    if (existing) {
      setEditSubjects(existing.map((s) => s.id));
    } else {
      const res = await ApiClient.getTeacherSubjects(teacher.id);
      setEditSubjects(res.success && res.data ? res.data.map((s) => s.id) : []);
    }
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    if (editSubjects.length === 0) {
      setEditError('Debe asignar al menos una asignatura al docente.');
      return;
    }
    setEditLoading(true);
    setEditError(null);
    const res = await ApiClient.updateTeacherProfile(
      editingTeacher.id,
      { careerId: editCareerId, subjectIds: editSubjects },
      currentUser
    );
    setEditLoading(false);
    if (res.success) {
      setSuccessMsg(`Docente "${editingTeacher.fullName}" actualizado correctamente.`);
      setEditingTeacher(null);
      onRefresh();
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setEditError(res.error?.message || 'Error al actualizar el docente.');
    }
  };

  const editCareerSubjects = editCareerId
    ? subjects.filter((s) => s.careerId === editCareerId)
    : subjects;

  const careerSubjects = selectedCareerId
    ? subjects.filter((s) => s.careerId === selectedCareerId)
    : subjects;

  const sampleTeachers = [
    {
      fullName: 'Ing. Carlos Alberto Mendoza',
      account: 'DOC-12401',
      username: 'carlos_mendoza',
      email: 'carlos.mendoza@fet.edu.co',
    },
    {
      fullName: 'Dra. Patricia Elena Varela',
      account: 'DOC-12402',
      username: 'patricia_varela',
      email: 'patricia.varela@fet.edu.co',
    },
    {
      fullName: 'MSc. Jorge Luis Bustillo',
      account: 'DOC-12403',
      username: 'jorge_bustillo',
      email: 'jorge.bustillo@fet.edu.co',
    }
  ];

  const handleFillSample = () => {
    const sample = sampleTeachers[Math.floor(Math.random() * sampleTeachers.length)];
    const uniqueSuffix = Math.floor(100 + Math.random() * 900);
    setFullName(sample.fullName);
    setAccount(`DOC-${uniqueSuffix}`);
    setUsername(`${sample.username}_${uniqueSuffix}`);
    setEmail(`${sample.username}${uniqueSuffix}@fet.edu.co`);

    const activeSubjects = careerSubjects.filter((s) => s.isActive);
    setSelectedSubjects(activeSubjects.slice(0, 2).map((s) => s.id));
    setSelectedSlots(schedules.slice(0, 3).map((s) => s.id));
    setErrorMsg(null);
  };

  const handleRegisterTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (selectedSubjects.length === 0) {
      setErrorMsg('Debe seleccionar al menos una asignatura para asignar al docente.');
      return;
    }

    setIsSubmitting(true);

    const res = await ApiClient.registerTeacher({
      fullName,
      account,
      username,
      email,
      careerId: selectedCareerId,
      subjectIds: selectedSubjects,
      scheduleSlotIds: selectedSlots
    });

    setIsSubmitting(false);

    if (res.success && res.data) {
      setSuccessMsg(`El docente "${res.data.fullName}" (${res.data.account}) ha sido registrado con éxito.`);
      if (res.data.temporaryPassword) {
        setCreatedCredentials({
          fullName: res.data.fullName,
          username: res.data.username,
          temporaryPassword: res.data.temporaryPassword
        });
      }
      setFullName('');
      setAccount('');
      setUsername('');
      setEmail('');
      setSelectedSubjects([]);
      setSelectedSlots([]);
      setShowCreateForm(false);
      onRefresh();
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(res.error?.message || 'Error al registrar al docente.');
    }
  };

  const handleToggleUserActive = async (userId: string) => {
    const res = await ApiClient.toggleUserActive(userId, currentUser);
    if (res.success) {
      onRefresh();
    } else {
      alert(res.error?.message || 'Error al modificar estado del docente.');
    }
  };

  const handleDeleteTeacher = async () => {
    if (!deletingTeacher) return;
    setDeleteLoading(true);
    setDeleteError(null);
    const res = await ApiClient.deleteUser(deletingTeacher.id, currentUser);
    setDeleteLoading(false);
    if (res.success) {
      setSuccessMsg(`El docente "${deletingTeacher.fullName}" fue eliminado del sistema.`);
      setDeletingTeacher(null);
      onRefresh();
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setDeleteError(res.error?.message || 'No se pudo eliminar el docente.');
    }
  };

  const filteredTeachers = teacherUsers.filter((teacher) => {
    const matchesQuery =
      teacher.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (teacher.account && teacher.account.toLowerCase().includes(searchQuery.toLowerCase())) ||
      teacher.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && teacher.isActive) ||
      (statusFilter === 'inactive' && !teacher.isActive);

    const matchesCareer =
      careerFilter === 'all' || teacher.careerId === careerFilter;

    return matchesQuery && matchesStatus && matchesCareer;
  });

  const activeTeachersCount = teacherUsers.filter((t) => t.isActive).length;
  const inactiveTeachersCount = teacherUsers.filter((t) => !t.isActive).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-brand-700">Equipo académico</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Docentes tutores</h2>
          <p className="mt-1 text-sm text-stone-500">Administra perfiles, materias asignadas y disponibilidad.</p>
        </div>
        <button
          type="button"
          id="btn-admin-add-teacher"
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setErrorMsg(null);
            setSuccessMsg(null);
            if (!showCreateForm && selectedSubjects.length === 0) {
              setSelectedSubjects(subjects.filter((s) => s.isActive).slice(0, 2).map((s) => s.id));
              setSelectedSlots(schedules.slice(0, 3).map((s) => s.id));
            }
          }}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 sm:self-auto"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          <span>{showCreateForm ? 'Cerrar formulario' : 'Registrar docente'}</span>
        </button>
      </header>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-3.5 bg-brand-50 border border-brand-200 rounded-xl flex items-center gap-2.5 text-xs text-brand-800 animate-in fade-in">
          <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-brand-700 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {createdCredentials && (
        <div className="p-4 bg-warning-soft border border-warning-border rounded-xl text-xs text-amber-900 animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold mb-1">Credenciales de Acceso Generadas</p>
              <p className="mb-2 text-slate-600">
                Comparta estos datos con <strong>{createdCredentials.fullName}</strong>. El docente podrá iniciar sesión y personalizar su contraseña.
              </p>
              <div className="font-mono bg-white border border-warning-border rounded-lg px-3 py-2 inline-block shadow-2xs">
                <span className="text-slate-500">Usuario:</span> <strong>{createdCredentials.username}</strong>
                <span className="mx-2 text-slate-300">|</span>
                <span className="text-slate-500">Contraseña temporal:</span>{' '}
                <span className="font-bold text-brand-700">{createdCredentials.temporaryPassword}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCreatedCredentials(null)}
              className="text-amber-800 hover:text-amber-950 font-bold shrink-0 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Creation Form */}
      {showCreateForm && (
        <div className="bg-white p-5 rounded-xl border border-[#e2e6e2] animate-in fade-in duration-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Registrar Nuevo Docente Tutor
              </h3>
              <p className="text-xs text-slate-500">
                Complete los datos personales, carrera de adscripción y asignaturas asignadas.
              </p>
            </div>
            <button
              type="button"
              id="btn-quick-sample-teacher"
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

          <form onSubmit={handleRegisterTeacher} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-8">
                <label
                  htmlFor="input-teacher-fullname"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Nombre Completo con Título *
                </label>
                <input
                  id="input-teacher-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nombre completo con título"
                  required
                  minLength={5}
                  className="w-full text-sm rounded-lg border border-stone-200 px-3.5 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                />
              </div>

              <div className="sm:col-span-4">
                <label
                  htmlFor="input-teacher-account"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Código / Carnet *
                </label>
                <input
                  id="input-teacher-account"
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value.toUpperCase())}
                  placeholder="Código o carnet"
                  required
                  className="w-full text-sm rounded-lg border border-stone-200 px-3.5 py-3 text-slate-900 uppercase font-mono font-bold focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="input-teacher-username"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Usuario de Acceso *
                </label>
                <input
                  id="input-teacher-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                  placeholder="Usuario de acceso"
                  required
                  className="w-full text-sm rounded-lg border border-stone-200 px-3.5 py-3 text-slate-900 lowercase font-mono focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                />
              </div>

              <div>
                <label
                  htmlFor="input-teacher-email"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Correo Institucional *
                </label>
                <input
                  id="input-teacher-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Correo institucional"
                  required
                  className="w-full text-sm rounded-lg border border-stone-200 px-3.5 py-3 text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                />
              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="input-teacher-career"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Carrera Principal *
                </label>
                <select
                  id="input-teacher-career"
                  value={selectedCareerId}
                  onChange={(e) => {
                    setSelectedCareerId(e.target.value);
                    setSelectedSubjects([]);
                  }}
                  required
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Catálogo de Carrera
                </label>
                <div className="flex items-center gap-2 h-[38px] px-3.5 rounded-xl border border-stone-200 bg-slate-50 text-xs text-slate-600">
                  <BookOpen aria-hidden="true" className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                  <span>{careerSubjects.length} asignaturas registradas</span>
                </div>
              </div>
            </div>

            {/* Selection of Subjects */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Asignaturas Asignadas * ({selectedSubjects.length} seleccionadas)</span>
                <span className="text-[11px] text-slate-400 font-normal">Mínimo 1 requerida</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-stone-200">
                {careerSubjects.length === 0 ? (
                  <div className="col-span-1 sm:col-span-2 p-4 text-center text-xs text-slate-400">
                    No hay asignaturas registradas para esta carrera todavía.
                  </div>
                ) : (
                  careerSubjects.map((sub) => {
                    const isChecked = selectedSubjects.includes(sub.id);
                    return (
                      <label
                        key={sub.id}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer transition-colors border ${
                          isChecked
                            ? 'bg-brand-50 border-brand-200 text-brand-800 font-bold'
                            : 'bg-white border-stone-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubjects([...selectedSubjects, sub.id]);
                            } else {
                              setSelectedSubjects(selectedSubjects.filter((id) => id !== sub.id));
                            }
                          }}
                          className="rounded border-stone-300 text-brand-700 focus:ring-brand-600"
                        />
                        <span className="font-mono text-[10px] text-slate-800 bg-stone-100 px-1.5 py-0.5 rounded font-bold">
                          {sub.code || 'S/C'}
                        </span>
                        <span className="truncate">{sub.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selection of Schedule Slots */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Franjas Horarias Disponibles ({selectedSlots.length} seleccionadas)</span>
                <span className="text-[11px] text-slate-400 font-normal">Disponibilidad semanal del docente</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-stone-200">
                {schedules.map((slot) => {
                  const isChecked = selectedSlots.includes(slot.id);
                  return (
                    <label
                      key={slot.id}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer transition-colors border ${
                        isChecked
                          ? 'bg-brand-50 border-brand-200 text-brand-800 font-bold'
                          : 'bg-white border-stone-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSlots([...selectedSlots, slot.id]);
                          } else {
                            setSelectedSlots(selectedSlots.filter((id) => id !== slot.id));
                          }
                        }}
                        className="rounded border-stone-300 text-brand-700 focus:ring-brand-600"
                      />
                      <Clock aria-hidden="true" className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                      <span className="truncate text-[11px]">{slot.label}</span>
                    </label>
                  );
                })}
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
                id="btn-submit-register-teacher-admin"
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-brand-700 hover:bg-brand-800 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Registrando…</span>
                  </>
                ) : (
                  <span>Registrar y Activar Docente</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resumen del equipo */}
      <dl className="grid grid-cols-3 divide-x divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="p-3.5 sm:p-4"><dt className="text-xs text-stone-500">Docentes</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{teacherUsers.length}</dd></div>
        <div className="p-3.5 sm:p-4"><dt className="text-xs text-stone-500">Activos</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-brand-700">{activeTeachersCount}</dd></div>
        <div className="p-3.5 sm:p-4"><dt className="text-xs text-stone-500">Inactivos</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-stone-500">{inactiveTeachersCount}</dd></div>
      </dl>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search aria-hidden="true" className="w-4 h-4" />
          </div>
          <input
            id="input-search-teachers"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, código o usuario…"
            aria-label="Buscar docentes"
            className="h-10 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={careerFilter}
            onChange={(e) => setCareerFilter(e.target.value)}
            aria-label="Filtrar por carrera"
            className="h-10 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
          >
            <option value="all">Todas las carreras</option>
            {careers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 p-1 text-xs font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`inline-flex min-h-10 items-center rounded-lg px-3 transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#edf6ec] text-[#155b13] font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({teacherUsers.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`inline-flex min-h-10 items-center rounded-lg px-3 transition-colors cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-[#edf6ec] text-[#155b13] font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Activos ({activeTeachersCount})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`inline-flex min-h-10 items-center rounded-lg px-3 transition-colors cursor-pointer ${
                statusFilter === 'inactive'
                  ? 'bg-[#edf6ec] text-[#155b13] font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactivos ({inactiveTeachersCount})
            </button>
          </div>
        </div>
      </div>

      {/* Directorio de docentes */}
      <section aria-labelledby="teacher-directory-title" className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="flex flex-col gap-1 border-b border-stone-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h3 id="teacher-directory-title" className="text-sm font-semibold text-slate-900">Directorio docente</h3>
            <p className="mt-0.5 text-xs text-stone-500">Datos de contacto, materias y disponibilidad.</p>
          </div>
          <span className="text-xs font-medium text-stone-500">{filteredTeachers.length} de {teacherUsers.length} docentes</span>
        </div>

        {filteredTeachers.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <GraduationCap aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-stone-300" />
            <p className="text-sm font-semibold text-slate-800">No se encontraron docentes</p>
            <p className="mt-1 text-sm text-stone-500">Prueba con otra búsqueda o cambia los filtros.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredTeachers.map((teacher) => {
              const teacherAvails = availabilities.filter((availability) => availability.teacherId === teacher.id);
              const catalogSubjects = teacherCatalogMap[teacher.id] || [];
              const distinctSubjectNames = Array.from(new Set([
                ...catalogSubjects.map((subject) => subject.name),
                ...teacherAvails.map((availability) => availability.subjectCourseName)
              ]));

              return (
                <article key={teacher.id} className="p-4 transition-colors hover:bg-stone-50/50 sm:p-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(200px,1.1fr)_minmax(180px,0.9fr)_minmax(180px,1fr)_auto] md:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      <UserAvatar
                        user={teacher}
                        role={UserRole.TEACHER}
                        size="lg"
                        shape="circle"
                        className="border border-stone-200 bg-white"
                      />
                      <div className="min-w-0">
                        <h4 className="break-words text-sm font-semibold text-slate-900">{teacher.fullName}</h4>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-[11px] text-stone-600">{teacher.account || 'Sin código'}</span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${teacher.isActive ? 'bg-brand-50 text-brand-700' : 'bg-stone-100 text-stone-600'}`}>
                            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${teacher.isActive ? 'bg-brand-600' : 'bg-stone-400'}`} />
                            {teacher.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        {teacher.careerName && <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-stone-500"><GraduationCap aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />{teacher.careerName}</p>}
                      </div>
                    </div>

                    <div className="min-w-0 border-t border-stone-100 pt-3 text-xs md:border-t-0 md:pt-0">
                      <p className="text-[11px] text-stone-500">Correo institucional</p>
                      <p className="mt-1 break-all font-medium text-slate-700">{teacher.email}</p>
                      {teacher.username && <p className="mt-1 truncate font-mono text-[11px] text-stone-400">Usuario: {teacher.username}</p>}
                    </div>

                    <div className="min-w-0 border-t border-stone-100 pt-3 md:border-t-0 md:pt-0">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700"><BookOpen aria-hidden="true" className="h-3.5 w-3.5 text-brand-700" />Asignaturas ({distinctSubjectNames.length})</span>
                        <span className="whitespace-nowrap text-[11px] text-stone-500"><Clock aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />{teacherAvails.length} franjas</span>
                      </div>
                      {distinctSubjectNames.length === 0 ? (
                        <p className="text-xs text-stone-400">Sin asignaturas asignadas.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {distinctSubjectNames.map((subjectName, index) => (
                            <span key={`${subjectName}-${index}`} className="max-w-full truncate rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] text-stone-600">{subjectName}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3 md:justify-end md:border-l md:border-t-0 md:pl-4 md:pt-0">
                      <button
                        type="button"
                        id={`btn-edit-teacher-${teacher.id}`}
                        onClick={() => openEditTeacher(teacher)}
                        aria-label={`Editar perfil de ${teacher.fullName}`}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-stone-200 px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                        title="Editar carrera y materias asignadas"
                      >
                        <Pencil aria-hidden="true" className="h-3.5 w-3.5" />Editar
                      </button>
                      <button
                        type="button"
                        id={`btn-toggle-teacher-${teacher.id}`}
                        onClick={() => handleToggleUserActive(teacher.id)}
                        aria-label={teacher.isActive ? `Desactivar a ${teacher.fullName}` : `Activar a ${teacher.fullName}`}
                        className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${teacher.isActive ? 'border-stone-200 bg-white text-slate-700 hover:bg-stone-50' : 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100'}`}
                      >
                        {teacher.isActive ? <ToggleRight aria-hidden="true" className="h-4 w-4" /> : <ToggleLeft aria-hidden="true" className="h-4 w-4" />}
                        {teacher.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        id={`btn-delete-teacher-${teacher.id}`}
                        onClick={() => { setDeletingTeacher(teacher); setDeleteError(null); }}
                        aria-label={`Eliminar a ${teacher.fullName}`}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-stone-200 px-3 text-xs font-medium text-stone-600 transition-colors hover:border-danger-border hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                        title="Eliminar docente definitivamente"
                      >
                        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      {/* Confirmation Modal for Deleting Teacher */}
      {deletingTeacher && (
        <div
          id="modal-delete-teacher-backdrop"
          onClick={(event) => { if (event.target === event.currentTarget) setDeletingTeacher(null); }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div
            id="modal-delete-teacher-card"
            className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-danger-border bg-danger-soft/50">
              <div className="flex items-center gap-2 text-danger font-bold text-sm">
                <Trash2 aria-hidden="true" className="w-4 h-4 text-danger" />
                <span>Confirmar Eliminación de Docente</span>
              </div>
              <button
                id="btn-close-delete-teacher-modal"
                aria-label="Cerrar diálogo"
                onClick={() => setDeletingTeacher(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                ¿Está seguro de que desea eliminar permanentemente al siguiente docente tutor del sistema institucional?
              </p>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs font-sans">
                <div className="font-bold text-slate-900 text-sm">{deletingTeacher.fullName}</div>
                <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                  <span>Código: <strong className="font-mono text-slate-800">{deletingTeacher.account}</strong></span>
                  <span>•</span>
                  <span>Usuario: <strong>@{deletingTeacher.username}</strong></span>
                </div>
                <div className="text-[11px] text-slate-500">{deletingTeacher.email}</div>
              </div>

              {deleteError && (
                <div id="alert-delete-teacher-error" role="alert" className="p-3 bg-danger-soft border border-danger-border rounded-xl flex items-start gap-2 text-xs text-danger">
                  <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              <p className="text-[11px] text-amber-800 bg-warning-soft p-2.5 rounded-lg border border-warning-border">
                Esta acción removerá permanentemente la cuenta del docente y todas sus disponibilidades horarias configuradas.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingTeacher(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-white border border-stone-300 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-teacher"
                type="button"
                onClick={handleDeleteTeacher}
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
                    <span>Eliminar Docente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {editingTeacher && (
        <div
          id="modal-edit-teacher-backdrop"
          onClick={(event) => { if (event.target === event.currentTarget) setEditingTeacher(null); }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div
            id="modal-edit-teacher-card"
            className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-brand-50/60">
              <div className="flex items-center gap-2 text-brand-700 font-bold text-sm">
                <Pencil aria-hidden="true" className="w-4 h-4" />
                <span>Editar Docente Tutor</span>
              </div>
              <button
                id="btn-close-edit-teacher-modal"
                aria-label="Cerrar diálogo"
                onClick={() => setEditingTeacher(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                <div className="font-bold text-slate-900 text-sm">{editingTeacher.fullName}</div>
                <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                  <span>Código: <strong className="font-mono text-slate-800">{editingTeacher.account}</strong></span>
                  <span>•</span>
                  <span>Usuario: <strong>@{editingTeacher.username}</strong></span>
                  <span>•</span>
                  <span>Correo: <strong>{editingTeacher.email}</strong></span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-teacher-career"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Carrera Asignada *
                </label>
                <select
                  id="edit-teacher-career"
                  value={editCareerId}
                  onChange={(e) => {
                    setEditCareerId(e.target.value);
                    setEditSubjects([]);
                  }}
                  required
                  className="w-full text-sm rounded-lg border border-stone-200 px-3.5 py-3 text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 bg-white font-medium"
                >
                  {careers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Asignaturas Asignadas * ({editSubjects.length} seleccionadas)</span>
                  <span className="text-[11px] text-slate-400 font-normal">Mínimo 1 requerida</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-stone-200">
                  {editCareerSubjects.length === 0 ? (
                    <div className="col-span-1 sm:col-span-2 p-4 text-center text-xs text-slate-400">
                      No hay asignaturas registradas para esta carrera todavía.
                    </div>
                  ) : (
                    editCareerSubjects.map((sub) => {
                      const isChecked = editSubjects.includes(sub.id);
                      return (
                        <label
                          key={sub.id}
                          className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer transition-colors border ${
                            isChecked
                              ? 'bg-brand-50 border-brand-200 text-brand-800 font-bold'
                              : 'bg-white border-stone-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditSubjects([...editSubjects, sub.id]);
                              } else {
                                setEditSubjects(editSubjects.filter((id) => id !== sub.id));
                              }
                            }}
                            className="rounded border-stone-300 text-brand-700 focus:ring-brand-600"
                          />
                          <span className="font-mono text-[10px] text-slate-800 bg-stone-100 px-1.5 py-0.5 rounded font-bold">
                            {sub.code || 'S/C'}
                          </span>
                          <span className="truncate">{sub.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {editError && (
                <div id="alert-edit-teacher-error" role="alert" className="p-3 bg-danger-soft border border-danger-border rounded-xl flex items-start gap-2 text-xs text-danger">
                  <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  disabled={editLoading}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-white border border-stone-300 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-edit-teacher"
                  type="submit"
                  disabled={editLoading}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-brand-700 hover:bg-brand-800 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {editLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Guardando…</span>
                    </>
                  ) : (
                    <span>Guardar Cambios</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
