// src/components/ui/skeleton.tsx
// Polished skeleton loaders with theme support

'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/app/contexts/ThemeContext';
import { getSkeletonStyles, getGlassCardStyles, spacing } from '@/lib/ui/theme-styles';

interface SkeletonProps {
  className?: string;
  animated?: boolean;
}

export function Skeleton({ className = '', animated = true }: SkeletonProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const skeletonStyles = getSkeletonStyles(isLight);

  const Component = animated ? motion.div : 'div';
  const animationProps = animated
    ? {
        animate: {
          opacity: [0.5, 1, 0.5],
        },
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      }
    : {};

  return <Component className={`${skeletonStyles} rounded ${className}`} {...animationProps} />;
}

export function SkeletonCard() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const cardStyles = getGlassCardStyles(isLight);

  return (
    <div className={`${cardStyles} rounded-xl ${spacing.card}`}>
      <Skeleton className="h-6 w-3/4 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-2" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  );
}

export function SkeletonChart() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const cardStyles = getGlassCardStyles(isLight);

  return (
    <div className={`${cardStyles} rounded-xl ${spacing.card}`}>
      <Skeleton className="h-6 w-1/3 mb-6" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function SkeletonListingCard() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const cardStyles = getGlassCardStyles(isLight);

  return (
    <div className={`${cardStyles} rounded-xl overflow-hidden`}>
      <Skeleton className="h-48 w-full" />
      <div className="p-4">
        <Skeleton className="h-6 w-1/2 mb-3" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonCMASummary() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const cardStyles = getGlassCardStyles(isLight);

  return (
    <div className={`${cardStyles} rounded-xl ${spacing.card}`}>
      <Skeleton className="h-8 w-1/2 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export function SkeletonTable() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const cardStyles = getGlassCardStyles(isLight);

  return (
    <div className={`${cardStyles} rounded-xl ${spacing.card}`}>
      <Skeleton className="h-6 w-1/4 mb-4" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
