'use client';

import { useEffect, useCallback } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export interface CMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'confirm' | 'loading';
  title: string;
  message: string;
  details?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  autoCloseMs?: number;
  showTimer?: boolean;
}

export default function CMSModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  details,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  autoCloseMs,
  showTimer = false,
}: CMSModalProps) {
  // Auto-close timer
  useEffect(() => {
    if (isOpen && autoCloseMs) {
      const timer = setTimeout(onClose, autoCloseMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseMs, onClose]);

  // Escape key handler
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const iconColors = {
    success: 'text-green-600',
    error: 'text-red-600',
    confirm: 'text-yellow-600',
    loading: 'text-blue-600',
  };

  const bgColors = {
    success: 'bg-green-50',
    error: 'bg-red-50',
    confirm: 'bg-yellow-50',
    loading: 'bg-blue-50',
  };

  const buttonColors = {
    success: 'bg-green-600 hover:bg-green-700',
    error: 'bg-red-600 hover:bg-red-700',
    confirm: 'bg-yellow-600 hover:bg-yellow-700',
    loading: 'bg-blue-600 hover:bg-blue-700',
  };

  const Icon = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    confirm: ExclamationTriangleIcon,
    loading: () => (
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    ),
  }[type];

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          {/* Content */}
          <div className="p-6">
            {/* Icon */}
            <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${bgColors[type]}`}>
              <Icon className={`h-10 w-10 ${iconColors[type]}`} />
            </div>

            {/* Title */}
            <div className="mt-4 text-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
            </div>

            {/* Message */}
            <div className="mt-2 text-center">
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {message}
              </p>
            </div>

            {/* Details (warnings, errors) */}
            {details && (
              <div className="mt-3 bg-gray-50 rounded-md p-3">
                <p className="text-xs text-gray-700 whitespace-pre-line font-mono">
                  {details}
                </p>
              </div>
            )}

            {/* Auto-close timer */}
            {showTimer && autoCloseMs && (
              <div className="mt-3 text-center">
                <p className="text-xs text-gray-500">
                  Redirecting in {Math.ceil(autoCloseMs / 1000)}s...
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              {type === 'confirm' ? (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    {cancelText}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonColors[type]}`}
                  >
                    {confirmText}
                  </button>
                </>
              ) : type === 'loading' ? null : (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
