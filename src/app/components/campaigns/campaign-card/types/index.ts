// types/index.ts - Campaign Card Type Definitions

/**
 * Campaign Status Enum
 */
export enum CampaignStatus {
  DRAFT = 'draft',
  GENERATING_SCRIPTS = 'generating_scripts',
  GENERATING_AUDIO = 'generating_audio',
  REVIEW = 'review',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

/**
 * Campaign Type Enum
 */
export enum CampaignType {
  SPHERE_OF_INFLUENCE = 'sphere_of_influence',
  PAST_CLIENTS = 'past_clients',
  NEIGHBORHOOD_EXPIREDS = 'neighborhood_expireds',
  HIGH_EQUITY = 'high_equity',
  CUSTOM = 'custom',
}

/**
 * View Mode Enum
 */
export enum ViewMode {
  GRID = 'grid',
  LIST = 'list',
}

/**
 * Active Strategies
 */
export interface ActiveStrategies {
  voicemail: boolean;
  email: boolean;
  text: boolean;
}

/**
 * Campaign Analytics
 */
export interface CampaignAnalytics {
  voicemailsSent?: number;
  voicemailsListened?: number;
  emailsSent?: number;
  emailsOpened?: number;
  textsSent?: number;
  textsDelivered?: number;
  responses: number;
  conversions: number;
}

/**
 * Campaign Interface
 */
export interface Campaign {
  id: string;
  name: string;
  type: string;
  neighborhood?: string;
  status: CampaignStatus | string; // Allow both enum and string for backward compatibility
  totalContacts: number;
  activeStrategies: ActiveStrategies;
  analytics: CampaignAnalytics;
  createdAt: string;
  lastActivity: string;
}

/**
 * Campaign Card Props
 */
export interface CampaignCardProps {
  campaign: Campaign;
  viewMode: ViewMode | 'grid' | 'list'; // Allow both enum and string
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDelete: () => void;
}

/**
 * Status Configuration
 */
export interface StatusConfig {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Status Configs Map
 */
export type StatusConfigsMap = Record<string, StatusConfig>;
