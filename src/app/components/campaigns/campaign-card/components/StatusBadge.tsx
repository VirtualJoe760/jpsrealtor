// components/StatusBadge.tsx - Campaign Status Badge

import React from 'react';
import { getStatusConfig } from '../utils/index';

interface StatusBadgeProps {
  status: string;
  isLight: boolean;
  className?: string;
}

export function StatusBadge({ status, isLight, className = '' }: StatusBadgeProps) {
  const statusConfig = getStatusConfig(status, isLight);
  const StatusIcon = statusConfig.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm ${statusConfig.color} ${className}`}
    >
      <StatusIcon className="w-3.5 h-3.5" />
      {statusConfig.label}
    </span>
  );
}
