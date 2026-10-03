import React, { useState } from 'react';
import { User, UserRole } from '../core/types';
import {
  Mail,
  GraduationCap,
  Camera,
  Trash2,
  UploadCloud,
  CheckCircle2,
  Award,
  BookOpen
} from 'lucide-react';

export interface InstitutionalProfileCardProps {
  user: Partial<User>;
  variant?: 'sidebar' | 'full';
  canEditPhoto?: boolean;
  showEmail?: boolean;
  onSelectPhoto?: (file: File) => void;
  onRemovePhoto?: () => void;
  isUploadingPhoto?: boolean;
  extraBadge?: string;
  className?: string;
}

export const InstitutionalProfileCard: React.FC<InstitutionalProfileCardProps> = ({
  user,
  variant = 'sidebar',
  canEditPhoto = false,
  showEmail = true,
  onSelectPhoto,
  onRemovePhoto,
  isUploadingPhoto = false,
  extraBadge,
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const isTeacher = user.role === UserRole.TEACHER;
  const isStudent = user.role === UserRole.STUDENT;

  const hasPhoto = Boolean(user.photoUrl && user.photoUrl.trim() !== '' && !imageError);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSelectPhoto) {
      onSelectPhoto(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return isTeacher ? 'DOC' : 'EST';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(user.fullName);

  if (variant === 'sidebar') {
    return (
      <section className={`rounded-xl border border-stone-200 bg-stone-50/60 p-3 ${className}`} aria-label="Perfil institucional">
        <div className="flex min-w-0 items-center gap-3">
          <div className="group relative h-[68px] w-[68px] shrink-0">
            <div className="h-full w-full overflow-hidden rounded-xl bg-white ring-1 ring-stone-200">
              {hasPhoto ? (
                <img src={user.photoUrl!} alt={user.fullName || 'Foto de perfil'} onError={() => setImageError(true)} className="h-full w-full object-cover object-center" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#11770e] to-[#0a4d09] text-white">
                  <span className="text-xl font-semibold tracking-wide">{initials}</span>
                  <span className="mt-0.5 text-[8px] font-medium uppercase tracking-wider text-green-100">FET</span>
                </div>
              )}
            </div>
            {canEditPhoto && onSelectPhoto && (
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingPhoto} aria-label="Cambiar foto de perfil" title="Cambiar foto de perfil" className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-700 text-white shadow-sm transition-colors hover:bg-brand-800 disabled:opacity-50">
                {isUploadingPhoto ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Camera aria-hidden="true" className="h-3.5 w-3.5" />}
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/jpg" onChange={handleFileChange} className="hidden" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-slate-900" title={user.fullName}>{user.fullName || 'Usuario FET'}</h2>
            <p className="mt-1 truncate text-[11px] text-stone-500" title={user.account}>{isTeacher ? 'Código' : 'Carnet'} · {user.account || 'Sin registrar'}</p>
            <span className="mt-2 inline-flex max-w-full items-center rounded-md border border-stone-200 bg-white px-2 py-1 text-[10px] font-medium text-stone-600">
              <span className="truncate">{isTeacher ? 'Docente titular FET' : user.semester ? `Semestre ${user.semester}` : 'Estudiante FET'}</span>
            </span>
          </div>
        </div>
        {user.careerName && (
          <div className="mt-3 flex min-w-0 items-start gap-2 border-t border-stone-200/80 pt-3">
            <BookOpen aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-stone-400">Programa académico</p>
              <p className="truncate text-[11px] text-slate-700" title={user.careerName}>{user.careerName}</p>
            </div>
          </div>
        )}
        {extraBadge && <p className="mt-2 truncate text-[10px] font-medium text-brand-700">{extraBadge}</p>}
      </section>
    );
  }

  // Dimensiones según variante
  const photoSizeClasses =
    variant === 'full'
      ? 'w-48 h-52 sm:w-56 sm:h-60'
      : 'w-32 h-36 sm:w-36 sm:h-40';
  const cardSpacingClasses = variant === 'full' ? 'p-5' : 'p-4';

  return (
    <div
      className={`bg-white rounded-3xl border border-stone-200/90 shadow-md ${cardSpacingClasses} flex flex-col items-center text-center transition-all duration-200 hover:shadow-lg ${className}`}
    >
      {/* 1. FOTO DE PERFIL / SQUIRCLE GRANDE */}
      <div className="relative group shrink-0">
        <div
          className={`${photoSizeClasses} rounded-[28px] overflow-hidden shadow-lg shadow-black/8 ring-1 ring-stone-200/80 bg-stone-50 flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.01]`}
        >
          {hasPhoto ? (
            <img
              src={user.photoUrl!}
              alt={user.fullName || 'Foto de perfil'}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#11770e] to-[#0a4d09] text-white flex flex-col items-center justify-center p-4">
              <span className="text-3xl sm:text-4xl font-black tracking-wider">
                {initials}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#bce6bc] mt-1">
                {isTeacher ? 'Docente FET' : 'Estudiante FET'}
              </span>
            </div>
          )}
        </div>

        {/* Botón flotante para subir/cambiar foto */}
        {canEditPhoto && onSelectPhoto && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="absolute -bottom-2 -right-2 p-2.5 bg-gradient-to-b from-[#11770e] to-[#0d5c0b] hover:from-[#0d5c0b] hover:to-[#094207] text-white rounded-2xl shadow-md cursor-pointer transition-all border-2 border-white hover:scale-105 active:scale-95 disabled:opacity-50"
            title="Subir o cambiar foto de perfil"
            aria-label="Cambiar foto de perfil"
          >
            {isUploadingPhoto ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* 2. NOMBRE COMPLETO */}
      <h3
        className={`font-extrabold text-slate-900 text-base sm:text-lg tracking-tight line-clamp-2 leading-snug ${variant === 'full' ? 'mt-4' : 'mt-3'}`}
        title={user.fullName}
      >
        {user.fullName || 'Usuario FET'}
      </h3>
      {/* 3. PÍLDORA DESTACADA CENTRAL (ESTILO REFERENCIA) */}
      <div className={`w-full flex flex-col items-center gap-1.5 ${variant === 'full' ? 'my-3' : 'my-2'}`}>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-200/80">
          {isTeacher ? (
            <>
              <Award className="w-3.5 h-3.5 text-stone-500" />
              <span>Código: {user.account || 'DOC-TITULAR'}</span>
            </>
          ) : (
            <>
              <GraduationCap className="w-3.5 h-3.5 text-stone-500" />
              <span>Carnet: {user.account || 'No registrado'}</span>
            </>
          )}
        </div>

        {/* Sub-badge o estado */}
        <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-3 py-0.5 rounded-full border border-stone-200/80">
          {isTeacher
            ? 'Docente Titular FET'
            : user.semester
            ? `Semestre ${user.semester}`
            : 'Estudiante Activo FET'}
        </span>

        {extraBadge && (
          <span className="text-[10px] font-bold text-[#11770e] bg-[#bce6bc]/30 px-2.5 py-0.5 rounded-full border border-[#11770e]/20">
            {extraBadge}
          </span>
        )}
      </div>

      {/* 4. DIVISOR SUTIL */}
      <div className={`w-full border-t border-stone-100 ${variant === 'full' ? 'my-2' : 'my-1'}`} />

      {/* 5. LISTA DE INFORMACIÓN INSTITUCIONAL CON ICONOS */}
      <div className={`w-full text-left text-xs text-slate-600 px-1 ${variant === 'full' ? 'space-y-2.5 pt-1' : 'space-y-2 pt-0.5'}`}>
        {/* Correo Electrónico Institucional */}
        {showEmail && (
          <div className="flex items-start gap-2.5">
            <Mail className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 block leading-tight">
                Correo Institucional
              </span>
              <a
                href={`mailto:${user.email}`}
                className="font-medium text-slate-800 text-[11px] leading-tight block truncate hover:text-[#11770e] transition-colors"
                title={user.email}
              >
                {user.email || 'correo@fet.edu.co'}
              </a>
            </div>
          </div>
        )}


        {/* Programa Académico / Facultad */}
        {user.careerName && (
          <div className="flex items-start gap-2.5">
            <BookOpen className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 block leading-tight">
                Programa Académico
              </span>
              <span
                className="font-medium text-slate-800 text-[11px] leading-tight block truncate"
                title={user.careerName}
              >
                {user.careerName}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 6. ACCIONES ADICIONALES PARA FOTO (SI APLICA EN MODO FULL) */}
      {variant === 'full' && canEditPhoto && (
        <div className="w-full pt-4 mt-3 border-t border-stone-100 flex flex-wrap gap-2 justify-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="px-3.5 py-1.5 bg-[#11770e] hover:bg-[#0d5c0b] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{hasPhoto ? 'Cambiar Foto' : 'Subir Foto'}</span>
          </button>

          {hasPhoto && onRemovePhoto && (
            <button
              type="button"
              onClick={onRemovePhoto}
              disabled={isUploadingPhoto}
              className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-stone-200 hover:border-rose-200 text-stone-700 hover:text-rose-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
