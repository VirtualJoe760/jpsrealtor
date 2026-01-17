// components/CMSHeader.tsx - CMS Page Header

import React from 'react';
import { FileText, Plus } from 'lucide-react';

interface CMSHeaderProps {
  textPrimary: string;
  textSecondary: string;
  isLight: boolean;
  onNewArticle: () => void;
}

export function CMSHeader({
  textPrimary,
  textSecondary,
  isLight,
  onNewArticle,
}: CMSHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8 flex-shrink-0">
      <div className="flex items-center justify-between gap-4">
        <h1 className={`text-xl sm:text-2xl md:text-4xl font-bold ${textPrimary} flex items-center gap-2`}>
          <FileText className={`w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 ${isLight ? 'text-blue-500' : 'text-emerald-400'}`} />
          Content Engine
        </h1>
        <button
          onClick={onNewArticle}
          className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-800'}`}
          aria-label="New Article"
        >
          <Plus className={`w-8 h-8 sm:w-10 sm:h-10 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
        </button>
      </div>
      <p className={`${textSecondary} mt-2 text-sm sm:text-base`}>
        Manage your blog articles and content
      </p>
    </div>
  );
}
