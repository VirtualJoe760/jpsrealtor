// components/BackButton.tsx - Back navigation button

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { getButtonClasses } from '../utils';

interface BackButtonProps {
  onBack: () => void;
  isLight: boolean;
}

export function BackButton({ onBack, isLight }: BackButtonProps) {
  return (
    <div className="fixed md:static top-4 left-4 md:top-auto md:left-auto z-30 md:z-auto md:mb-2">
      <button
        onClick={onBack}
        className={`p-2.5 rounded-lg transition-all ${getButtonClasses(isLight)}`}
        aria-label="Go back"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>
    </div>
  );
}
