// ContactCardSkeleton - Loading skeleton for contact cards

import React from 'react';

interface ContactCardSkeletonProps {
  isLight: boolean;
  viewMode?: 'card' | 'list';
}

export function ContactCardSkeleton({ isLight, viewMode = 'card' }: ContactCardSkeletonProps) {
  const skeletonClass = isLight ? 'bg-gray-200' : 'bg-gray-700';
  const containerClass = isLight ? 'bg-white' : 'bg-gray-800';

  if (viewMode === 'list') {
    return (
      <div className={`flex items-center gap-4 px-4 py-3 border-b animate-pulse ${
        isLight ? 'border-gray-200' : 'border-gray-700'
      }`}>
        {/* Checkbox */}
        <div className={`w-4 h-4 rounded ${skeletonClass}`} />

        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full ${skeletonClass}`} />

        {/* Name & Org */}
        <div className="w-48 space-y-2">
          <div className={`h-4 ${skeletonClass} rounded w-3/4`} />
          <div className={`h-3 ${skeletonClass} rounded w-1/2`} />
        </div>

        {/* Status */}
        <div className="w-32">
          <div className={`h-4 ${skeletonClass} rounded w-20`} />
        </div>

        {/* Contact Info */}
        <div className="flex-1 flex gap-6">
          <div className={`h-4 ${skeletonClass} rounded w-28`} />
          <div className={`h-4 ${skeletonClass} rounded w-32`} />
        </div>

        {/* Tags */}
        <div className="w-40 flex gap-2">
          <div className={`h-6 ${skeletonClass} rounded-full w-16`} />
          <div className={`h-6 ${skeletonClass} rounded-full w-16`} />
        </div>

        {/* Date */}
        <div className="w-24">
          <div className={`h-4 ${skeletonClass} rounded w-16`} />
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-xl ${containerClass} animate-pulse`}>
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {/* Checkbox */}
        <div className={`w-4 h-4 rounded mt-1 ${skeletonClass}`} />

        {/* Avatar */}
        <div className={`w-16 h-16 rounded-full ${skeletonClass}`} />

        {/* Name & Status */}
        <div className="flex-1 space-y-2">
          <div className={`h-5 ${skeletonClass} rounded w-3/4`} />
          <div className={`h-4 ${skeletonClass} rounded w-1/2`} />
          <div className={`h-4 ${skeletonClass} rounded w-1/3 mt-2`} />
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        <div className={`h-4 ${skeletonClass} rounded w-2/3`} />
        <div className={`h-4 ${skeletonClass} rounded w-3/4`} />
        <div className={`h-4 ${skeletonClass} rounded w-1/2`} />
      </div>

      {/* Tags */}
      <div className="flex gap-2 mb-4">
        <div className={`h-6 ${skeletonClass} rounded-full w-20`} />
        <div className={`h-6 ${skeletonClass} rounded-full w-16`} />
        <div className={`h-6 ${skeletonClass} rounded-full w-24`} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t">
        <div className={`h-4 ${skeletonClass} rounded w-20`} />
        <div className={`h-4 ${skeletonClass} rounded w-16`} />
      </div>
    </div>
  );
}
