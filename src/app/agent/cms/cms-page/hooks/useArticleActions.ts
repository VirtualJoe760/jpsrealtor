// hooks/useArticleActions.ts - Hook for article actions (delete, unpublish)

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { CMSModalProps } from '../components/CMSModal';
import { useDeploymentStatus } from './useDeploymentStatus';

interface UseArticleActionsResult {
  handleDelete: (slug: string) => void;
  handleUnpublish: (slug: string) => void;
  handleView: (category: string, slug: string) => void;
  handleEdit: (slug: string) => void;
  handleNewArticle: () => void;
  modal: Omit<CMSModalProps, 'isOpen' | 'onClose'> & { isOpen: boolean };
  setModal: React.Dispatch<React.SetStateAction<Omit<CMSModalProps, 'isOpen' | 'onClose'> & { isOpen: boolean }>>;
}

/**
 * useArticleActions Hook
 * Manages article actions (delete, unpublish, navigation) with modals
 */
export function useArticleActions(refetch?: () => Promise<void>): UseArticleActionsResult {
  const router = useRouter();
  const { startDeployment } = useDeploymentStatus();

  const [modal, setModal] = useState<Omit<CMSModalProps, 'isOpen' | 'onClose'> & { isOpen: boolean }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const handleDelete = useCallback(
    (slug: string) => {
      // Show confirmation modal
      setModal({
        isOpen: true,
        type: 'confirm',
        title: 'Delete Article?',
        message: 'Are you sure you want to permanently delete this article from GitHub?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        onConfirm: async () => {
          // Close confirm modal
          setModal({ ...modal, isOpen: false });

          try {
            const response = await fetch(`/api/articles/${slug}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              throw new Error('Failed to delete article');
            }

            // Show success modal
            setModal({
              isOpen: true,
              type: 'success',
              title: 'Article Deleted',
              message: 'Article deleted successfully',
              autoCloseMs: 2000,
            });

            // Refetch articles after brief delay
            if (refetch) {
              setTimeout(async () => {
                await refetch();
              }, 2000);
            }
          } catch (error) {
            console.error('Error deleting article:', error);
            setModal({
              isOpen: true,
              type: 'error',
              title: 'Delete Failed',
              message: 'Failed to delete article',
              details: error instanceof Error ? error.message : undefined,
            });
          }
        },
      });
    },
    [refetch]
  );

  const handleUnpublish = useCallback(
    (slug: string) => {
      // Show confirmation modal
      setModal({
        isOpen: true,
        type: 'confirm',
        title: 'Unpublish Article?',
        message: 'Unpublish this article from the website?',
        confirmText: 'Unpublish',
        cancelText: 'Cancel',
        onConfirm: async () => {
          // Close confirm modal
          setModal({ ...modal, isOpen: false });

          try {
            const response = await fetch(`/api/articles/unpublish?slugId=${slug}`, {
              method: 'DELETE',
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
              throw new Error(data.error || 'Failed to unpublish article');
            }

            // Start deployment tracking if in production
            if (data.environment === 'production') {
              startDeployment(slug, 'production');
            }

            // Show success modal
            setModal({
              isOpen: true,
              type: 'success',
              title: 'Article Unpublished',
              message: data.message || 'Article unpublished successfully',
              autoCloseMs: 2000,
            });

            // Refetch articles after brief delay
            if (refetch) {
              setTimeout(async () => {
                await refetch();
              }, 2000);
            }
          } catch (error) {
            console.error('Error unpublishing article:', error);
            setModal({
              isOpen: true,
              type: 'error',
              title: 'Unpublish Failed',
              message: 'Failed to unpublish article',
              details: error instanceof Error ? error.message : undefined,
            });
          }
        },
      });
    },
    [refetch, startDeployment]
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
    modal,
    setModal,
  };
}
