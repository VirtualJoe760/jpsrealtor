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
      className={`${getCardClassName(isLight)} flex items-center justify-between`}
      style={{
        borderColor: isSelected ? tag.color : undefined,
      }}
    >
      <div className="flex flex-col items-start text-left">
        <p className={`text-sm font-medium mb-1 ${isLight ? 'text-gray-600' : 'text-white'}`}>
          {tag.name}
        </p>
        <p className={`text-3xl font-bold ${isLight ? 'text-blue-600' : 'text-emerald-400'}`}>
          {tag.contactCount.toLocaleString()}
        </p>
      </div>
      <div className="p-3 rounded-lg" style={{ backgroundColor: `${tag.color}20` }}>
        <TagIcon className="w-6 h-6" style={{ color: tag.color }} />
      </div>
    </button>
  );
}
