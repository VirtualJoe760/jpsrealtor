// app/agent/cms/page.tsx
// Refactored CMS Page Component
// Original: 460 lines
// Refactored: ~100 lines (main component) + modular architecture
'use client';

import React from 'react';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';
import AgentNav from '@/app/components/AgentNav';

// Hooks
import {
  useArticles,
  useArticleFilters,
  useArticlePagination,
  useArticleActions,
} from './cms-page/hooks';

// Components
import {
  CMSHeader,
  ArticleFilters,
  ArticleList,
  EmptyState,
  PaginationControls,
} from './cms-page/components';

export default function CMSPage() {
  // Theme
  const { currentTheme } = useTheme();
  const { bgPrimary, textPrimary, textSecondary, textMuted, bgSecondary, border } = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';

  // Articles data
  const { articles, isLoading, refetch } = useArticles();

  // Filters
  const {
    searchTerm,
    filterCategory,
    filteredArticles,
    setSearchTerm,
    setFilterCategory,
  } = useArticleFilters(articles);

  // Pagination
  const {
    page,
    totalPages,
    paginatedArticles,
    prevPage,
    nextPage,
    setPage,
  } = useArticlePagination(filteredArticles);

  // Actions
  const {
    handleDelete,
    handleUnpublish,
    handleView,
    handleEdit,
    handleNewArticle,
  } = useArticleActions(refetch);

  // Reset to page 1 when filters change
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setPage(1);
  };

  const handleCategoryChange = (category: string) => {
    setFilterCategory(category);
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className={`fixed inset-0 md:relative md:inset-auto md:min-h-screen flex items-center justify-center ${bgPrimary}`}>
        <div className={`${textPrimary} text-center`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current mx-auto mb-4"></div>
          <p>Loading articles...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 md:relative md:inset-auto md:min-h-screen flex flex-col md:py-6 md:py-12 overflow-hidden"
      data-page="admin-articles"
    >
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col overflow-hidden pt-16 md:pt-0 px-4">
        {/* Agent Navigation */}
        <div className="flex-shrink-0">
          <AgentNav />
        </div>

        {/* Header */}
        <CMSHeader
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          isLight={isLight}
          onNewArticle={handleNewArticle}
        />

        {/* Filters */}
        <ArticleFilters
          searchTerm={searchTerm}
          filterCategory={filterCategory}
          onSearchChange={handleSearchChange}
          onCategoryChange={handleCategoryChange}
          textPrimary={textPrimary}
          textMuted={textMuted}
          bgSecondary={bgSecondary}
          border={border}
          isLight={isLight}
        />

        {/* Articles List - Scrollable Area */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {paginatedArticles.length > 0 ? (
            <ArticleList
              articles={paginatedArticles}
              onView={handleView}
              onEdit={handleEdit}
              onUnpublish={handleUnpublish}
              onDelete={handleDelete}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textMuted={textMuted}
              border={border}
              isLight={isLight}
            />
          ) : (
            <EmptyState textSecondary={textSecondary} />
          )}

          {/* Pagination */}
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPrevious={prevPage}
            onNext={nextPage}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            isLight={isLight}
          />
        </div>
      </div>
    </div>
  );
}
