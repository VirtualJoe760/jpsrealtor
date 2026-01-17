// components/ArticleList.tsx - Article List Container

import React from 'react';
import type { Article } from '../types';
import { ArticleListItem } from './ArticleListItem';

interface ArticleListProps {
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

export function ArticleList({
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
}: ArticleListProps) {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden lg:block">
        {articles.map((article, index) => (
          <div key={article.slug}>
            {index > 0 && <hr className={`${border}`} />}
            <ArticleListItem
              article={article}
              onView={() => onView(article.category, article.slug)}
              onEdit={() => onEdit(article.slug)}
              onUnpublish={() => onUnpublish(article.slug)}
              onDelete={() => onDelete(article.slug)}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textMuted={textMuted}
              border={border}
              isLight={isLight}
              isDesktop
            />
          </div>
        ))}
      </div>

      {/* Mobile View */}
      <div className="lg:hidden">
        {articles.map((article, index) => (
          <div key={article.slug}>
            {index > 0 && <hr className={`${border}`} />}
            <ArticleListItem
              article={article}
              onView={() => onView(article.category, article.slug)}
              onEdit={() => onEdit(article.slug)}
              onUnpublish={() => onUnpublish(article.slug)}
              onDelete={() => onDelete(article.slug)}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textMuted={textMuted}
              border={border}
              isLight={isLight}
            />
          </div>
        ))}
      </div>
    </>
  );
}
