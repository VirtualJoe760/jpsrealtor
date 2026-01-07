'use client';

// src/app/components/campaigns/ProfileCompletionModal.tsx

import { motion } from 'framer-motion';
import { XMarkIcon, UserIcon, PhoneIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';
import { useRouter } from 'next/navigation';

interface ProfileCompletionModalProps {
  missingFields: string[];
  onClose: () => void;
}

export default function ProfileCompletionModal({
  missingFields,
  onClose,
}: ProfileCompletionModalProps) {
  const { cardBg, textPrimary, textSecondary } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const router = useRouter();

  const handleGoToSettings = () => {
    router.push('/dashboard/settings');
    onClose();
  };

  const getFieldIcon = (field: string) => {
    if (field.includes('name')) return UserIcon;
    if (field.includes('phone')) return PhoneIcon;
    if (field.includes('brokerage')) return BuildingOfficeIcon;
    return UserIcon;
  };

  const getFieldLabel = (field: string) => {
    if (field === 'name') return 'Full Name';
    if (field === 'phone number') return 'Phone Number';
    if (field === 'brokerage name') return 'Brokerage Name';
    return field;
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md ${cardBg} rounded-lg shadow-2xl p-6`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className={`text-xl font-bold ${textPrimary} mb-1`}>
              Complete Your Profile
            </h2>
            <p className={`text-sm ${textSecondary}`}>
              Required for voicemail script generation
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 ${isLight ? 'hover:bg-gray-100' : 'hover:bg-slate-700'} rounded-lg transition-colors`}
          >
            <XMarkIcon className={`w-5 h-5 ${textSecondary}`} />
          </button>
        </div>

        {/* Info */}
        <div className={`${isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/20 border-amber-900/30'} border-2 rounded-lg p-4 mb-6`}>
          <p className={`text-sm ${isLight ? 'text-amber-900' : 'text-amber-200'} mb-3`}>
            To generate personalized voicemail scripts, we need your agent information. This will be included in the scripts sent to your contacts.
          </p>

          <div className="space-y-2">
            <p className={`text-xs font-semibold ${isLight ? 'text-amber-800' : 'text-amber-300'} mb-2`}>
              Missing Information:
            </p>
            {missingFields.map((field) => {
              const Icon = getFieldIcon(field);
              return (
                <div key={field} className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                  <span className={`text-sm ${isLight ? 'text-amber-900' : 'text-amber-200'}`}>
                    {getFieldLabel(field)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={`flex-1 px-4 py-2 ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-slate-700 hover:bg-slate-600 text-white'} rounded-lg font-medium transition-colors`}
          >
            Cancel
          </button>
          <button
            onClick={handleGoToSettings}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all"
          >
            Go to Settings
          </button>
        </div>
      </motion.div>
    </>
  );
}
