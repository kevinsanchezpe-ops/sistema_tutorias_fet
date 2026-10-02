import React, { useState } from 'react';
import { ApiClient } from '../core/presentation/api-client';
import { Career, ScheduleSlot, SubjectCourse, TeacherAvailability, User, UserRole } from '../core/types';
import {
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Mail,
  Phone,
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
  const [phone, setPhone] = useState('+504 9876-5432');
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
      phone: '+57 310 991 2345'
    },
    {
      fullName: 'Dra. Patricia Elena Varela',
      account: 'DOC-12402',
      username: 'patricia_varela',
      email: 'patricia.varela@fet.edu.co',
      phone: '+57 312 982 3456'
    },
    {
      fullName: 'MSc. Jorge Luis Bustillo',
      account: 'DOC-12403',
      username: 'jorge_bustillo',
      email: 'jorge.bustillo@fet.edu.co',
      phone: '+57 315 973 4567'
    }
  ];

  const handleFillSample = () => {
    const sample = sampleTeachers[Math.floor(Math.random() * sampleTeachers.length)];
    const uniqueSuffix = Math.floor(100 + Math.random() * 900);
    setFullName(sample.fullName);
    setAccount(`DOC-${uniqueSuffix}`);
    setUsername(`${sample.username}_${uniqueSuffix}`);
    setEmail(`${sample.username}${uniqueSuffix}@fet.edu.co`);
    setPhone(sample.phone);

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
      phone,
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
    <div className="space-y-6">
      {/* Header and Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Gestión y Alta de Docentes Tutores
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administración del cuerpo docente, asignaturas asignadas y franjas horarias de atención.
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
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#11770e] hover:bg-[#0d5c0b] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>{showCreateForm ? 'Cerrar Formulario' : 'Registrar Nuevo Docente'}</span>
        </button>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-3.5 bg-[#eaf8ea] border border-[#bce6bc] rounded-xl flex items-center gap-2.5 text-xs text-[#0d5c0b] animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#11770e] shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {createdCredentials && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold mb-1">Credenciales de Acceso Generadas</p>
              <p className="mb-2 text-slate-600">
                Comparta estos datos con <strong>{createdCredentials.fullName}</strong>. El docente podrá iniciar sesión y personalizar su contraseña.
              </p>
              <div className="font-mono bg-white border border-amber-200 rounded-lg px-3 py-2 inline-block shadow-2xs">
                <span className="text-slate-500">Usuario:</span> <strong>{createdCredentials.username}</strong>
                <span className="mx-2 text-slate-300">|</span>
                <span className="text-slate-500">Contraseña temporal:</span>{' '}
                <span className="font-bold text-[#11770e]">{createdCredentials.temporaryPassword}</span>
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
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs animate-in fade-in duration-200 space-y-4">
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
              className="text-xs font-semibold text-[#11770e] hover:text-[#0d5c0b] hover:underline cursor-pointer"
            >
              Cargar datos de ejemplo
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
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
                  className="w-full text-xs rounded-xl border border-stone-300 px-3.5 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#11770e]"
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
                  className="w-full text-xs rounded-xl border border-stone-300 px-3.5 py-2 text-slate-900 uppercase font-mono font-bold focus:ring-2 focus:ring-[#11770e]"
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
                  className="w-full text-xs rounded-xl border border-stone-300 px-3.5 py-2 text-slate-900 lowercase font-mono focus:ring-2 focus:ring-[#11770e]"
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Correo institucional"
                  required
                  className="w-full text-xs rounded-xl border border-stone-300 px-3.5 py-2 text-slate-900 focus:ring-2 focus:ring-[#11770e]"
                />
              </div>

              <div>
                <label
                  htmlFor="input-teacher-phone"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Teléfono Móvil
                </label>
                <input
                  id="input-teacher-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Teléfono móvil"
                  className="w-full text-xs rounded-xl border border-stone-300 px-3.5 py-2 text-slate-900 focus:ring-2 focus:ring-[#11770e]"
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
                  className="w-full text-xs rounded-xl border border-stone-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-[#11770e] bg-white font-medium"
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
                  <BookOpen className="w-3.5 h-3.5 text-[#11770e] shrink-0" />
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
                            ? 'bg-[#eaf8ea] border-[#bce6bc] text-[#0d5c0b] font-bold'
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
                          className="rounded border-stone-300 text-[#11770e] focus:ring-[#11770e]"
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
                          ? 'bg-[#eaf8ea] border-[#bce6bc] text-[#0d5c0b] font-bold'
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
                        className="rounded border-stone-300 text-[#11770e] focus:ring-[#11770e]"
                      />
                      <Clock className="w-3.5 h-3.5 text-[#11770e] shrink-0" />
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
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#11770e] hover:bg-[#0d5c0b] rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Registrando...</span>
                  </>
                ) : (
                  <span>Registrar y Activar Docente</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Docentes Tutores
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {teacherUsers.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Cuerpo docente institucional</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Docentes Activos
          </span>
          <div className="text-2xl font-black text-[#11770e] mt-1">
            {activeTeachersCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Habilitados para impartir tutorías</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Inactivos / Pausados
          </span>
          <div className="text-2xl font-black text-slate-600 mt-1">
            {inactiveTeachersCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Sin asignación temporal</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="input-search-teachers"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, código o usuario..."
            className="w-full text-xs rounded-xl border border-stone-200 pl-9 pr-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#11770e]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={careerFilter}
            onChange={(e) => setCareerFilter(e.target.value)}
            className="text-xs rounded-xl border border-stone-200 bg-white px-3 py-2 text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#11770e]"
          >
            <option value="all">Todas las carreras</option>
            {careers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-[#11770e] font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({teacherUsers.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-white text-[#11770e] font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Activos ({activeTeachersCount})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'inactive'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactivos ({inactiveTeachersCount})
            </button>
          </div>
        </div>
      </div>

      {/* Teachers List / Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredTeachers.length === 0 ? (
          <div className="col-span-2 bg-white p-12 rounded-2xl border border-stone-200 text-center text-slate-400 text-xs">
            No se encontraron docentes con los criterios de búsqueda seleccionados.
          </div>
        ) : (
          filteredTeachers.map((teacher) => {
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
                className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#eaf8ea] text-[#11770e] border border-[#bce6bc] font-bold flex items-center justify-center text-sm shadow-2xs shrink-0">
                        {teacher.fullName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">
                          {teacher.fullName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] text-slate-800 font-bold bg-stone-100 border border-stone-200 px-1.5 py-0.2 rounded">
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
                          ? 'bg-[#eaf8ea] text-[#11770e] border border-[#bce6bc]'
                          : 'bg-stone-100 text-stone-500 border border-stone-200'
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
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#11770e]" />
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
                            className="bg-stone-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-md border border-stone-200/80"
                          >
                            {subName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card footer action */}
                <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs">
                  <span className="text-slate-400 text-[11px]">
                    {teacherAvails.length} franjas de disponibilidad
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      id={`btn-edit-teacher-${teacher.id}`}
                      onClick={() => openEditTeacher(teacher)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-[#bce6bc] bg-[#eaf8ea] text-[#11770e] hover:bg-[#bce6bc]/40 transition-colors cursor-pointer"
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
                          : 'bg-[#eaf8ea] text-[#11770e] border-[#bce6bc] hover:bg-[#bce6bc]/40'
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
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-stone-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
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
            className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-rose-100 bg-rose-50/50">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <Trash2 className="w-4 h-4 text-rose-600" />
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
                <div id="alert-delete-teacher-error" className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
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
            className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-[#eaf8ea]/60">
              <div className="flex items-center gap-2 text-[#11770e] font-bold text-sm">
                <Pencil className="w-4 h-4" />
                <span>Editar Docente Tutor</span>
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
                  className="w-full text-xs rounded-xl border border-stone-300 px-3.5 py-2 text-slate-900 focus:ring-2 focus:ring-[#11770e] bg-white font-medium"
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
                              ? 'bg-[#eaf8ea] border-[#bce6bc] text-[#0d5c0b] font-bold'
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
                            className="rounded border-stone-300 text-[#11770e] focus:ring-[#11770e]"
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
                <div id="alert-edit-teacher-error" className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
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
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#11770e] hover:bg-[#0d5c0b] rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {editLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Guardando...</span>
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
