"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { getAvailableAvatars } from '../avatars/registry';
import { AvatarConfig } from '../types';

/**
 * Avatar Selector Component
 * Allows users to choose their tutorial guide avatar
 * Used in settings page
 */

interface AvatarSelectorProps {
  /** Current theme for styling */
  isLight: boolean;

  /** Callback when avatar is changed */
  onAvatarChanged?: (avatarId: string) => void;
}

export function AvatarSelector({ isLight, onAvatarChanged }: AvatarSelectorProps) {
  const { data: session, update } = useSession();
  const [availableAvatars, setAvailableAvatars] = useState<AvatarConfig[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('toasty');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load available avatars on mount
  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      const userRoles = user.roles || [];
      const avatars = getAvailableAvatars(userRoles);
      setAvailableAvatars(avatars);

      // Set current selection from user profile
      setSelectedAvatar(user.tutorialAvatarId || 'toasty');
    } else {
      // Not logged in - show only default avatars
      const avatars = getAvailableAvatars([]);
      setAvailableAvatars(avatars);
    }
  }, [session]);

  /**
   * Handle avatar selection
   */
  const handleSelectAvatar = async (avatarId: string) => {
    setSelectedAvatar(avatarId);
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // Update via API
      const response = await fetch('/api/user/update-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorialAvatarId: avatarId }),
      });

      if (!response.ok) {
        throw new Error('Failed to update avatar');
      }

      // Update session
      await update();

      setSaveStatus('success');
      onAvatarChanged?.(avatarId);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('[AvatarSelector] Failed to save avatar:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
        <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
          Tutorial Guide
        </h3>
      </div>

      <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
        Choose your friendly guide for the tutorial experience
      </p>

      {/* Avatar Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableAvatars.map((avatar) => (
          <motion.button
            key={avatar.id}
            onClick={() => handleSelectAvatar(avatar.id)}
            disabled={isSaving}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative p-4 rounded-xl border-2 transition-all ${
              selectedAvatar === avatar.id
                ? isLight
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-blue-400 bg-blue-900/20'
                : isLight
                ? 'border-gray-200 bg-white hover:border-gray-300'
                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
            } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {/* Selected Indicator */}
            {selectedAvatar === avatar.id && (
              <div className="absolute top-2 right-2 p-1 rounded-full bg-blue-500">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}

            {/* Avatar Preview */}
            <div className="flex justify-center mb-3">
              <Image
                src={avatar.images[0]} // Show welcome pose
                alt={avatar.name}
                width={120}
                height={120}
                className="object-contain drop-shadow-lg"
              />
            </div>

            {/* Avatar Info */}
            <h4 className={`font-semibold text-center mb-1 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              {avatar.name}
            </h4>
            <p className={`text-xs text-center ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              {avatar.description}
            </p>

            {/* Personality Badge */}
            <div className="mt-2 flex justify-center">
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  isLight
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {avatar.personalityTone}
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Save Status */}
      {saveStatus === 'success' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-sm"
        >
          ✓ Tutorial guide updated successfully!
        </motion.div>
      )}

      {saveStatus === 'error' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-sm"
        >
          ✗ Failed to update tutorial guide. Please try again.
        </motion.div>
      )}
    </div>
  );
}
