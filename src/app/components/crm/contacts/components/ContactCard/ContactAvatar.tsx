// ContactAvatar - Reusable avatar component for contacts

import React from 'react';
import { User } from 'lucide-react';

interface ContactAvatarProps {
  photo?: string;
  firstName?: string;
  lastName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
};

function getInitials(firstName?: string, lastName?: string): string {
  const firstInitial = firstName?.charAt(0) || '';
  const lastInitial = lastName?.charAt(0) || '';
  return `${firstInitial}${lastInitial}`.toUpperCase();
}

export function ContactAvatar({
  photo,
  firstName,
  lastName,
  size = 'md',
  className = '',
}: ContactAvatarProps) {
  const initials = getInitials(firstName, lastName);
  const sizeClass = SIZE_CLASSES[size];

  if (photo) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
        <img
          src={photo}
          alt={`${firstName} ${lastName}`}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}
    >
      {initials || <User className="w-1/2 h-1/2" />}
    </div>
  );
}
