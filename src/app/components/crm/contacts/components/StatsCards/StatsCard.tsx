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
      className={`${getCardClassName(isLight)} ${className} flex items-center justify-between`}
      style={{ borderColor }}
    >
      <div className="flex flex-col items-start text-left">
        <p className={`text-sm font-medium mb-1 ${isLight ? 'text-gray-600' : 'text-white'}`}>
          {description}
        </p>
        <p className={`text-3xl font-bold ${isLight ? 'text-blue-600' : 'text-emerald-400'}`}>
          {count.toLocaleString()}
        </p>
      </div>
      <div className={`p-3 rounded-lg ${isLight ? 'bg-blue-100' : 'bg-blue-900/30'}`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
    </button>
  );
}
