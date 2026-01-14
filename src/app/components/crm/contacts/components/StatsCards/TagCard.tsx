// TagCard component - Displays tag-based contact grouping

import React from 'react';
import { Tag as TagIcon } from 'lucide-react';
import { Tag } from '../../types';
import { getCardClassName } from '../../constants/styles';

interface TagCardProps {
  tag: Tag;
  onClick: () => void;
  isSelected: boolean;
  isLight: boolean;
}

export function TagCard({ tag, onClick, isSelected, isLight }: TagCardProps) {
  return (
    <button
      onClick={onClick}
      className={getCardClassName(isLight)}
      style={{
        borderColor: isSelected ? tag.color : undefined,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <TagIcon className="w-8 h-8" style={{ color: tag.color }} />
      </div>

      <h3 className={`text-lg font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
        {tag.name}
      </h3>

      <p className="text-3xl font-bold" style={{ color: tag.color }}>
        {tag.contactCount.toLocaleString()}
      </p>
    </button>
  );
}
