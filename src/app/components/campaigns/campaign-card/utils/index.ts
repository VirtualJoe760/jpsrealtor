// utils/index.ts - Campaign Card Utility Functions

import type { Campaign, CampaignAnalytics, StatusConfigsMap } from '../types/index';
import { getStatusConfigsLight, getStatusConfigsDark, CAMPAIGN_TYPE_LABELS } from '../constants/index';

/**
 * Get status configuration based on theme
 */
export function getStatusConfigs(isLight: boolean): StatusConfigsMap {
  return isLight ? getStatusConfigsLight() : getStatusConfigsDark();
}

/**
 * Get status configuration for a specific campaign status
 */
export function getStatusConfig(status: string, isLight: boolean) {
  const configs = getStatusConfigs(isLight);
  return configs[status] || configs.draft; // Fallback to draft if status not found
}

/**
 * Get campaign type label
 */
export function getCampaignTypeLabel(type: string): string {
  return CAMPAIGN_TYPE_LABELS[type] || type;
}

/**
 * Calculate total messages sent across all strategies
 */
export function calculateTotalSent(analytics: CampaignAnalytics): number {
  return (
    (analytics.voicemailsSent || 0) +
    (analytics.emailsSent || 0) +
    (analytics.textsSent || 0)
  );
}

/**
 * Calculate engagement percentage for voicemails
 */
export function calculateVoicemailEngagement(analytics: CampaignAnalytics): number {
  if (!analytics.voicemailsSent || analytics.voicemailsSent === 0) return 0;
  return Math.round(
    ((analytics.voicemailsListened || 0) / analytics.voicemailsSent) * 100
  );
}

/**
 * Calculate engagement percentage for emails
 */
export function calculateEmailEngagement(analytics: CampaignAnalytics): number {
  if (!analytics.emailsSent || analytics.emailsSent === 0) return 0;
  return Math.round(
    ((analytics.emailsOpened || 0) / analytics.emailsSent) * 100
  );
}

/**
 * Calculate engagement percentage for texts
 */
export function calculateTextEngagement(analytics: CampaignAnalytics): number {
  if (!analytics.textsSent || analytics.textsSent === 0) return 0;
  return Math.round(
    ((analytics.textsDelivered || 0) / analytics.textsSent) * 100
  );
}

/**
 * Check if campaign has any active strategies
 */
export function hasActiveStrategies(campaign: Campaign): boolean {
  return (
    campaign.activeStrategies.voicemail ||
    campaign.activeStrategies.email ||
    campaign.activeStrategies.text
  );
}

/**
 * Count active strategies
 */
export function countActiveStrategies(campaign: Campaign): number {
  let count = 0;
  if (campaign.activeStrategies.voicemail) count++;
  if (campaign.activeStrategies.email) count++;
  if (campaign.activeStrategies.text) count++;
  return count;
}

/**
 * Format date string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return formatDate(dateString);
}

/**
 * Calculate conversion rate
 */
export function calculateConversionRate(campaign: Campaign): number {
  const totalSent = calculateTotalSent(campaign.analytics);
  if (totalSent === 0) return 0;
  return Math.round((campaign.analytics.conversions / totalSent) * 100);
}

/**
 * Calculate response rate
 */
export function calculateResponseRate(campaign: Campaign): number {
  const totalSent = calculateTotalSent(campaign.analytics);
  if (totalSent === 0) return 0;
  return Math.round((campaign.analytics.responses / totalSent) * 100);
}

/**
 * Get campaign status color classes for borders and shadows
 */
export function getStatusBorderClasses(status: string, isLight: boolean, isSelected: boolean): string {
  if (isSelected) {
    return isLight
      ? 'border-blue-500 shadow-lg shadow-blue-500/20'
      : 'border-emerald-500 shadow-lg shadow-emerald-500/20';
  }
  return isLight
    ? 'hover:border-blue-300'
    : 'hover:border-emerald-700';
}
