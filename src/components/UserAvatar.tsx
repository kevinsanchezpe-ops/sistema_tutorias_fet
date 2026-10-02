import React, { useState } from 'react';
import { User, UserRole } from '../core/types';
import { User as UserIcon } from 'lucide-react';

export interface UserAvatarProps {
  user?: Partial<User> | null;
  name?: string;
  photoUrl?: string | null;
  role?: UserRole;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'rounded' | 'circle';
  className?: string;
  showRoleBadge?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  name,
  photoUrl,
  role,
  size = 'md',
  shape = 'rounded',
  className = '',
  showRoleBadge = false
}) => {
  const [imageError, setImageError] = useState(false);

  const effectiveName = name || user?.fullName || user?.username || '';
  const effectivePhoto = photoUrl !== undefined ? photoUrl : user?.photoUrl;
  const effectiveRole = role || user?.role;

  // Reset error when photo url changes
  React.useEffect(() => {
    setImageError(false);
  }, [effectivePhoto]);

  // Compute initials
  const getInitials = (text: string): string => {
    if (!text) return 'US';
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return words[0].substring(0, 2).toUpperCase();
  };

  const initials = getInitials(effectiveName);

  // Size configurations
  const sizeClasses = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm font-bold',
    xl: 'w-16 h-16 text-xl font-black',
    '2xl': 'w-24 h-24 text-3xl font-black'
  }[size];

  const roundedClass =
    shape === 'circle'
      ? 'rounded-full'
      : size === '2xl' || size === 'xl'
      ? 'rounded-2xl'
      : size === 'lg'
      ? 'rounded-xl'
      : 'rounded-lg';

  // Role theme background for initials
  const getRoleBg = () => {
    if (effectiveRole === UserRole.TEACHER) {
      return 'bg-[#11770e] text-white';
    }
    if (effectiveRole === UserRole.ADMIN) {
      return 'bg-amber-600 text-white';
    }
    return 'bg-[#11770e] text-white';
  };

  const hasValidPhoto = effectivePhoto && effectivePhoto.trim() !== '' && !imageError;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden ${roundedClass} ${sizeClasses} ${className}`}
    >
      {hasValidPhoto ? (
        <img
          src={effectivePhoto!}
          alt={effectiveName || 'Avatar'}
          onError={() => setImageError(true)}
          className={`w-full h-full object-cover ${roundedClass}`}
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center font-extrabold ${getRoleBg()} ${roundedClass} shadow-2xs`}
        >
          {initials || <UserIcon className="w-1/2 h-1/2" />}
        </div>
      )}

      {showRoleBadge && (
        <span
          className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-white ${
            size === '2xl' || size === 'xl'
              ? 'w-4 h-4'
              : size === 'lg' || size === 'md'
              ? 'w-3 h-3'
              : 'w-2 h-2'
          } ${
            effectiveRole === UserRole.TEACHER
              ? 'bg-[#11770e]'
              : effectiveRole === UserRole.ADMIN
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          }`}
        />
      )}
    </div>
  );
};
