// components/ArticleListItem.tsx - Desktop and Mobile Article Row

import React from 'react';
import Image from 'next/image';
import { Eye, Edit, EyeOff, Trash2 } from 'lucide-react';
import type { Article } from '../types';
import { formatCategoryLabel } from '../utils';

interface ArticleListItemProps {
  article: Article;
  onView: () => void;
  onEdit: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  isLight: boolean;
  isDesktop?: boolean;
}

export function ArticleListItem({
  article,
  onView,
  onEdit,
  onUnpublish,
  onDelete,
  textPrimary,
  textSecondary,
  textMuted,
  border,
  isLight,
  isDesktop = false,
}: ArticleListItemProps) {
  if (isDesktop) {
    return (
      <div className={`flex items-center px-6 py-6 ${isLight ? 'bg-white/40 backdrop-blur-sm' : 'bg-gray-900/40 backdrop-blur-sm'}`}>
        {/* Article Column (with thumbnail) */}
        <div className="flex-1 flex gap-4 items-center">
          {/* Thumbnail */}
          {article.image && (
            <div className="flex-shrink-0">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  className="object-cover"
                  sizes="64px"
                  quality={100}
                  unoptimized={true}
                />
              </div>
            </div>
          )}
          {/* Title and Excerpt */}
          <div className="flex-1 min-w-0">
            <p className={`${textPrimary} font-medium`}>{article.title}</p>
            <p className={`text-sm ${textSecondary} mt-1 line-clamp-1`}>{article.excerpt}</p>
          </div>
        </div>

        {/* Category Column */}
        <div className="w-48">
          <span className={`text-sm ${textSecondary} capitalize`}>
            {formatCategoryLabel(article.category)}
          </span>
        </div>

        {/* Date Column */}
        <div className="w-32">
          <span className={`text-sm ${textSecondary}`}>{article.date}</span>
        </div>

        {/* Actions Column */}
        <div className="w-48 flex items-center justify-end gap-2">
          <button
            onClick={onView}
            className={`p-2 rounded-lg transition-colors ${textSecondary} ${isLight ? 'hover:bg-gray-100 hover:text-gray-900' : 'hover:bg-gray-700 hover:text-white'}`}
            title="View on Website"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            className={`p-2 rounded-lg transition-colors ${textSecondary} ${isLight ? 'hover:bg-gray-100 hover:text-emerald-600' : 'hover:bg-gray-700 hover:text-emerald-400'}`}
            title="Edit Article"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onUnpublish}
            className={`p-2 rounded-lg transition-colors ${textSecondary} ${isLight ? 'hover:bg-gray-100 hover:text-orange-600' : 'hover:bg-gray-700 hover:text-orange-400'}`}
            title="Unpublish from Website"
          >
            <EyeOff className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className={`p-2 rounded-lg transition-colors ${textSecondary} ${isLight ? 'hover:bg-gray-100 hover:text-red-600' : 'hover:bg-gray-700 hover:text-red-400'}`}
            title="Permanently Delete from GitHub"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Mobile View
  return (
    <div className={`py-4 px-4 ${isLight ? 'bg-white/40 backdrop-blur-sm' : 'bg-gray-900/40 backdrop-blur-sm'}`}>
      <div className="flex gap-3 mb-3">
        {/* Thumbnail */}
        {article.image && (
          <div className="flex-shrink-0">
            <div className="relative w-20 h-20 rounded-lg overflow-hidden">
              <Image
                src={article.image}
                alt={article.title}
                fill
                className="object-cover"
                sizes="80px"
                quality={100}
                unoptimized={true}
              />
            </div>
          </div>
        )}
        {/* Title and Excerpt */}
        <div className="flex-1 min-w-0">
          <h3 className={`${textPrimary} font-semibold text-base mb-1 line-clamp-2`}>
            {article.title}
          </h3>
          <p className={`text-sm ${textSecondary} line-clamp-2`}>{article.excerpt}</p>
        </div>
      </div>

      <div className={`flex items-center gap-4 text-xs ${textMuted} mb-3`}>
        <span className="capitalize">{formatCategoryLabel(article.category)}</span>
        <span>•</span>
        <span>{article.date}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onView}
          className={`flex-1 p-2 rounded-lg transition-colors ${textSecondary} ${isLight ? 'hover:bg-gray-100 hover:text-gray-900' : 'hover:bg-gray-700 hover:text-white'} text-sm flex items-center justify-center gap-2`}
        >
          <Eye className="w-4 h-4" />
          View
        </button>
        <button
          onClick={onEdit}
          className={`flex-1 p-2 rounded-lg transition-colors ${textSecondary} ${isLight ? 'hover:bg-gray-100 hover:text-emerald-600' : 'hover:bg-gray-700 hover:text-emerald-400'} text-sm flex items-center justify-center gap-2`}
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={onUnpublish}
          className={`flex-1 p-2 rounded-lg transition-colors ${textSecondary} ${isLight ? 'hover:bg-gray-100 hover:text-orange-600' : 'hover:bg-gray-700 hover:text-orange-400'} text-sm flex items-center justify-center gap-2`}
        >
          <EyeOff className="w-4 h-4" />
          Unpublish
        </button>
        <button
          onClick={onDelete}
          className={`flex-1 p-2 rounded-lg transition-colors ${textSecondary} ${isLight ? 'hover:bg-gray-100 hover:text-red-600' : 'hover:bg-gray-700 hover:text-red-400'} text-sm flex items-center justify-center gap-2`}
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  );
}
