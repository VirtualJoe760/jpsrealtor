// components/LandingPageGrid.tsx - Thumbnail panel view for landing pages

import React from 'react';
import Image from 'next/image';
import { Eye, Edit, EyeOff, Trash2 } from 'lucide-react';
import type { Article } from '../types';
import DeploymentStatusBadge from './DeploymentStatusBadge';

interface LandingPageGridProps {
  articles: Article[];
  onView: (category: string, slug: string) => void;
  onEdit: (slug: string) => void;
  onUnpublish: (slug: string) => void;
  onDelete: (slug: string) => void;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  isLight: boolean;
}

export function LandingPageGrid({
  articles,
  onView,
  onEdit,
  onUnpublish,
  onDelete,
  textPrimary,
  textSecondary,
  textMuted,
  border,
  isLight,
}: LandingPageGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {articles.map((article) => (
        <div
          key={article.slug}
          className={`rounded-xl overflow-hidden transition-all group ${
            isLight
              ? 'bg-white/60 border border-gray-200 shadow-md hover:shadow-xl backdrop-blur-sm'
              : 'bg-gray-900/60 border border-gray-800 shadow-lg hover:shadow-2xl backdrop-blur-sm'
          }`}
        >
          {/* Thumbnail */}
          <div className={`relative aspect-[16/9] ${isLight ? 'bg-gray-100' : 'bg-gray-800'}`}>
            {article.image ? (
              <Image
                src={article.image}
                alt={article.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className={`text-3xl ${textMuted}`}>📄</span>
              </div>
            )}
            {/* Status badge overlay */}
            <div className="absolute top-2 right-2">
              <DeploymentStatusBadge slug={article.slug} isDraft={article.draft} />
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className={`text-sm font-semibold ${textPrimary} line-clamp-2 mb-1`}>
              {article.title}
            </h3>
            <p className={`text-xs ${textSecondary} line-clamp-2 mb-3`}>
              {article.excerpt}
            </p>
            <div className={`text-xs ${textMuted} mb-3`}>
              {article.date}
            </div>

            {/* Actions */}
            <div className={`flex items-center gap-1 pt-3 border-t ${
              isLight ? 'border-gray-200' : 'border-gray-700'
            }`}>
              <button
                onClick={() => onView(article.category, article.slug)}
                className={`flex-1 p-1.5 rounded-lg transition-colors text-xs flex items-center justify-center gap-1 ${
                  textSecondary
                } ${isLight ? 'hover:bg-gray-100 hover:text-gray-900' : 'hover:bg-gray-700 hover:text-white'}`}
                title="View"
              >
                <Eye className="w-3.5 h-3.5" />
                View
              </button>
              <button
                onClick={() => onEdit(article.slug)}
                className={`flex-1 p-1.5 rounded-lg transition-colors text-xs flex items-center justify-center gap-1 ${
                  textSecondary
                } ${isLight ? 'hover:bg-gray-100 hover:text-emerald-600' : 'hover:bg-gray-700 hover:text-emerald-400'}`}
                title="Edit"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={() => onUnpublish(article.slug)}
                className={`flex-1 p-1.5 rounded-lg transition-colors text-xs flex items-center justify-center gap-1 ${
                  textSecondary
                } ${isLight ? 'hover:bg-gray-100 hover:text-orange-600' : 'hover:bg-gray-700 hover:text-orange-400'}`}
                title="Unpublish"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(article.slug)}
                className={`flex-1 p-1.5 rounded-lg transition-colors text-xs flex items-center justify-center gap-1 ${
                  textSecondary
                } ${isLight ? 'hover:bg-gray-100 hover:text-red-600' : 'hover:bg-gray-700 hover:text-red-400'}`}
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
