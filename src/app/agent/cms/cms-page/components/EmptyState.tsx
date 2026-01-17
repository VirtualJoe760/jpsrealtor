// components/EmptyState.tsx - No articles found state

import React from 'react';
import { FileText } from 'lucide-react';

interface EmptyStateProps {
  textSecondary: string;
}

export function EmptyState({ textSecondary }: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${textSecondary}`}>
      <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
      <p>No articles found</p>
    </div>
  );
}
