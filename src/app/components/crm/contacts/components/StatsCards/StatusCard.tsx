// StatusCard component - Displays contact status statistics

import React from 'react';
import { ContactStatus } from '../../types';
import { STATUS_CONFIG, getStatusColor } from '../../constants/styles';
import { StatsCard } from './StatsCard';

interface StatusCardProps {
  status: ContactStatus;
  count: number;
  onClick: () => void;
  isLight: boolean;
}

export function StatusCard({ status, count, onClick, isLight }: StatusCardProps) {
  const config = STATUS_CONFIG[status];
  const iconColor = getStatusColor(status, isLight);

  return (
    <StatsCard
      icon={config.icon}
      iconColor={iconColor}
      count={count}
      description={config.label}
      onClick={onClick}
      isLight={isLight}
    />
  );
}
