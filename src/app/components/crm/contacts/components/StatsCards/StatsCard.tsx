// Base StatsCard component - Reusable card for displaying statistics

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { getCardClassName } from '../../constants/styles';

interface StatsCardProps {
  icon: LucideIcon;
  iconColor: string;
  title?: string;
  count: number;
  description: string;
  onClick: () => void;
  isLight: boolean;
  borderColor?: string;
  className?: string;
}

export function StatsCard({
  icon: Icon,
  iconColor,
  title,
  count,
  description,
  onClick,
  isLight,
  borderColor,
  className = ''
}: StatsCardProps) {
  return (
    <button
      onClick={onClick}
      className={`${getCardClassName(isLight)} ${className}`}
      style={{ borderColor }}
    >
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-8 h-8 ${iconColor}`} />
      </div>

      {title && (
        <h3 className={`text-lg font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          {title}
        </h3>
      )}

      <p className={`text-3xl font-bold ${iconColor}`}>
        {count.toLocaleString()}
      </p>

      <p className={`text-sm mt-2 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
        {description}
      </p>
    </button>
  );
}
