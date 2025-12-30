"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { AvatarConfig } from '../types';
import { getAvatarPosition, getAvatarSize, shouldMirrorAvatar } from '../constants/positioning';

/**
 * Avatar Mascot Component
 * Displays tutorial guide character (avatar-agnostic)
 *
 * FIXES APPLIED:
 * - Uses centralized positioning constants
 * - Stays at bottom-4 right-4 for steps 3-6 (no more jumping to middle)
 * - Avatar-agnostic design (works with any avatar config)
 */

interface AvatarMascotProps {
  /** Current tutorial step index */
  stepIndex: number;

  /** Is device mobile? */
  isMobile: boolean;

  /** Avatar configuration */
  avatar: AvatarConfig;
}

export function AvatarMascot({ stepIndex, isMobile, avatar }: AvatarMascotProps) {
  const [mounted, setMounted] = useState(false);
  const [size, setSize] = useState(280);

  // Get image for current step from avatar config
  const imageUrl = avatar.images[stepIndex] || avatar.images[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update size based on screen width and step
  useEffect(() => {
    const updateSize = () => {
      const newSize = getAvatarSize(stepIndex, window.innerWidth);
      setSize(newSize);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [stepIndex]);

  // Get position for current step
  const position = getAvatarPosition(stepIndex, isMobile);

  // Check if image should be mirrored
  const mirror = shouldMirrorAvatar(stepIndex, isMobile, avatar.mirrorOnFlip);

  if (!mounted) return null;

  const content = (
    <motion.div
      key={`avatar-step-${stepIndex}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className={`fixed ${position.classes} pointer-events-none`}
      style={{ zIndex: 999999 }} // Extremely high to appear above sidebar
    >
      <Image
        src={imageUrl}
        alt={`${avatar.name} - Tutorial guide`}
        width={size}
        height={size}
        className={`object-contain drop-shadow-2xl ${mirror ? 'scale-x-[-1]' : ''}`}
        priority
      />
    </motion.div>
  );

  return createPortal(content, document.body);
}
