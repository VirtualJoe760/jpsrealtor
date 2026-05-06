// src/app/components/chat-v3/themeClasses.ts
//
// Shared color/theme class strings for the chat-v3 component family.
// Avoids repeating `isLight ? "bg-white" : "bg-neutral-800"` ternaries
// across every card/list/carousel/gallery — call once per component
// and pull semantic names from the returned object.
//
// The codebase's theme convention:
//   - Light mode is the "lightgradient" theme
//   - Dark mode uses neutral-* grays + emerald accent (vs blue on light)
//   - Favorites/destructive use rose- on both, just lighter on dark

export interface ChatThemeClasses {
  // Surfaces
  bgCard: string;
  bgCardHover: string;
  bgSecondary: string;
  bgSecondaryHover: string;
  bgSecondaryActive: string;
  bgPanel: string;
  bgInputPill: string;

  // Borders
  border: string;
  borderHover: string;
  borderStrong: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textFaint: string;

  // Primary accent (blue on light, emerald on dark — codebase convention)
  accentText: string;
  accentBgSolid: string; // for prominent CTAs
  accentBgSubtle: string;
  accentBorderSubtle: string;

  // Favorite/heart accent (rose, both modes)
  favoriteBg: string;
  favoriteBgHover: string;
  favoriteText: string;
  favoriteBorder: string;
}

export function chatThemeClasses(isLight: boolean): ChatThemeClasses {
  return {
    bgCard: isLight ? "bg-white" : "bg-neutral-800",
    bgCardHover: isLight ? "hover:bg-gray-50" : "hover:bg-neutral-700/60",
    bgSecondary: isLight ? "bg-gray-100" : "bg-neutral-700",
    bgSecondaryHover: isLight ? "hover:bg-gray-200" : "hover:bg-neutral-600",
    bgSecondaryActive: isLight ? "active:bg-gray-300" : "active:bg-neutral-500",
    bgPanel: isLight ? "bg-gray-50" : "bg-neutral-900/40",
    bgInputPill: isLight ? "bg-gray-100" : "bg-neutral-700",

    border: isLight ? "border-gray-200" : "border-neutral-700",
    borderHover: isLight ? "hover:border-gray-300" : "hover:border-neutral-600",
    borderStrong: isLight ? "border-gray-300" : "border-neutral-600",

    textPrimary: isLight ? "text-gray-900" : "text-white",
    textSecondary: isLight ? "text-gray-700" : "text-neutral-200",
    textTertiary: isLight ? "text-gray-600" : "text-neutral-300",
    textMuted: isLight ? "text-gray-500" : "text-neutral-400",
    textFaint: isLight ? "text-gray-400" : "text-neutral-500",

    accentText: isLight ? "text-blue-600" : "text-emerald-400",
    accentBgSolid: isLight
      ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white"
      : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white",
    accentBgSubtle: isLight
      ? "bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-600"
      : "bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-400",
    accentBorderSubtle: isLight
      ? "border-blue-200"
      : "border-emerald-500/30",

    favoriteBg: isLight ? "bg-rose-50" : "bg-rose-500/10",
    favoriteBgHover: isLight
      ? "hover:bg-rose-100 active:bg-rose-200"
      : "hover:bg-rose-500/20 active:bg-rose-500/30",
    favoriteText: isLight ? "text-rose-600" : "text-rose-400",
    favoriteBorder: isLight ? "border-rose-200" : "border-rose-500/30",
  };
}
