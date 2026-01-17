// hooks/useArticleActions.ts - Hook for article actions (delete, unpublish)

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UseArticleActionsResult {
  handleDelete: (slug: string) => Promise<void>;
  handleUnpublish: (slug: string) => Promise<void>;
  handleView: (category: string, slug: string) => void;
  handleEdit: (slug: string) => void;
  handleNewArticle: () => void;
}

/**
 * useArticleActions Hook
 * Manages article actions (delete, unpublish, navigation)
 */
export function useArticleActions(refetch?: () => Promise<void>): UseArticleActionsResult {
  const router = useRouter();

  const handleDelete = useCallback(
    async (slug: string) => {
      if (!confirm('Are you sure you want to permanently delete this article from GitHub?')) {
        return;
      }

      try {
        const response = await fetch(`/api/articles/${slug}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete article');
        }

        alert('Article deleted successfully');
        if (refetch) await refetch();
      } catch (error) {
        console.error('Error deleting article:', error);
        alert('Failed to delete article');
      }
    },
    [refetch]
  );

  const handleUnpublish = useCallback(
    async (slug: string) => {
      if (!confirm('Unpublish this article from the website?')) {
        return;
      }

      try {
        const response = await fetch(`/api/articles/${slug}/unpublish`, {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('Failed to unpublish article');
        }

        alert('Article unpublished successfully');
        if (refetch) await refetch();
      } catch (error) {
        console.error('Error unpublishing article:', error);
        alert('Failed to unpublish article');
      }
    },
    [refetch]
  );

  const handleView = useCallback(
    (category: string, slug: string) => {
      router.push(`/insights/${category}/${slug}`);
    },
    [router]
  );

  const handleEdit = useCallback(
    (slug: string) => {
      router.push(`/agent/cms/edit/${slug}`);
    },
    [router]
  );

  const handleNewArticle = useCallback(() => {
    router.push('/agent/cms/new');
  }, [router]);

  return {
    handleDelete,
    handleUnpublish,
    handleView,
    handleEdit,
    handleNewArticle,
  };
}
