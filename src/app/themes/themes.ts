/**
 * Centralized Theme Configuration
 *
 * Add new themes here to make them available across the entire application.
 * Each theme must follow the Theme interface structure.
 */

export type ThemeName = "blackspace" | "lightgradient";

export interface Theme {
  name: ThemeName;
  displayName: string;
  colors: {
    // Background layers
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;

    // Spatial/gradient backgrounds
    spatialGradient: string;
    gridOverlay: string;
    gradientOverlay: string;

    // Surface colors (cards, panels)
    surfaceGlass: string;
    surfaceCard: string;
    surfaceBorder: string;

    // Text colors
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textMuted: string;

    // Accent colors (keep consistent for brand)
    accentPrimary: string;
    accentSecondary: string;
    accentSuccess: string;
    accentWarning: string;
    accentError: string;

    // Interactive states
    hoverBg: string;
    activeBg: string;

    // Shadows
    shadowSm: string;
    shadowMd: string;
    shadowLg: string;
  };
}

/**
 * Theme Definitions
 *
 * To add a new theme:
 * 1. Add the theme name to the ThemeName type above
 * 2. Create a new theme object following the Theme interface
 * 3. Add it to the themes object below
 * 4. Optionally update SpaticalBackground.tsx to add custom background rendering
 */
export const themes: Record<ThemeName, Theme> = {
  blackspace: {
    name: "blackspace",
    displayName: "Black Space",
    colors: {
      // Backgrounds - Deep space black
      bgPrimary: "#000000",
      bgSecondary: "#0a0a0a",
      bgTertiary: "#1a1a1a",

      // Spatial backgrounds - Stars and nebula
      spatialGradient: "radial-gradient(ellipse at top, rgba(59, 130, 246, 0.15), rgba(0, 0, 0, 1) 50%)",
      gridOverlay: "url('/grid.svg')",
      gradientOverlay: "linear-gradient(to top, #000000, transparent, transparent)",

      // Surfaces - Dark glass morphism
      surfaceGlass: "rgba(17, 24, 39, 0.5)",
      surfaceCard: "rgba(31, 41, 55, 0.5)",
      surfaceBorder: "rgba(75, 85, 99, 0.3)",

      // Text - High contrast white
      textPrimary: "#ffffff",
      textSecondary: "#e5e7eb",
      textTertiary: "#d1d5db",
      textMuted: "#9ca3af",

      // Accents - Vibrant colors
      accentPrimary: "#3b82f6", // blue
      accentSecondary: "#10b981", // emerald
      accentSuccess: "#22c55e",
      accentWarning: "#f59e0b",
      accentError: "#ef4444",

      // Interactive - Subtle highlights
      hoverBg: "rgba(55, 65, 81, 0.5)",
      activeBg: "rgba(75, 85, 99, 0.5)",

      // Shadows - Deep and dramatic
      shadowSm: "0 1px 2px 0 rgba(0, 0, 0, 0.5)",
      shadowMd: "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
      shadowLg: "0 10px 15px -3px rgba(0, 0, 0, 0.7)",
    },
  },

  lightgradient: {
    name: "lightgradient",
    displayName: "Light Gradient",
    colors: {
      // Backgrounds - Clean white with opacity for gradient visibility
      bgPrimary: "rgba(255, 255, 255, 0.95)",
      bgSecondary: "rgba(255, 255, 255, 0.85)",
      bgTertiary: "rgba(255, 255, 255, 0.75)",

      // Spatial backgrounds - Soft blue/purple gradients
      spatialGradient: "radial-gradient(ellipse at top, rgba(59, 130, 246, 0.1), rgba(255, 255, 255, 1) 50%)",
      gridOverlay: "url('/grid-light.svg')",
      gradientOverlay: "linear-gradient(to top, rgba(255, 255, 255, 0.9), transparent, transparent)",

      // Surfaces - More opaque for better contrast
      surfaceGlass: "rgba(255, 255, 255, 0.95)",
      surfaceCard: "rgba(255, 255, 255, 0.9)",
      surfaceBorder: "rgba(100, 116, 139, 0.3)",

      // Text - Higher contrast
      textPrimary: "#0f172a",
      textSecondary: "#1e293b",
      textTertiary: "#334155",
      textMuted: "#475569",

      // Accents - Same vibrant colors (brand consistency)
      accentPrimary: "#3b82f6", // blue
      accentSecondary: "#10b981", // emerald
      accentSuccess: "#22c55e",
      accentWarning: "#f59e0b",
      accentError: "#ef4444",

      // Interactive - Soft highlights
      hoverBg: "rgba(243, 244, 246, 0.8)",
      activeBg: "rgba(229, 231, 235, 0.8)",

      // Shadows - Soft and subtle
      shadowSm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      shadowMd: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      shadowLg: "0 10px 15px -3px rgba(0, 0, 0, 0.15)",
    },
  },
};

/**
 * Get all available theme names
 */
export function getAvailableThemes(): ThemeName[] {
  return Object.keys(themes) as ThemeName[];
}

/**
 * Get a specific theme by name
 */
export function getTheme(name: ThemeName): Theme {
  return themes[name];
}

/**
 * Helper function to generate theme-aware Tailwind classes
 */
export function getThemeClasses(themeName: ThemeName) {
  const isLight = themeName === "lightgradient";

  return {
    // Backgrounds
    bgPrimary: isLight ? "bg-white/95" : "bg-black",
    bgSecondary: isLight ? "bg-white/85" : "bg-gray-950",
    bgTertiary: isLight ? "bg-white/75" : "bg-gray-900",

    // Text colors
    textPrimary: isLight ? "text-slate-900" : "text-white",
    textSecondary: isLight ? "text-slate-800" : "text-gray-300",
    textTertiary: isLight ? "text-slate-700" : "text-gray-400",
    textMuted: isLight ? "text-slate-600" : "text-gray-500",

    // Cards and surfaces
    cardBg: isLight
      ? "bg-white/95"
      : "bg-gray-900/50",
    cardBorder: isLight ? "border-slate-300" : "border-gray-800",
    cardHover: isLight
      ? "hover:bg-white hover:border-slate-400"
      : "hover:bg-gray-800/60 hover:border-gray-700",

    // Borders
    border: isLight ? "border-slate-300" : "border-gray-800",
    borderLight: isLight ? "border-slate-200" : "border-gray-900",
    borderDark: isLight ? "border-slate-400" : "border-gray-700",

    // Buttons
    buttonPrimary: "bg-blue-500 hover:bg-blue-400 text-white",
    buttonSecondary: isLight
      ? "bg-gray-200 hover:bg-gray-300 text-gray-900"
      : "bg-gray-800/70 hover:bg-gray-700/70 text-white border border-gray-700",

    // Shadows
    shadow: isLight ? "shadow-lg" : "shadow-2xl",
    shadowSm: isLight ? "shadow-sm" : "shadow-md",

    // Interactive states
    hover: isLight ? "hover:bg-gray-100" : "hover:bg-gray-800",
    active: isLight ? "active:bg-gray-200" : "active:bg-gray-700",
  };
}
