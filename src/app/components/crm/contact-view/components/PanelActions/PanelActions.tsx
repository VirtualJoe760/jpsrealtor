// PanelActions - Action buttons for contact panel
import React from 'react';

interface PanelActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  onMessage: () => void;
  onClose: () => void;
}

export function PanelActions({
  onEdit,
  onDelete,
  onMessage,
  onClose,
}: PanelActionsProps) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <button
        onClick={onEdit}
        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        type="button"
      >
        Edit
      </button>
      <button
        onClick={onMessage}
        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        type="button"
      >
        Message
      </button>
      <button
        onClick={onDelete}
        className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
        type="button"
      >
        Delete
      </button>
      <button
        onClick={onClose}
        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        type="button"
        aria-label="Close panel"
      >
        ✕
      </button>
    </div>
  );
}
