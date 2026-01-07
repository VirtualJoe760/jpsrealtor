// app/components/campaigns/DeleteCampaignModal.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';

interface DeleteCampaignModalProps {
  isOpen: boolean;
  campaignName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export default function DeleteCampaignModal({
  isOpen,
  campaignName,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteCampaignModalProps) {
  const { cardBg, textPrimary, textSecondary, border } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${cardBg} rounded-2xl ${border} shadow-2xl max-w-md w-full p-6`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${isLight ? 'bg-red-100' : 'bg-red-900/30'} rounded-lg`}>
                    <ExclamationTriangleIcon
                      className={`w-6 h-6 ${isLight ? 'text-red-600' : 'text-red-400'}`}
                    />
                  </div>
                  <h3 className={`text-xl font-bold ${textPrimary}`}>
                    Delete Campaign
                  </h3>
                </div>
                <button
                  onClick={onCancel}
                  disabled={isDeleting}
                  className={`p-1 ${isLight ? 'hover:bg-gray-100' : 'hover:bg-slate-700'} rounded-lg transition-colors`}
                >
                  <XMarkIcon className={`w-5 h-5 ${textSecondary}`} />
                </button>
              </div>

              {/* Content */}
              <div className="mb-6">
                <p className={`${textPrimary} mb-2`}>
                  Are you sure you want to delete this campaign?
                </p>
                <div className={`${isLight ? 'bg-gray-100' : 'bg-slate-800'} rounded-lg p-3 mb-3`}>
                  <p className={`font-semibold ${textPrimary} truncate`}>
                    {campaignName}
                  </p>
                </div>
                <p className={`text-sm ${textSecondary}`}>
                  This action cannot be undone. All campaign data, including:
                </p>
                <ul className={`text-sm ${textSecondary} list-disc list-inside mt-2 space-y-1 ml-2`}>
                  <li>Contact associations</li>
                  <li>Generated scripts</li>
                  <li>Audio files</li>
                  <li>Analytics and delivery data</li>
                </ul>
                <p className={`text-sm ${isLight ? 'text-red-600' : 'text-red-400'} font-medium mt-3`}>
                  will be permanently deleted.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  disabled={isDeleting}
                  className={`flex-1 px-4 py-2.5 ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' : 'bg-slate-700 hover:bg-slate-600 text-white'} rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isDeleting}
                  className={`flex-1 px-4 py-2.5 ${isLight ? 'bg-red-600 hover:bg-red-700' : 'bg-red-600 hover:bg-red-500'} text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Campaign'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
