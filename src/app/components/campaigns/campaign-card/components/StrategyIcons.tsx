// components/StrategyIcons.tsx - Active Strategy Icons Display

import React from 'react';
import { motion } from 'framer-motion';
import type { ActiveStrategies } from '../types/index';
import { STRATEGY_ICONS, STRATEGY_COLORS_LIGHT, STRATEGY_COLORS_DARK } from '../constants/index';

interface StrategyIconsProps {
  activeStrategies: ActiveStrategies;
  isLight: boolean;
  variant?: 'list' | 'grid';
}

export function StrategyIcons({ activeStrategies, isLight, variant = 'list' }: StrategyIconsProps) {
  const colors = isLight ? STRATEGY_COLORS_LIGHT : STRATEGY_COLORS_DARK;
  const isGrid = variant === 'grid';

  return (
    <div className="flex items-center gap-2">
      {activeStrategies.voicemail && (
        <StrategyIcon
          Icon={STRATEGY_ICONS.voicemail}
          title="Voicemail strategy active"
          bgClass={colors.voicemail.bg}
          textClass={colors.voicemail.text}
          isGrid={isGrid}
        />
      )}
      {activeStrategies.email && (
        <StrategyIcon
          Icon={STRATEGY_ICONS.email}
          title="Email strategy active"
          bgClass={colors.email.bg}
          textClass={colors.email.text}
          isGrid={isGrid}
        />
      )}
      {activeStrategies.text && (
        <StrategyIcon
          Icon={STRATEGY_ICONS.text}
          title="Text strategy active"
          bgClass={colors.text.bg}
          textClass={colors.text.text}
          isGrid={isGrid}
        />
      )}
    </div>
  );
}

interface StrategyIconProps {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  bgClass: string;
  textClass: string;
  isGrid: boolean;
}

function StrategyIcon({ Icon, title, bgClass, textClass, isGrid }: StrategyIconProps) {
  if (isGrid) {
    return (
      <motion.div
        whileHover={{ scale: 1.1 }}
        className={`p-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700`}
        title={title}
      >
        <Icon className={`w-6 h-6 ${textClass}`} />
      </motion.div>
    );
  }

  return (
    <div className={`p-2 ${bgClass} rounded-lg`} title={title}>
      <Icon className={`w-5 h-5 ${textClass}`} />
    </div>
  );
}
