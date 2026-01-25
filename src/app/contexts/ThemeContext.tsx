"use client";

/**
 * ThemeContext - Theme Management System
 *
 * This context manages the application's theme state, providing both light gradient
 * and dark (blackspace) theme options. Themes are persisted via cookies (for SSR)
 * and localStorage (for backup/backwards compatibility).
 *
 * CRITICAL: BACKGROUND & PADDING BEHAVIOR
 * ========================================
 *
 * Per MDN CSS Box Model: "Background colors extend through the padding area."
 *
 * This means that when a container has padding AND a background (like our gradient),
 * the background will be VISIBLE in the padded area, creating unwanted "white space"
 * or gradient bleed on the sides of the page.
 *
 * ⚠️ DO NOT apply padding to containers that sit directly against the body gradient!
 *
 * CORRECT PATTERN - Parent Wrapper with Padding:
 * ```tsx
 * // Main container - NO PADDING
 * <div className="max-w-7xl mx-auto w-full h-full flex flex-col overflow-x-hidden pt-16 md:pt-0">
 *
 *   // Individual sections - WRAP with padding parent
 *   <div className="px-4 sm:px-6 lg:px-8">
 *     <YourComponent />
 *   </div>
 * </div>
 * ```
 *
 * INCORRECT PATTERN - Padding on Main Container:
 * ```tsx
 * // ❌ WRONG - Gradient will show through padding
 * <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 *   <YourComponent />
 * </div>
 * ```
 *
 * WHY THIS MATTERS:
 * - Body has gradient background (globals.css lines 124-135)
 * - Padding creates space between content and container edge
 * - Background fills that padding space, showing the gradient
 * - Result: Visible "white space" that looks like a layout bug
 *
 * SOLUTION:
 * 1. Remove padding from main containers that touch the body gradient
 * 2. Wrap individual sections (header, toolbar, content) in parent divs
 * 3. Apply padding to those parent wrappers: `px-4 sm:px-6 lg:px-8`
 * 4. This keeps content properly spaced WITHOUT exposing the background
 *
 * REFERENCE IMPLEMENTATION:
 * - See: src/app/agent/contacts/page.tsx (lines 19-87)
 * - See: src/app/components/crm/ContactsTab.tsx (lines 244-306)
 *
 * AFFECTED PAGES:
 * Any page that uses the gradient background and has full-width content containers.
 *
 * Last Updated: 2026-01-23
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { themes, getThemeClasses, type Theme, type ThemeName } from "@/app/themes/themes";

// Re-export types for convenience
export type { Theme, ThemeName };

interface ThemeContextType {
  currentTheme: ThemeName;
  theme: Theme;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Cookie name for theme persistence
const THEME_COOKIE_NAME = 'site-theme';

// Helper to set a cookie
function setThemeCookie(theme: ThemeName) {
  // Set cookie with 1 year expiry, accessible across the site
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

// Helper to get theme from cookie (client-side)
function getThemeFromCookie(): ThemeName | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${THEME_COOKIE_NAME}=([^;]+)`));
  const theme = match ? match[2] as ThemeName : null;
  return theme && themes[theme] ? theme : null;
}

// Helper function to get initial theme - checks cookie first, then localStorage
function getInitialTheme(): ThemeName {
  if (typeof window === 'undefined') return 'lightgradient';

  try {
    // First check cookie (server can read this)
    const cookieTheme = getThemeFromCookie();
    if (cookieTheme) return cookieTheme;

    // Fallback to localStorage for backwards compatibility
    const savedTheme = localStorage.getItem("site-theme") as ThemeName | null;
    if (savedTheme && themes[savedTheme]) {
      // Migrate to cookie
      setThemeCookie(savedTheme);
      return savedTheme;
    }
  } catch (error) {
    console.error('Error reading theme:', error);
  }

  return 'lightgradient';
}

// Get initial theme from DOM (set by server/middleware)
function getServerRenderedTheme(): ThemeName | null {
  if (typeof document === 'undefined') return null;

  const html = document.documentElement;
  if (html.classList.contains('theme-blackspace')) return 'blackspace';
  if (html.classList.contains('theme-lightgradient')) return 'lightgradient';
  return null;
}

// ===================================
// THEME TRANSITION ANIMATIONS
// Two-Act System: Exit → Refresh → Enter
// ===================================

const ANIMATION_PAIRS = {
  'french-doors': { exit: 'doors-close', enter: 'doors-open', duration: 500 },
  'garage': { exit: 'garage-down', enter: 'garage-up', duration: 450 },
  'sliding-door': { exit: 'slide-close', enter: 'slide-open', duration: 450 },
  'shutters': { exit: 'shutters-close', enter: 'shutters-open', duration: 500 },
  'curtains': { exit: 'curtains-close', enter: 'curtains-open', duration: 550 }
} as const;

type AnimationPairKey = keyof typeof ANIMATION_PAIRS;

/**
 * Select a random animation, avoiding repeats
 */
function selectRandomAnimation(): AnimationPairKey {
  const keys = Object.keys(ANIMATION_PAIRS) as AnimationPairKey[];
  const lastAnimation = localStorage.getItem('last-theme-animation') as AnimationPairKey | null;

  // Filter out the last animation to avoid repeats
  const availableKeys = lastAnimation
    ? keys.filter(k => k !== lastAnimation)
    : keys;

  const selectedKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];

  // Save for next time
  localStorage.setItem('last-theme-animation', selectedKey);

  return selectedKey;
}

/**
 * Get theme color for overlay
 */
function getThemeColor(theme: ThemeName): string {
  return theme === 'blackspace' ? '#000000' : '#4f46e5';
}

/**
 * Listing data interface
 */
interface FeaturedListing {
  photoUrl: string;
  address: string;
  city: string;
  price: number;
  beds: number;
  baths: number;
  sqft?: number;
}

/**
 * Featured Obsidian Group listings (fetched from API)
 */
let FEATURED_LISTINGS: FeaturedListing[] = [];

/**
 * Fetch Obsidian Group featured listings
 */
async function fetchFeaturedListings(): Promise<void> {
  try {
    const response = await fetch('/api/listings/featured');
    if (!response.ok) {
      console.warn('[ThemeContext] Failed to fetch featured listings:', response.status);
      return;
    }

    const data = await response.json();
    if (data.success && data.listings && data.listings.length > 0) {
      // Store full listing objects
      FEATURED_LISTINGS = data.listings.filter((listing: any) => listing.photoUrl);
      console.log(`[ThemeContext] Loaded ${FEATURED_LISTINGS.length} Obsidian Group featured listings`);
    } else {
      console.warn('[ThemeContext] No featured listings returned from API');
    }
  } catch (error) {
    console.error('[ThemeContext] Error fetching featured listings:', error);
  }
}

/**
 * Get random Obsidian Group listing
 * Returns null if no listings available
 */
function getRandomListing(): FeaturedListing | null {
  if (FEATURED_LISTINGS.length === 0) return null;
  return FEATURED_LISTINGS[Math.floor(Math.random() * FEATURED_LISTINGS.length)];
}

/**
 * Get eXp logo path (always white)
 */
function getExpLogo(theme: ThemeName): string {
  return '/images/brand/EXP-white-square.png';
}

/**
 * Get SVG graphic for animation
 */
function getAnimationSVG(animationKey: AnimationPairKey, phase: 'exit' | 'enter'): string {
  const svgs = {
    'key-turn': `
      <svg viewBox="0 0 100 100" style="width: 200px; height: 200px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        <g id="key" style="transform-origin: 50% 50%;">
          <!-- Key head (circular) -->
          <circle cx="30" cy="50" r="15" fill="none" stroke="white" stroke-width="3" opacity="0.9"/>
          <circle cx="30" cy="50" r="8" fill="none" stroke="white" stroke-width="2" opacity="0.7"/>
          <!-- Key shaft -->
          <rect x="42" y="47" width="40" height="6" rx="2" fill="white" opacity="0.9"/>
          <!-- Key teeth -->
          <rect x="70" y="42" width="4" height="11" fill="white" opacity="0.9"/>
          <rect x="76" y="45" width="4" height="8" fill="white" opacity="0.9"/>
          <rect x="82" y="42" width="4" height="11" fill="white" opacity="0.9"/>
        </g>
      </svg>
    `,
    'french-doors': `
      <svg viewBox="0 0 100 100" style="width: 60%; height: 80%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        <!-- Left door -->
        <rect x="10" y="15" width="35" height="70" rx="2" fill="none" stroke="white" stroke-width="2" opacity="0.8"/>
        <rect x="15" y="20" width="25" height="25" fill="none" stroke="white" stroke-width="1.5" opacity="0.6"/>
        <rect x="15" y="50" width="25" height="25" fill="none" stroke="white" stroke-width="1.5" opacity="0.6"/>
        <circle cx="38" cy="52" r="2" fill="white" opacity="0.9"/>

        <!-- Right door -->
        <rect x="55" y="15" width="35" height="70" rx="2" fill="none" stroke="white" stroke-width="2" opacity="0.8"/>
        <rect x="60" y="20" width="25" height="25" fill="none" stroke="white" stroke-width="1.5" opacity="0.6"/>
        <rect x="60" y="50" width="25" height="25" fill="none" stroke="white" stroke-width="1.5" opacity="0.6"/>
        <circle cx="62" cy="52" r="2" fill="white" opacity="0.9"/>
      </svg>
    `,
    'blinds': `
      <svg viewBox="0 0 100 100" style="width: 70%; height: 70%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        ${Array.from({ length: 12 }, (_, i) => `
          <rect x="15" y="${15 + i * 6}" width="70" height="4" rx="1" fill="white" opacity="${0.7 - i * 0.02}"/>
        `).join('')}
      </svg>
    `,
    'garage': `
      <svg viewBox="0 0 100 100" style="width: 60%; height: 70%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        <!-- Garage door sections -->
        ${Array.from({ length: 6 }, (_, i) => `
          <rect x="20" y="${20 + i * 11}" width="60" height="9" rx="1" fill="none" stroke="white" stroke-width="2" opacity="0.8"/>
          <line x1="25" y1="${24 + i * 11}" x2="75" y2="${24 + i * 11}" stroke="white" stroke-width="0.5" opacity="0.5"/>
        `).join('')}
        <!-- Handle -->
        <rect x="48" y="62" width="4" height="8" rx="1" fill="white" opacity="0.9"/>
      </svg>
    `,
    'sliding-door': `
      <svg viewBox="0 0 100 100" style="width: 65%; height: 80%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        <!-- Door panel -->
        <rect x="30" y="15" width="40" height="70" rx="2" fill="none" stroke="white" stroke-width="2.5" opacity="0.85"/>
        <rect x="35" y="20" width="30" height="60" fill="none" stroke="white" stroke-width="1.5" opacity="0.6"/>
        <!-- Vertical divider -->
        <line x1="50" y1="20" x2="50" y2="80" stroke="white" stroke-width="1.5" opacity="0.6"/>
        <!-- Handle -->
        <rect x="60" y="48" width="6" height="4" rx="2" fill="white" opacity="0.9"/>
      </svg>
    `,
    'property-card': `
      <svg viewBox="0 0 100 100" style="width: 300px; height: 200px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        <!-- Card outline -->
        <rect x="10" y="25" width="80" height="50" rx="4" fill="none" stroke="white" stroke-width="2" opacity="0.9"/>
        <!-- House icon -->
        <path d="M 35 45 L 50 35 L 65 45 L 65 60 L 35 60 Z" fill="none" stroke="white" stroke-width="2" opacity="0.8"/>
        <rect x="45" y="50" width="10" height="10" fill="white" opacity="0.7"/>
        <path d="M 32 45 L 50 32 L 68 45" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
      </svg>
    `,
    'shutters': `
      <svg viewBox="0 0 100 100" style="width: 60%; height: 75%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        <!-- Left shutter -->
        <rect x="15" y="20" width="28" height="60" rx="2" fill="none" stroke="white" stroke-width="2" opacity="0.8"/>
        ${Array.from({ length: 8 }, (_, i) => `
          <line x1="18" y1="${25 + i * 7}" x2="40" y2="${25 + i * 7}" stroke="white" stroke-width="1.5" opacity="0.6"/>
        `).join('')}

        <!-- Right shutter -->
        <rect x="57" y="20" width="28" height="60" rx="2" fill="none" stroke="white" stroke-width="2" opacity="0.8"/>
        ${Array.from({ length: 8 }, (_, i) => `
          <line x1="60" y1="${25 + i * 7}" x2="82" y2="${25 + i * 7}" stroke="white" stroke-width="1.5" opacity="0.6"/>
        `).join('')}
      </svg>
    `,
    'curtains': `
      <svg viewBox="0 0 100 100" style="width: 70%; height: 85%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        <!-- Curtain rod -->
        <line x1="10" y1="12" x2="90" y2="12" stroke="white" stroke-width="2" opacity="0.9"/>
        <circle cx="10" cy="12" r="3" fill="white" opacity="0.9"/>
        <circle cx="90" cy="12" r="3" fill="white" opacity="0.9"/>

        <!-- Left curtain -->
        <path d="M 15 15 Q 18 50, 15 85 L 40 85 Q 38 50, 40 15 Z" fill="none" stroke="white" stroke-width="2" opacity="0.7"/>
        <path d="M 20 15 Q 22 50, 20 85" stroke="white" stroke-width="1" opacity="0.5"/>
        <path d="M 30 15 Q 32 50, 30 85" stroke="white" stroke-width="1" opacity="0.5"/>

        <!-- Right curtain -->
        <path d="M 60 15 Q 62 50, 60 85 L 85 85 Q 82 50, 85 15 Z" fill="none" stroke="white" stroke-width="2" opacity="0.7"/>
        <path d="M 65 15 Q 67 50, 65 85" stroke="white" stroke-width="1" opacity="0.5"/>
        <path d="M 75 15 Q 77 50, 75 85" stroke="white" stroke-width="1" opacity="0.5"/>
      </svg>
    `,
  };

  return svgs[animationKey] || '';
}

/**
 * Play EXIT animation (closing the old theme)
 * Sequence: Animation IN → Hold → Cross-dissolve to solid color → Stay for refresh
 */
function playExitAnimation(
  animationKey: AnimationPairKey,
  targetTheme: ThemeName
): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'theme-transition-overlay';

    // Solid color will be the underlay (revealed when content fades)
    const solidColor = targetTheme === 'blackspace' ? '#000000' : '#ffffff';
    overlay.style.cssText = `
      background-color: ${solidColor};
    `;

    overlay.setAttribute('data-animation', animationKey);
    overlay.setAttribute('data-phase', 'exit');

    const { exit, duration } = ANIMATION_PAIRS[animationKey];

    // Add eXp logo + listing details
    const currentTheme = document.documentElement.classList.contains('theme-blackspace') ? 'blackspace' : 'lightgradient';
    const logoPath = getExpLogo(currentTheme);

    // Get random Obsidian Group listing
    const listing = getRandomListing();

    // If no listings available, skip the animation overlay
    if (!listing) {
      console.warn('[ThemeTransition] No featured listings available, skipping animation');
      resolve();
      return;
    }

    // Content container with listing photo background (will fade to reveal solid color)
    const contentHTML = `
      <div id="exit-content" style="
        position: absolute;
        inset: 0;
        background-image: url('${listing.photoUrl}');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
      ">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10; text-align: center; width: 90%; max-width: 600px;">
          <img
            src="${logoPath}"
            alt="eXp Realty"
            style="width: 300px; height: auto; display: block; margin: 0 auto; filter: drop-shadow(0 10px 30px rgba(0,0,0,0.5));"
          />
          <div style="
            margin-top: 30px;
            font-size: 28px;
            font-weight: 700;
            color: white;
            text-shadow: 0 4px 20px rgba(0,0,0,0.8), 0 2px 10px rgba(0,0,0,0.6);
            letter-spacing: 1px;
            opacity: 0;
            animation: fadeInText 0.5s ease-out ${duration}ms forwards;
          ">
            Featured Team Property
          </div>
          <div style="
            margin-top: 20px;
            padding: 20px;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            opacity: 0;
            animation: fadeInText 0.5s ease-out ${duration + 200}ms forwards;
          ">
            <div style="
              font-size: 22px;
              font-weight: 600;
              color: white;
              margin-bottom: 12px;
              text-shadow: 0 2px 10px rgba(0,0,0,0.5);
            ">
              ${listing.address}
            </div>
            <div style="
              font-size: 18px;
              color: #e0e0e0;
              margin-bottom: 8px;
            ">
              ${listing.city}
            </div>
            <div style="
              display: flex;
              justify-content: center;
              gap: 30px;
              margin-top: 16px;
              flex-wrap: wrap;
            ">
              <div style="
                font-size: 32px;
                font-weight: 700;
                color: #4ade80;
                text-shadow: 0 2px 10px rgba(74, 222, 128, 0.5);
              ">
                $${listing.price.toLocaleString()}
              </div>
              <div style="
                font-size: 20px;
                color: white;
                display: flex;
                gap: 20px;
                align-items: center;
              ">
                <span style="font-weight: 600;">${listing.beds} BD</span>
                <span style="opacity: 0.5;">|</span>
                <span style="font-weight: 600;">${listing.baths} BA</span>
                ${listing.sqft ? `<span style="opacity: 0.5;">|</span><span style="font-weight: 600;">${listing.sqft.toLocaleString()} SF</span>` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>
        @keyframes fadeInText {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
    `;
    overlay.innerHTML = contentHTML;

    document.body.appendChild(overlay);

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      overlay.classList.add(exit);
      console.log(`[ThemeTransition] 🚪 EXIT: ${animationKey} (${duration}ms) → hold (2s) → cross-dissolve (600ms)`);
    });

    // Timeline:
    // 1. Animation IN - duration ms
    // 2. Hold with listing photo - 2000ms
    // 3. Cross-dissolve to solid color - 600ms
    // 4. Hold on solid color - 300ms (stability buffer)
    // 5. Refresh triggers (stays on solid color)

    const holdDuration = 2000;
    const crossDissolveDuration = 600;
    const solidColorBuffer = 300; // Hold on solid color before refresh

    // After animation + hold, start cross-dissolve to solid color
    setTimeout(() => {
      const contentDiv = overlay.querySelector('#exit-content') as HTMLElement;
      if (contentDiv) {
        contentDiv.classList.add('cross-dissolve-to-color');
        console.log(`[ThemeTransition] Cross-dissolving to ${solidColor}...`);
      }
    }, duration + holdDuration);

    // Resolve AFTER cross-dissolve completes AND solid color is stable
    const totalDuration = duration + holdDuration + crossDissolveDuration + solidColorBuffer;
    setTimeout(() => {
      console.log(`[ThemeTransition] EXIT complete - solid color stable, ready for refresh`);
      resolve();
      // Overlay is NOT removed - stays visible during refresh
      // The ENTER animation will remove it
    }, totalDuration);
  });
}

/**
 * Play ENTER animation (opening the new theme)
 * Sequence: Remove instant overlay → Replace with listing photo overlay → Cross-dissolve in → Hold → Animation OUT
 */
function playEnterAnimation(
  animationKey: AnimationPairKey,
  backgroundColor: string
): Promise<void> {
  return new Promise((resolve) => {
    // CRITICAL: Remove the instant solid color overlay created by blocking script
    const instantOverlay = document.getElementById('instant-transition-overlay');
    if (instantOverlay) {
      console.log(`[ThemeTransition] Removing instant solid color overlay`);
      instantOverlay.remove();
    }

    // Also remove any other existing overlays
    const existingOverlays = document.querySelectorAll('.theme-transition-overlay');
    existingOverlays.forEach(old => {
      if (old.id !== 'instant-transition-overlay') {
        console.log(`[ThemeTransition] Removing old overlay`);
        old.remove();
      }
    });

    const overlay = document.createElement('div');
    overlay.className = 'theme-transition-overlay';

    // Get current theme (NEW theme after refresh)
    const currentTheme = document.documentElement.classList.contains('theme-blackspace') ? 'blackspace' : 'lightgradient';
    const solidColor = currentTheme === 'blackspace' ? '#000000' : '#ffffff';

    // Solid color as underlay (will be covered when content fades in)
    overlay.style.cssText = `
      background-color: ${solidColor};
    `;

    overlay.setAttribute('data-animation', animationKey);
    overlay.setAttribute('data-phase', 'enter');

    const { enter, duration } = ANIMATION_PAIRS[animationKey];

    // Logo matches NEW theme
    const logoPath = getExpLogo(currentTheme);

    // Get random Obsidian Group listing
    const listing = getRandomListing();

    // If no listings available, skip the animation
    if (!listing) {
      console.warn('[ThemeTransition] No featured listings available for ENTER, skipping animation');
      resolve();
      return;
    }

    // Content container with listing photo (starts hidden, will fade in from solid color)
    const contentHTML = `
      <div id="enter-content" style="
        position: absolute;
        inset: 0;
        background-image: url('${listing.photoUrl}');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        opacity: 0;
      ">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10; text-align: center; width: 90%; max-width: 600px;">
          <img
            src="${logoPath}"
            alt="eXp Realty"
            style="width: 300px; height: auto; display: block; margin: 0 auto; filter: drop-shadow(0 10px 30px rgba(0,0,0,0.5));"
          />
          <div id="enter-text" style="
            margin-top: 30px;
            font-size: 28px;
            font-weight: 700;
            color: white;
            text-shadow: 0 4px 20px rgba(0,0,0,0.8), 0 2px 10px rgba(0,0,0,0.6);
            letter-spacing: 1px;
            opacity: 0;
          ">
            Featured Team Property
          </div>
          <div id="enter-details" style="
            margin-top: 20px;
            padding: 20px;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            opacity: 0;
          ">
            <div style="
              font-size: 22px;
              font-weight: 600;
              color: white;
              margin-bottom: 12px;
              text-shadow: 0 2px 10px rgba(0,0,0,0.5);
            ">
              ${listing.address}
            </div>
            <div style="
              font-size: 18px;
              color: #e0e0e0;
              margin-bottom: 8px;
            ">
              ${listing.city}
            </div>
            <div style="
              display: flex;
              justify-content: center;
              gap: 30px;
              margin-top: 16px;
              flex-wrap: wrap;
            ">
              <div style="
                font-size: 32px;
                font-weight: 700;
                color: #4ade80;
                text-shadow: 0 2px 10px rgba(74, 222, 128, 0.5);
              ">
                $${listing.price.toLocaleString()}
              </div>
              <div style="
                font-size: 20px;
                color: white;
                display: flex;
                gap: 20px;
                align-items: center;
              ">
                <span style="font-weight: 600;">${listing.beds} BD</span>
                <span style="opacity: 0.5;">|</span>
                <span style="font-weight: 600;">${listing.baths} BA</span>
                ${listing.sqft ? `<span style="opacity: 0.5;">|</span><span style="font-weight: 600;">${listing.sqft.toLocaleString()} SF</span>` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>
        @keyframes fadeInText {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
    `;
    overlay.innerHTML = contentHTML;

    document.body.appendChild(overlay);

    // Timeline:
    // 1. Cross-dissolve from solid color to listing photo - 600ms
    // 2. Hold with listing photo - 2000ms
    // 3. Animation OUT - duration ms
    // 4. Fade out and remove

    const crossDissolveDuration = 600;
    const holdDuration = 2000;

    // Start cross-dissolve immediately
    requestAnimationFrame(() => {
      const contentDiv = overlay.querySelector('#enter-content') as HTMLElement;
      if (contentDiv) {
        console.log(`[ThemeTransition] 🔓 ENTER: Cross-dissolving from ${solidColor} (600ms) → hold (2s) → ${animationKey} (${duration}ms)`);
        // Fade in the listing photo content
        contentDiv.style.transition = 'opacity 600ms ease-in-out';
        contentDiv.style.opacity = '1';
      }
    });

    // After cross-dissolve, fade in text and details
    setTimeout(() => {
      const textDiv = overlay.querySelector('#enter-text') as HTMLElement;
      if (textDiv) {
        textDiv.style.animation = 'fadeInText 0.5s ease-out forwards';
      }

      const detailsDiv = overlay.querySelector('#enter-details') as HTMLElement;
      if (detailsDiv) {
        detailsDiv.style.animation = 'fadeInText 0.5s ease-out 0.2s forwards';
      }
    }, crossDissolveDuration);

    // After cross-dissolve + hold, play animation OUT
    setTimeout(() => {
      overlay.classList.add(enter);
      console.log(`[ThemeTransition] Playing ${animationKey} animation OUT`);
    }, crossDissolveDuration + holdDuration);

    // Remove overlay after complete sequence
    const totalDuration = crossDissolveDuration + holdDuration + duration;
    setTimeout(() => {
      overlay.remove();
      resolve();
    }, totalDuration);
  });
}

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeName;
}

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  // Initialize with the server-provided theme to prevent hydration mismatch
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(initialTheme || 'lightgradient');
  const [mounted, setMounted] = useState(false);

  // After mount, sync with cookie/localStorage if needed (handles edge cases like stale props)
  useEffect(() => {
    setMounted(true);
    const storedTheme = getInitialTheme();
    // Only update if stored theme differs (e.g., user changed theme in another tab)
    if (storedTheme !== currentTheme) {
      setCurrentTheme(storedTheme);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch Obsidian Group featured listings on mount
  useEffect(() => {
    fetchFeaturedListings();
  }, []);

  // Apply theme to document and persist
  useEffect(() => {
    if (!mounted) return;

    const theme = themes[currentTheme];
    const root = document.documentElement;
    const isLight = currentTheme === 'lightgradient';

    console.log('[ThemeContext] Applying theme:', currentTheme, '| isLight:', isLight);

    // Apply CSS variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Update theme classes on both html and body
    [document.documentElement, document.body].forEach(el => {
      el.className = el.className
        .split(" ")
        .filter((c) => !c.startsWith("theme-") && c !== "dark")
        .concat(`theme-${currentTheme}`)
        .concat(isLight ? [] : ["dark"]) // Add 'dark' class for Tailwind dark mode
        .join(" ");
    });

    // Detect if running as PWA (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');

    console.log('[ThemeContext] Mode:', isStandalone ? 'PWA (standalone)' : 'Browser');

    // Only update meta tags in PWA mode - Safari browser ignores dynamic updates
    if (isStandalone) {
      const themeColor = isLight ? '#4f46e5' : '#000000'; // Indigo for light, black for dark
      // Light theme: 'default' (light status bar, no black overlay)
      // Dark theme: 'black' (opaque black status bar)
      const statusBarStyle = isLight ? 'default' : 'black';

      // Update theme-color meta tag (for Dynamic Island / status bar)
      // Remove and recreate to force Safari to recognize the change
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.remove();
      }
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      metaThemeColor.setAttribute('content', themeColor);
      document.head.appendChild(metaThemeColor);

      // Update iOS status bar style (PWA only)
      let metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (metaStatusBar) {
        metaStatusBar.remove();
      }
      metaStatusBar = document.createElement('meta');
      metaStatusBar.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      metaStatusBar.setAttribute('content', statusBarStyle);
      document.head.appendChild(metaStatusBar);

      console.log('[ThemeContext] 🔄 Updated PWA meta tags:', { themeColor, statusBarStyle });
    } else {
      console.log('[ThemeContext] ⏭️  Skipped meta tag updates (browser mode - requires page refresh)');
    }

    // Persist to both cookie (for SSR) and localStorage (for backup)
    setThemeCookie(currentTheme);
    localStorage.setItem("site-theme", currentTheme);
  }, [currentTheme, mounted]);

  // Play ENTER animation on mount if coming from theme toggle
  useEffect(() => {
    if (!mounted) return;

    const animationKey = sessionStorage.getItem('theme-transition-pair') as AnimationPairKey | null;
    const timestamp = sessionStorage.getItem('theme-transition-timestamp');

    if (animationKey && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);

      // Only play if refresh happened within 5 seconds (prevent stale animations)
      if (age < 5000) {
        const newColor = getThemeColor(currentTheme);

        console.log(`[ThemeTransition] 🎬 Act 2: Playing ENTER animation`);

        playEnterAnimation(animationKey, newColor).then(() => {
          // Cleanup sessionStorage after animation completes
          sessionStorage.removeItem('theme-transition-pair');
          sessionStorage.removeItem('theme-transition-timestamp');
        });
      } else {
        // Clear stale data
        console.log('[ThemeTransition] ⏰ Stale animation data cleared (>5s old)');
        sessionStorage.removeItem('theme-transition-pair');
        sessionStorage.removeItem('theme-transition-timestamp');
      }
    }
  }, [mounted, currentTheme]);

  const setTheme = (theme: ThemeName) => {
    setCurrentTheme(theme);
  };

  const toggleTheme = async () => {
    const newTheme = currentTheme === "blackspace" ? "lightgradient" : "blackspace";
    const oldColor = getThemeColor(currentTheme);

    // Detect if running as PWA (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');

    if (!isStandalone) {
      // Browser mode: Two-act animation system
      const selectedAnimation = selectRandomAnimation();

      // Save animation choice and timestamp to sessionStorage
      sessionStorage.setItem('theme-transition-pair', selectedAnimation);
      sessionStorage.setItem('theme-transition-timestamp', Date.now().toString());

      console.log(`[ThemeTransition] 🎬 Starting two-act transition: ${selectedAnimation}`);

      // Act 1: Play EXIT animation → Hold → Cross-dissolve to solid color (target theme)
      await playExitAnimation(selectedAnimation, newTheme);

      // Update cookie for server-side rendering
      setThemeCookie(newTheme);

      // Trigger page refresh (Act 2 will play on mount)
      window.location.reload();
    } else {
      // PWA mode: Instant theme change (no refresh needed)
      console.log('[ThemeTransition] ⚡ PWA mode - instant theme change');
      setCurrentTheme(newTheme);
    }
  };

  const value: ThemeContextType = {
    currentTheme,
    theme: themes[currentTheme],
    setTheme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

/**
 * Helper hook for theme-aware Tailwind classes
 * Returns pre-computed classes based on the current theme
 */
export function useThemeClasses() {
  const { currentTheme } = useTheme();
  return {
    ...getThemeClasses(currentTheme),
    currentTheme,
  };
}
