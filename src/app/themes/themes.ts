/**
 * Theme vocabulary + theme-aware Tailwind class helper.
 *
 * The app has exactly two visual themes. `currentTheme` everywhere in the
 * codebase is one of these two names; the *preference* layer (system | light |
 * dark, device-following by default) lives in ThemeContext and resolves down
 * to one of these before anything renders.
 *
 * 2026-07-24: the old 25-color Theme objects + JS-applied --color-* CSS
 * variables were deleted — a full audit found zero consumers. Components theme
 * via getThemeClasses() below, ad-hoc `isLight` ternaries, and the
 * `.theme-lightgradient` / `.theme-blackspace` CSS in globals.css.
 * See docs/theming/README.md.
 */

export type ThemeName = "blackspace" | "lightgradient";

/** Type guard for anything user-supplied (cookies, query params). */
export function isThemeName(v: unknown): v is ThemeName {
  return v === "blackspace" || v === "lightgradient";
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

    // Shadows - More prominent in dark mode for contrast
    shadow: isLight ? "shadow-lg" : "shadow-2xl shadow-black/40",
    shadowSm: isLight ? "shadow-sm" : "shadow-lg shadow-black/30",
    shadowMd: isLight ? "shadow-md" : "shadow-xl shadow-black/40",
    shadowLg: isLight ? "shadow-xl" : "shadow-2xl shadow-black/50",

    // Interactive states
    hover: isLight ? "hover:bg-gray-100" : "hover:bg-gray-800",
    active: isLight ? "active:bg-gray-200" : "active:bg-gray-700",
  };
}
