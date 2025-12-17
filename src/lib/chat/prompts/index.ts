// src/lib/chat/prompts/index.ts
// Modular prompt system - compose prompts based on context

import { buildBasePrompt } from './base';
import { buildSourcesPrompt } from './sources';
import { buildTextOnlyPrompt } from './text-only';
import { buildEnhancedSystemPrompt as buildLegacyPrompt } from '../system-prompt';

export interface PromptOptions {
  /**
   * Text-only mode for map digests
   * When true, AI provides markdown-only responses without UI components
   */
  textOnly?: boolean;

  /**
   * Custom date overrides (mainly for testing)
   */
  dates?: {
    currentDate?: string;
    currentDateTime?: string;
    sevenDaysAgo?: string;
    thirtyDaysAgo?: string;
  };
}

/**
 * Build system prompt with modular composition
 *
 * @param options - Customization options for prompt generation
 * @returns Complete system prompt string
 *
 * @example
 * // Standard full-featured prompt
 * const prompt = buildSystemPrompt();
 *
 * @example
 * // Text-only mode for map digests
 * const prompt = buildSystemPrompt({ textOnly: true });
 */
export function buildSystemPrompt(options: PromptOptions = {}): string {
  const { textOnly = false } = options;

  // Calculate dates
  const now = new Date();
  const dates = {
    currentDate: options.dates?.currentDate || now.toISOString().split('T')[0],
    currentDateTime: options.dates?.currentDateTime || now.toISOString(),
    sevenDaysAgo: options.dates?.sevenDaysAgo || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    thirtyDaysAgo: options.dates?.thirtyDaysAgo || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };

  if (textOnly) {
    // TEXT-ONLY MODE: Minimal prompt for map digests
    // Includes: base identity + text-only instructions + sources
    let prompt = buildBasePrompt(dates);
    prompt += buildTextOnlyPrompt();
    prompt += buildSourcesPrompt();

    return prompt;
  } else {
    // FULL MODE: Complete prompt with all features
    // Uses legacy monolithic prompt for now (will be modularized in phases)
    return buildLegacyPrompt();
  }
}

/**
 * Re-export individual prompt builders for direct access
 */
export { buildBasePrompt } from './base';
export { buildSourcesPrompt } from './sources';
export { buildTextOnlyPrompt } from './text-only';
