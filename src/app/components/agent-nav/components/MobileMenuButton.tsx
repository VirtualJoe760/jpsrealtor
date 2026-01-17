// components/MobileMenuButton.tsx

import React from 'react';
import { Menu, X } from 'lucide-react';
import { getButtonClasses } from '../utils';

interface MobileMenuButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  isLight: boolean;
}

export function MobileMenuButton({ isOpen, onToggle, isLight }: MobileMenuButtonProps) {
  return (
    <div className="md:hidden fixed top-4 right-4 z-30">
      <button
        onClick={onToggle}
        className={`p-2.5 rounded-lg transition-all ${getButtonClasses(isLight)}`}
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
      </button>
    </div>
  );
}
