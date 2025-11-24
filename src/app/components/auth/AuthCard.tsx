// src/app/components/auth/AuthCard.tsx
// Reusable glassmorphism authentication card component with theme support

'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/app/contexts/ThemeContext';
import { ReactNode } from 'react';

interface AuthCardProps {
  children: ReactNode;
  /**
   * Card title (e.g., "Sign In", "Create Account")
   */
  title?: string;
  /**
   * Subtitle or description
   */
  subtitle?: string;
  /**
   * Welcome header text
   */
  welcomeText?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Maximum width (default: 480px)
   */
  maxWidth?: string;
  /**
   * Show logo above card
   */
  showLogo?: boolean;
}

/**
 * AuthCard Component
 *
 * Glassmorphism card with theme-aware styling for authentication pages.
 * Supports both lightgradient and blackspace themes with appropriate
 * blur effects, borders, and shadows.
 *
 * @example
 * ```tsx
 * <AuthCard
 *   title="Sign In"
 *   subtitle="Access your intelligent real estate command center"
 *   welcomeText="Welcome Back"
 *   showLogo
 * >
 *   <form>...</form>
 * </AuthCard>
 * ```
 */
export function AuthCard({
  children,
  title,
  subtitle,
  welcomeText = 'Your intelligent real estate command center',
  className = '',
  maxWidth = '480px',
  showLogo = true,
}: AuthCardProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  // Theme-aware styles
  const cardStyles = isLight
    ? 'bg-white/80 backdrop-blur-md border border-gray-300/50 shadow-xl'
    : 'bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/50 shadow-[0_0_30px_rgba(168,85,247,0.3)]';

  const textStyles = isLight ? 'text-gray-900' : 'text-zinc-100';
  const subtitleStyles = isLight ? 'text-gray-600' : 'text-zinc-400';
  const welcomeStyles = isLight
    ? 'text-gray-700'
    : 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`w-full ${className}`}
      style={{ maxWidth }}
    >
      {/* Logo */}
      {showLogo && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-center mb-8"
        >
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
              isLight
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg'
                : 'bg-gradient-to-br from-purple-500 to-emerald-500 shadow-[0_0_30px_rgba(168,85,247,0.5)]'
            }`}
          >
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <h2 className={`text-sm font-semibold tracking-wide uppercase ${welcomeStyles}`}>
            {welcomeText}
          </h2>
        </motion.div>
      )}

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className={`rounded-2xl p-8 ${cardStyles}`}
      >
        {/* Title Section */}
        {(title || subtitle) && (
          <div className="mb-8 text-center">
            {title && (
              <h1 className={`text-3xl font-bold mb-2 ${textStyles}`}>{title}</h1>
            )}
            {subtitle && (
              <p className={`text-sm ${subtitleStyles}`}>{subtitle}</p>
            )}
          </div>
        )}

        {/* Card Content */}
        {children}
      </motion.div>

      {/* Floating Decoration - Light Theme */}
      {isLight && (
        <>
          <motion.div
            className="absolute top-20 left-10 w-32 h-32 rounded-full bg-blue-400/20 blur-3xl pointer-events-none"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-purple-400/20 blur-3xl pointer-events-none"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          />
        </>
      )}

      {/* Floating Decoration - Dark Theme */}
      {!isLight && (
        <>
          <motion.div
            className="absolute top-20 left-10 w-32 h-32 rounded-full bg-purple-500/30 blur-3xl pointer-events-none"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-emerald-500/30 blur-3xl pointer-events-none"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          />
        </>
      )}
    </motion.div>
  );
}

/**
 * AuthCardSection Component
 * For dividing content within the AuthCard
 */
interface AuthCardSectionProps {
  children: ReactNode;
  className?: string;
  spacing?: 'sm' | 'md' | 'lg';
}

export function AuthCardSection({
  children,
  className = '',
  spacing = 'md',
}: AuthCardSectionProps) {
  const spacingClasses = {
    sm: 'mb-4',
    md: 'mb-6',
    lg: 'mb-8',
  };

  return <div className={`${spacingClasses[spacing]} ${className}`}>{children}</div>;
}

/**
 * AuthCardDivider Component
 * Horizontal divider with optional text
 */
interface AuthCardDividerProps {
  text?: string;
  className?: string;
}

export function AuthCardDivider({ text, className = '' }: AuthCardDividerProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const lineStyles = isLight ? 'bg-gray-300' : 'bg-zinc-700';
  const textStyles = isLight ? 'text-gray-500' : 'text-zinc-500';

  if (text) {
    return (
      <div className={`relative flex items-center my-6 ${className}`}>
        <div className={`flex-1 h-px ${lineStyles}`} />
        <span className={`px-4 text-sm font-medium ${textStyles}`}>{text}</span>
        <div className={`flex-1 h-px ${lineStyles}`} />
      </div>
    );
  }

  return <div className={`h-px my-6 ${lineStyles} ${className}`} />;
}

/**
 * AuthCardFooter Component
 * For links, additional actions at bottom of card
 */
interface AuthCardFooterProps {
  children: ReactNode;
  className?: string;
}

export function AuthCardFooter({ children, className = '' }: AuthCardFooterProps) {
  return (
    <div className={`mt-8 pt-6 border-t border-gray-200 dark:border-zinc-700 ${className}`}>
      {children}
    </div>
  );
}

/**
 * AuthLink Component
 * Styled link for auth pages
 */
interface AuthLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export function AuthLink({ href, children, className = '' }: AuthLinkProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const linkStyles = isLight
    ? 'text-blue-600 hover:text-blue-700'
    : 'text-purple-400 hover:text-purple-300';

  return (
    <a
      href={href}
      className={`font-semibold underline transition-colors ${linkStyles} ${className}`}
    >
      {children}
    </a>
  );
}

/**
 * AuthButton Component
 * Primary button for auth actions
 */
interface AuthButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}

export function AuthButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  variant = 'primary',
  className = '',
}: AuthButtonProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const baseStyles =
    'w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2';

  const variantStyles = {
    primary: isLight
      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed'
      : 'bg-gradient-to-r from-purple-500 to-emerald-500 hover:from-purple-600 hover:to-emerald-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_30px_rgba(168,85,247,0.7)] disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: isLight
      ? 'bg-gray-200 hover:bg-gray-300 text-gray-900 disabled:opacity-50'
      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 disabled:opacity-50',
    ghost: isLight
      ? 'bg-transparent hover:bg-gray-100 text-gray-700 disabled:opacity-50'
      : 'bg-transparent hover:bg-zinc-800 text-zinc-300 disabled:opacity-50',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {loading && (
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
