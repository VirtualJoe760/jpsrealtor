// app/agent/cms/page.tsx
// Refactored CMS Page Component with Blog/Landing Page tabs
'use client';

import React, { useState, useMemo } from 'react';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';
import { FileText, Layout } from 'lucide-react';
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
  LandingPageGrid,
} from './cms-page/components';
import CMSModal from './cms-page/components/CMSModal';

type ContentTab = 'blog' | 'landing';

export default function CMSPage() {
  // Theme
  const { currentTheme } = useTheme();
  const { bgPrimary, textPrimary, textSecondary, textMuted, bgSecondary, border } = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';

  // Tab state
  const [activeTab, setActiveTab] = useState<ContentTab>('blog');

  // Articles data
  const { articles, isLoading, refetch } = useArticles();

  // Split articles by type BEFORE filters
  const blogArticles = useMemo(
    () => articles.filter((a) => a.category !== 'landing-page'),
    [articles]
  );
  const landingArticles = useMemo(
    () => articles.filter((a) => a.category === 'landing-page'),
    [articles]
  );

  const currentArticles = activeTab === 'blog' ? blogArticles : landingArticles;

  // Filters (applied to whichever tab is active)
  const {
    searchTerm,
    filterCategory,
    filteredArticles,
    setSearchTerm,
    setFilterCategory,
  } = useArticleFilters(currentArticles);

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
    modal,
    setModal,
  } = useArticleActions(refetch);

  // Reset to page 1 when filters or tab change
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setPage(1);
  };

  const handleCategoryChange = (category: string) => {
    setFilterCategory(category);
    setPage(1);
  };

  const handleTabChange = (tab: ContentTab) => {
    setActiveTab(tab);
    setSearchTerm('');
    setFilterCategory('all');
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
      className="fixed inset-0 md:relative md:inset-auto md:min-h-screen flex flex-col md:py-6 md:py-12"
      data-page="admin-articles"
    >
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col pt-16 md:pt-0 px-4">
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

        {/* Tab Switcher */}
        <div className={`flex gap-1 mb-4 p-1 rounded-xl ${isLight ? 'bg-gray-100' : 'bg-gray-800/60'}`}>
          <button
            onClick={() => handleTabChange('blog')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'blog'
                ? isLight
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'bg-gray-700 text-white shadow-sm'
                : isLight
                  ? 'text-gray-500 hover:text-gray-700'
                  : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Blog Posts
            <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === 'blog'
                ? isLight ? 'bg-gray-100 text-gray-600' : 'bg-gray-600 text-gray-200'
                : isLight ? 'bg-gray-200 text-gray-500' : 'bg-gray-700 text-gray-400'
            }`}>
              {blogArticles.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange('landing')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'landing'
                ? isLight
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'bg-gray-700 text-white shadow-sm'
                : isLight
                  ? 'text-gray-500 hover:text-gray-700'
                  : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layout className="w-4 h-4" />
            Landing Pages
            <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === 'landing'
                ? isLight ? 'bg-gray-100 text-gray-600' : 'bg-gray-600 text-gray-200'
                : isLight ? 'bg-gray-200 text-gray-500' : 'bg-gray-700 text-gray-400'
            }`}>
              {landingArticles.length}
            </span>
          </button>
        </div>

        {/* Filters — only show category dropdown for blog tab */}
        <ArticleFilters
          searchTerm={searchTerm}
          filterCategory={activeTab === 'blog' ? filterCategory : 'all'}
          onSearchChange={handleSearchChange}
          onCategoryChange={handleCategoryChange}
          textPrimary={textPrimary}
          textMuted={textMuted}
          bgSecondary={bgSecondary}
          border={border}
          isLight={isLight}
          hideCategory={activeTab === 'landing'}
        />

        {/* Content — Scrollable Area */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {paginatedArticles.length > 0 ? (
            activeTab === 'blog' ? (
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
              <LandingPageGrid
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
            )
          ) : (
            <EmptyState textSecondary={textSecondary} />
          )}

          {/* Pagination */}
          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalArticles={filteredArticles.length}
            onPrevious={prevPage}
            onNext={nextPage}
            onPageChange={setPage}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            isLight={isLight}
          />
        </div>
      </div>

      {/* CMS Modal */}
      <CMSModal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        details={modal.details}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        onConfirm={modal.onConfirm}
        autoCloseMs={modal.autoCloseMs}
        showTimer={modal.showTimer}
      />
    </div>
  );
}
