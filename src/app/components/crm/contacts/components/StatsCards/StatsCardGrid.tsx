// StatsCardGrid component - Organizes stats cards into sections

import React from 'react';
import { Users } from 'lucide-react';
import { ContactStats, Tag, ContactStatus } from '../../types';
import { StatsCard } from './StatsCard';
import { StatusCard } from './StatusCard';
import { TagCard } from './TagCard';

interface StatsCardGridProps {
  stats: ContactStats;
  tags: Tag[];
  onViewAll: () => void;
  onSelectTag: (tagName: string) => void;
  onSelectStatus: (status: ContactStatus) => void;
  selectedTag: string | null;
  isLight: boolean;
}

export function StatsCardGrid({
  stats,
  tags,
  onViewAll,
  onSelectTag,
  onSelectStatus,
  selectedTag,
  isLight
}: StatsCardGridProps) {
  return (
    <div className="space-y-8">
      {/* All Contacts & Tags Section */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* All Contacts Card */}
          <StatsCard
            icon={Users}
            iconColor={isLight ? 'text-blue-600' : 'text-emerald-500'}
            count={stats.total}
            description="View all contacts"
            onClick={onViewAll}
            isLight={isLight}
          />

          {/* Tag Cards */}
          {tags.map((tag) => (
            <TagCard
              key={tag.name}
              tag={tag}
              onClick={() => onSelectTag(tag.name)}
              isSelected={selectedTag === tag.name}
              isLight={isLight}
            />
          ))}
        </div>
      </div>

      {/* Status Cards Section */}
      <div>
        <h2 className={`text-2xl font-bold mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          By Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.values(ContactStatus).map((status) => (
            <StatusCard
              key={status}
              status={status}
              count={stats.byStatus[status] || 0}
              onClick={() => onSelectStatus(status)}
              isLight={isLight}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
