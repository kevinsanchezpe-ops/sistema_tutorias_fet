import React, { useState } from 'react';
import { ApiClient } from '../core/presentation/api-client';
import { Career, ScheduleSlot, SubjectCourse, TeacherAvailability, User, UserRole } from '../core/types';
import {
  Briefcase,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Mail,
  Phone,
  BookOpen,
  Clock,
  User as UserIcon,
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

  // Form State
  const [fullName, setFullName] = useState('');
  const [account, setAccount] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+504 9876-5432');
  const [selectedCareerId, setSelectedCareerId] = useState<string>(currentUser.careerId || careers[0]?.id || '');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      email: 'carlos.mendoza@gt.edu',
      phone: '+504 9912-3456'
    },
    {
      fullName: 'Dra. Patricia Elena Varela',
      account: 'DOC-12402',
      username: 'patricia_varela',
      email: 'patricia.varela@gt.edu',
      phone: '+504 9823-4567'
    },
    {
      fullName: 'MSc. Jorge Luis Bustillo',
      account: 'DOC-12403',
      username: 'jorge_bustillo',
      email: 'jorge.bustillo@gt.edu',
      phone: '+504 9734-5678'
    }
  ];

  const handleFillSample = () => {
    const sample = sampleTeachers[Math.floor(Math.random() * sampleTeachers.length)];
    const uniqueSuffix = Math.floor(100 + Math.random() * 900);
    setFullName(sample.fullName);
    setAccount(`DOC-${uniqueSuffix}`);
    setUsername(`${sample.username}_${uniqueSuffix}`);
    setEmail(`${sample.username}${uniqueSuffix}@gt.edu`);
    setPhone(sample.phone);

    // Default select active subjects (first 2) of the selected career
    const activeSubjects = careerSubjects.filter((s) => s.isActive);
    setSelectedSubjects(activeSubjects.slice(0, 2).map((s) => s.id));

    // Default select slots (first 3)
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
      phone,
      careerId: selectedCareerId,
      subjectIds: selectedSubjects,
      scheduleSlotIds: selectedSlots
    });

    setIsSubmitting(false);

    if (res.success && res.data) {
      setSuccessMsg(`El docente "${res.data.fullName}" (${res.data.account}) ha sido registrado con éxito.`);
      setFullName('');
      setAccount('');
      setUsername('');
      setEmail('');
      setSelectedSubjects([]);
      setSelectedSlots([]);
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

  // Filter teachers
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

    return matchesQuery && matchesStatus;
  });

  const activeTeachersCount = teacherUsers.filter((t) => t.isActive).length;
  const inactiveTeachersCount = teacherUsers.filter((t) => !t.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#eaf8ea] text-[#11770e] flex items-center justify-center border border-[#bce6bc]">
              <Briefcase className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Gestión y Alta de Docentes Tutores
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Como Administrador, registre a los docentes tutores, asigne sus asignaturas de especialidad y configure sus horarios de atención.
          </p>
        </div>

        <button
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
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#11770e] hover:bg-[#0d5c0b] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{showCreateForm ? 'Cerrar Formulario' : 'Registrar Nuevo Docente'}</span>
        </button>
      </div>

      {/* Creation Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Registrar Nuevo Docente en la Plataforma
              </h3>
              <p className="text-xs text-slate-500">
                El docente tendrá acceso al sistema con su usuario y podrá gestionar sus sesiones de tutoría.
              </p>
            </div>
            <button
              type="button"
              id="btn-quick-sample-teacher"
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

          <form onSubmit={handleRegisterTeacher} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="input-teacher-fullname"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Nombre Completo con Título *
                </label>
                <input
                  id="input-teacher-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Ing. Carlos Alberto Mendoza"
                  required
                  minLength={8}
                  className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="input-teacher-account"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Código / Carnet Docente *
                </label>
                <input
                  id="input-teacher-account"
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="Ej. DOC-12405"
                  required
                  minLength={4}
                  className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 uppercase font-mono placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="input-teacher-username"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Usuario de Acceso *
                </label>
                <input
                  id="input-teacher-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                  placeholder="Ej. carlos_mendoza"
                  required
                  minLength={3}
                  className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 lowercase font-mono placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="input-teacher-email"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Correo Institucional *
                </label>
                <input
                  id="input-teacher-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="carlos.mendoza@gt.edu"
                  required
                  className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="input-teacher-phone"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Teléfono Móvil
                </label>
                <input
                  id="input-teacher-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+504 9876-5432"
                  className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="input-teacher-career"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Carrera Asignada *
                </label>
                <select
                  id="input-teacher-career"
                  value={selectedCareerId}
                  onChange={(e) => {
                    setSelectedCareerId(e.target.value);
                    setSelectedSubjects([]);
                  }}
                  required
                  className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="" disabled>Seleccionar carrera...</option>
                  {careers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="input-teacher-career-summary"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Asignaturas de la Carrera
                </label>
                <div className="flex items-center gap-2 h-[38px] px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{careerSubjects.length} asignaturas en el catálogo</span>
                </div>
              </div>
            </div>

            {/* Selection of Subjects */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Asignaturas Asignadas para Impartir * ({selectedSubjects.length} seleccionadas)</span>
                <span className="text-[11px] text-slate-400 font-normal">Mínimo 1 obligatoria</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                {careerSubjects.length === 0 ? (
                  <div className="col-span-1 sm:col-span-2 p-4 text-center text-xs text-slate-400">
                    No hay asignaturas registradas para esta carrera todavía.
                  </div>
                ) : careerSubjects.map((sub) => {
                  const isChecked = selectedSubjects.includes(sub.id);
                  return (
                    <label
                      key={sub.id}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer transition-colors border ${
                        isChecked
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
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
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-mono text-[10px] text-indigo-600 bg-indigo-100/60 px-1.5 py-0.5 rounded">
                        {sub.code || 'S/C'}
                      </span>
                      <span className="truncate">{sub.name}</span>
                      {sub.semester ? (
                        <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded shrink-0">
                          S{sub.semester}
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Selection of Schedule Slots */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Franjas Horarias Disponibles ({selectedSlots.length} seleccionadas)</span>
                <span className="text-[11px] text-slate-400 font-normal">Disponibilidad semanal del docente</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                {schedules.map((slot) => {
                  const isChecked = selectedSlots.includes(slot.id);
                  return (
                    <label
                      key={slot.id}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer transition-colors border ${
                        isChecked
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
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
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate text-[11px]">{slot.label}</span>
                    </label>
                  );
                })}
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
                id="btn-submit-register-teacher-admin"
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Registrando Docente...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Registrar y Activar Docente</span>
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
            Total Docentes Tutores
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {teacherUsers.length}
          </div>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
            Docentes Activos
          </span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {activeTeachersCount}
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Inactivos / Pausados
          </span>
          <div className="text-2xl font-bold text-slate-600 mt-1">
            {inactiveTeachersCount}
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
            id="input-search-teachers"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, código, usuario o correo..."
            className="w-full text-xs rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({teacherUsers.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Activos ({activeTeachersCount})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'inactive'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Inactivos ({inactiveTeachersCount})
          </button>
        </div>
      </div>

      {/* Teachers List / Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredTeachers.length === 0 ? (
          <div className="col-span-2 bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
            No se encontraron docentes con los criterios de búsqueda seleccionados.
          </div>
        ) : (
          filteredTeachers.map((teacher) => {
            // Find teacher's assigned subjects from catalog + availabilities
            const teacherAvails = availabilities.filter((a) => a.teacherId === teacher.id);
            const catalogSubjects = teacherCatalogMap[teacher.id] || [];
            const distinctSubjectNames = Array.from(
              new Set([
                ...catalogSubjects.map((s) => s.name),
                ...teacherAvails.map((a) => a.subjectCourseName)
              ])
            );

            return (
              <div
                key={teacher.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shadow-2xs">
                        {teacher.fullName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">
                          {teacher.fullName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                            {teacher.account}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            @{teacher.username}
                          </span>
                        </div>
                        {teacher.careerName && (
                          <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-[#11770e] bg-[#eaf8ea] border border-[#bce6bc] px-1.5 py-0.5 rounded-md">
                            <GraduationCap className="w-3 h-3" />
                            {teacher.careerName}
                          </div>
                        )}
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        teacher.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {teacher.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  {/* Contact info */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{teacher.email}</span>
                    </div>
                    {teacher.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{teacher.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Assigned subjects */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Asignaturas Asignadas ({distinctSubjectNames.length})</span>
                    </div>
                    {distinctSubjectNames.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">
                        Sin asignaturas registradas actualmente.
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {distinctSubjectNames.map((subName, i) => (
                          <span
                            key={i}
                            className="bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-md border border-slate-200/80"
                          >
                            {subName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card footer action */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <span className="text-slate-400 text-[11px]">
                    {teacherAvails.length} franjas de disponibilidad
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      id={`btn-edit-teacher-${teacher.id}`}
                      onClick={() => openEditTeacher(teacher)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-[#bce6bc] bg-[#eaf8ea] text-[#11770e] hover:bg-[#d9efd9] transition-colors cursor-pointer"
                      title="Editar carrera y materias asignadas del docente"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      id={`btn-toggle-teacher-${teacher.id}`}
                      onClick={() => handleToggleUserActive(teacher.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        teacher.isActive
                          ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {teacher.isActive ? (
                        <>
                          <ToggleRight className="w-3.5 h-3.5" />
                          <span>Desactivar</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-3.5 h-3.5" />
                          <span>Activar</span>
                        </>
                      )}
                    </button>

                    <button
                      id={`btn-delete-teacher-${teacher.id}`}
                      onClick={() => {
                        setDeletingTeacher(teacher);
                        setDeleteError(null);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
                      title="Eliminar docente definitivamente"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal for Deleting Teacher */}
      {deletingTeacher && (
        <div
          id="modal-delete-teacher-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div
            id="modal-delete-teacher-card"
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-rose-50/50">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <Trash2 className="w-4 h-4" />
                <span>Confirmar Eliminación de Docente</span>
              </div>
              <button
                id="btn-close-delete-teacher-modal"
                onClick={() => setDeletingTeacher(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                ¿Estás seguro de que deseas eliminar permanentemente al siguiente docente tutor del sistema institucional?
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs font-sans">
                <div className="font-bold text-slate-900 text-sm">{deletingTeacher.fullName}</div>
                <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                  <span>Código: <strong className="font-mono text-indigo-700">{deletingTeacher.account}</strong></span>
                  <span>•</span>
                  <span>Usuario: <strong>@{deletingTeacher.username}</strong></span>
                </div>
                <div className="text-[11px] text-slate-500">{deletingTeacher.email}</div>
              </div>

              {deleteError && (
                <div id="alert-delete-teacher-error" className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                Esta acción removerá permanentemente la cuenta del docente y todas sus disponibilidades horarias configuradas.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingTeacher(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-white border border-slate-300 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-teacher"
                type="button"
                onClick={handleDeleteTeacher}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div
            id="modal-edit-teacher-card"
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-[#eaf8ea]/60">
              <div className="flex items-center gap-2 text-[#11770e] font-bold text-sm">
                <Pencil className="w-4 h-4" />
                <span>Editar Docente</span>
              </div>
              <button
                id="btn-close-edit-teacher-modal"
                onClick={() => setEditingTeacher(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                <div className="font-bold text-slate-900 text-sm">{editingTeacher.fullName}</div>
                <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                  <span>Código: <strong className="font-mono text-indigo-700">{editingTeacher.account}</strong></span>
                  <span>•</span>
                  <span>Usuario: <strong>@{editingTeacher.username}</strong></span>
                  <span>•</span>
                  <span>Correo: <strong>{editingTeacher.email}</strong></span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-teacher-career"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
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
                  className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 focus:ring-2 focus:ring-[#11770e]"
                >
                  <option value="" disabled>Seleccionar carrera...</option>
                  {careers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Asignaturas Asignadas para Impartir * ({editSubjects.length} seleccionadas)</span>
                  <span className="text-[11px] text-slate-400 font-normal">Mínimo 1 obligatoria</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {editCareerSubjects.length === 0 ? (
                    <div className="col-span-1 sm:col-span-2 p-4 text-center text-xs text-slate-400">
                      No hay asignaturas registradas para esta carrera todavía.
                    </div>
                  ) : editCareerSubjects.map((sub) => {
                    const isChecked = editSubjects.includes(sub.id);
                    return (
                      <label
                        key={sub.id}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer transition-colors border ${
                          isChecked
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
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
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-mono text-[10px] text-indigo-600 bg-indigo-100/60 px-1.5 py-0.5 rounded">
                          {sub.code || 'S/C'}
                        </span>
                        <span className="truncate">{sub.name}</span>
                        {sub.semester ? (
                          <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded shrink-0">
                            S{sub.semester}
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </div>

              {editError && (
                <div id="alert-edit-teacher-error" className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  disabled={editLoading}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-white border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-edit-teacher"
                  type="submit"
                  disabled={editLoading}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#11770e] hover:bg-[#0d5c0b] rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {editLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Guardar Cambios</span>
                    </>
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
