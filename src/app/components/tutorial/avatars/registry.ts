/**
 * Avatar Registry
 * Central registry of all available tutorial avatars
 */

import { AvatarConfig, AvatarRegistryEntry } from '../types';
import { toastyAvatar } from './toasty';
import { defaultAvatar } from './default';

/**
 * Global Avatar Registry
 * Maps avatar IDs to their configurations
 */
export const avatarRegistry: Record<string, AvatarRegistryEntry> = {
  toasty: {
    config: toastyAvatar,
    isAvailable: true,
    // No role required - available to all users
  },
  default: {
    config: defaultAvatar,
    isAvailable: true,
    // Fallback avatar - always available
  },
  // Future avatars can be added here:
  // luna: {
  //   config: lunaAvatar,
  //   isAvailable: true,
  //   requiredRole: 'agent',
  // },
};

/**
 * Get avatar configuration by ID
 * Falls back to default if not found or unavailable
 */
export function getAvatarConfig(
  avatarId: string | undefined,
  userRoles: string[] = []
): AvatarConfig {
  // Default to 'toasty' if no ID provided
  const requestedId = avatarId || 'toasty';

  // Look up avatar in registry
  const entry = avatarRegistry[requestedId];

  // If not found, return default
  if (!entry) {
    console.warn(`[AvatarRegistry] Avatar "${requestedId}" not found, using default`);
    return defaultAvatar;
  }

  // Check if avatar is available
  if (!entry.isAvailable) {
    console.warn(`[AvatarRegistry] Avatar "${requestedId}" is not available, using default`);
    return defaultAvatar;
  }

  // Check role requirements
  if (entry.requiredRole) {
    const hasRequiredRole =
      userRoles.includes(entry.requiredRole) ||
      userRoles.includes('admin'); // Admins can use any avatar

    if (!hasRequiredRole) {
      console.warn(
        `[AvatarRegistry] User lacks required role "${entry.requiredRole}" for avatar "${requestedId}", using default`
      );
      return defaultAvatar;
    }
  }

  // All checks passed - return requested avatar
  return entry.config;
}

/**
 * Get list of avatars available to user
 * Filters based on user roles
 */
export function getAvailableAvatars(userRoles: string[] = []): AvatarConfig[] {
  return Object.values(avatarRegistry)
    .filter((entry) => {
      // Must be available
      if (!entry.isAvailable) return false;

      // No role requirement = available to all
      if (!entry.requiredRole) return true;

      // Check if user has required role
      return userRoles.includes(entry.requiredRole) || userRoles.includes('admin');
    })
    .map((entry) => entry.config);
}

/**
 * Check if avatar is available to user
 */
export function isAvatarAvailableToUser(
  avatarId: string,
  userRoles: string[] = []
): boolean {
  const entry = avatarRegistry[avatarId];
  if (!entry || !entry.isAvailable) return false;

  if (!entry.requiredRole) return true;

  return userRoles.includes(entry.requiredRole) || userRoles.includes('admin');
}
