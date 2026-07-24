"use client";

/**
 * ThemeContext — theme preference + resolution.
 *
 * MODEL (2026-07-24 rewrite, see docs/theming/README.md):
 *   preference: "system" | "light" | "dark"   ← what the user chose (default system)
 *   currentTheme: "lightgradient" | "blackspace" ← what's on screen (resolved)
 *
 * - Default is SYSTEM: the site follows the device's prefers-color-scheme,
 *   live — flip your OS at sunset and the page (and the iPhone Dynamic
 *   Island / Safari chrome, via the meta tags below) morphs with it over the
 *   0.3s background transition in globals.css.
 * - The Sun/Moon toggles set an EXPLICIT override (light/dark), persisted in
 *   the `site-theme` cookie. "Auto" in the dashboard returns to system.
 * - Tenant lock (agentProfile.themeMode = light|dark) beats everything and
 *   hides/disables the toggles.
 * - Theme switching is INSTANT everywhere — no page reload. The old
 *   two-act reload transition existed to mask the reload's re-render cost;
 *   with every consumer now reactive there is nothing left to mask.
 *
 * PERSISTENCE RULES:
 * - The cookie is written ONLY on explicit user action (toggle / picker) —
 *   never automatically on load (the old auto-write froze every visitor on
 *   their first-ever theme).
 * - `site-theme-resolved` is an echo cookie (written here and by the layout
 *   head script) so the SERVER can render the correct system theme from the
 *   second visit onward. It is never a preference.
 * - Legacy cookie values migrate on read: "blackspace" → explicit dark (only
 *   reachable by a real toggle back then), "lightgradient" → system (it was
 *   auto-persisted for everyone, so it signals nothing).
 *
 * DYNAMIC ISLAND / BROWSER CHROME (the load-bearing part — keep in sync with
 * src/app/layout.tsx and globals.css):
 * - <meta name="theme-color"> + <meta name="apple-mobile-web-app-status-bar-style">
 *   are re-created (remove + append) on every theme change — Safari reliably
 *   notices a re-created tag where it may ignore a mutated one.
 * - In system mode we install DUAL theme-color metas with media attributes so
 *   Safari flips the chrome color natively the instant the OS theme changes,
 *   in perfect sync with our matchMedia listener morphing the page.
 * - The "all one color" effect itself is CSS: viewport-fit=cover plus the
 *   html/body theme backgrounds with background-attachment: fixed in
 *   globals.css. Do not touch those.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { getThemeClasses, isThemeName, type ThemeName } from "@/app/themes/themes";

export type { ThemeName };
export type ThemePreference = "system" | "light" | "dark";

interface ThemeContextType {
  /** Resolved theme currently on screen. */
  currentTheme: ThemeName;
  /** What the user chose: follow the device, or an explicit override. */
  preference: ThemePreference;
  /** Set an explicit light/dark override, or "system" to follow the device. Persists. */
  setPreference: (pref: ThemePreference) => void;
  /** Explicit theme set (persists as an override). Kept for existing callers. */
  setTheme: (theme: ThemeName) => void;
  /** Instant light↔dark flip; persists as an explicit override. */
  toggleTheme: () => void;
  /**
   * Session-only visual override (landing-page themeOverride). Does NOT
   * persist and does NOT change the visitor's preference — the old version
   * silently overwrote the visitor's cookie, which was a bug. While active it
   * PINS the theme: the system-sync and OS-change listener leave it alone,
   * and the chrome metas match the pinned theme (not the device). Cleared by
   * clearEphemeralTheme (LP unmount) or any explicit user action.
   */
  applyEphemeralTheme: (theme: ThemeName) => void;
  /** Revert an ephemeral override — re-resolves from the real preference. */
  clearEphemeralTheme: () => void;
  /** Tenant forces light/dark — controls are hidden and every setter no-ops. */
  themeLocked: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// VERSIONED preference cookie. Deliberately NOT the legacy 'site-theme':
// vercel.json stamps page HTML immutable, so long-cached OLD bundles keep
// running old ThemeContext code that auto-writes legacy values into
// 'site-theme' on every mount — which would silently corrupt the new
// preference (e.g. explicit light → explicit dark via the migration). Old
// code can't touch 'site-theme-pref', so once written it always wins; the
// legacy cookie is read only as a one-time migration source in layout.tsx.
const THEME_PREF_COOKIE = "site-theme-pref"; // light | dark | system
const RESOLVED_COOKIE = "site-theme-resolved"; // device echo for SSR: light | dark

const COOKIE_SUFFIX = `; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;

function prefToTheme(pref: "light" | "dark"): ThemeName {
  return pref === "dark" ? "blackspace" : "lightgradient";
}
function themeToPref(theme: ThemeName): "light" | "dark" {
  return theme === "blackspace" ? "dark" : "light";
}

function systemTheme(): ThemeName {
  if (typeof window === "undefined") return "lightgradient";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "blackspace"
    : "lightgradient";
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${value}${COOKIE_SUFFIX}`;
}

// ---------------------------------------------------------------------------
// Meta management (Dynamic Island / Safari chrome / Android address bar)
// ---------------------------------------------------------------------------

const LIGHT_CHROME = "#ffffff";
const DARK_CHROME = "#000000";

/**
 * Re-create the chrome meta tags for the given state. Remove + append (not
 * setAttribute) — Safari reliably re-reads a fresh tag.
 *
 * system mode → dual theme-color metas with media queries (Safari follows the
 * OS natively); explicit/locked → a single fixed meta.
 */
function applyChromeMetas(theme: ThemeName, followSystem: boolean) {
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((el) => el.remove());

  const add = (content: string, media?: string) => {
    const m = document.createElement("meta");
    m.setAttribute("name", "theme-color");
    m.setAttribute("content", content);
    if (media) m.setAttribute("media", media);
    document.head.appendChild(m);
  };

  if (followSystem) {
    add(LIGHT_CHROME, "(prefers-color-scheme: light)");
    add(DARK_CHROME, "(prefers-color-scheme: dark)");
  } else {
    add(theme === "blackspace" ? DARK_CHROME : LIGHT_CHROME);
  }

  // iOS PWA status bar (no media-query support — always single, resolved).
  document
    .querySelectorAll('meta[name="apple-mobile-web-app-status-bar-style"]')
    .forEach((el) => el.remove());
  const bar = document.createElement("meta");
  bar.setAttribute("name", "apple-mobile-web-app-status-bar-style");
  bar.setAttribute("content", theme === "blackspace" ? "black" : "default");
  document.head.appendChild(bar);
}

/** Swap the theme classes on <html> and <body>. `dark` rides along for the
 *  `.dark, .theme-blackspace` CSS block and (post Phase-3 config fix) Tailwind. */
function applyThemeClasses(theme: ThemeName) {
  [document.documentElement, document.body].forEach((el) => {
    el.className = el.className
      .split(" ")
      .filter((c) => c && !c.startsWith("theme-") && c !== "dark")
      .concat(`theme-${theme}`)
      .concat(theme === "blackspace" ? ["dark"] : [])
      .join(" ");
  });
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ThemeProviderProps {
  children: ReactNode;
  /** Server-resolved theme (cookie/echo/lock) — seeds state so SSR and first
   *  client render agree. */
  initialTheme?: ThemeName;
  /** Server-read preference (site-theme cookie, migrated). */
  initialPreference?: ThemePreference;
  /** Tenant forces light/dark — hide toggles, ignore visitor preference. */
  themeLocked?: boolean;
  forcedTheme?: ThemeName;
}

export function ThemeProvider({
  children,
  initialTheme,
  initialPreference = "system",
  themeLocked = false,
  forcedTheme,
}: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(
    forcedTheme || initialTheme || "lightgradient"
  );
  const [preference, setPreferenceState] = useState<ThemePreference>(
    themeLocked ? themeToPref(forcedTheme || initialTheme || "lightgradient") : initialPreference
  );

  // Refs so the single matchMedia listener always sees fresh values without
  // re-subscribing on every state change.
  const prefRef = useRef(preference);
  prefRef.current = preference;
  const lockedRef = useRef(themeLocked);
  lockedRef.current = themeLocked;
  const themeRef = useRef(currentTheme);
  themeRef.current = currentTheme;
  // Ephemeral pin (landing-page themeOverride). While set, the system-sync
  // and OS-change listener must NOT touch currentTheme, and the chrome metas
  // follow the pinned theme instead of the device. Held as ref + state:
  // effects read the ref; the state makes the apply effect re-run on changes.
  const ephemeralRef = useRef(false);
  const [ephemeralActive, setEphemeralActive] = useState(false);

  // On mount: if following the system, sync to the real device preference
  // (the server only knows it from the echo cookie — first visit it guessed
  // light) and subscribe to live OS changes. The correction renders as a
  // smooth 0.3s morph, not a flash: SSR page was internally consistent.
  //
  // NOTE: a child's applyEphemeralTheme (LandingPageClient) runs BEFORE this
  // ancestor effect in the same flush — the ephemeralRef guard is what stops
  // this sync from instantly clobbering the landing page's override.
  useEffect(() => {
    if (themeLocked) return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");

    // Clear legacy localStorage so long-cached OLD bundles (immutable page
    // HTML) can't resurrect stale values into the legacy cookie.
    try {
      localStorage.removeItem("site-theme");
      localStorage.removeItem("last-theme-animation");
    } catch {}

    // The echo cookie ALWAYS records the DEVICE scheme (never the page theme —
    // an ephemeral landing-page override must not pollute it). The head script
    // writes it pre-paint too; this keeps it fresh across long sessions.
    writeCookie(RESOLVED_COOKIE, mql.matches ? "dark" : "light");

    if (prefRef.current === "system" && !ephemeralRef.current) {
      const resolved = mql.matches ? "blackspace" : "lightgradient";
      setCurrentTheme((prev) => (prev === resolved ? prev : resolved));
    }

    const onChange = (e: MediaQueryListEvent) => {
      writeCookie(RESOLVED_COOKIE, e.matches ? "dark" : "light");
      if (lockedRef.current || prefRef.current !== "system" || ephemeralRef.current) return;
      setCurrentTheme(e.matches ? "blackspace" : "lightgradient");
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [themeLocked]);

  // Apply resolved theme to the document: classes + chrome metas.
  // NO persistence here — preference writes only happen on explicit action,
  // and the echo cookie is device-derived (effect above). While an ephemeral
  // override is active the chrome must match the PINNED theme, not the device
  // (dual media metas would recolor the island to the OS scheme and
  // contradict the page).
  useEffect(() => {
    applyThemeClasses(currentTheme);
    applyChromeMetas(
      currentTheme,
      !themeLocked && preference === "system" && !ephemeralActive
    );
  }, [currentTheme, preference, themeLocked, ephemeralActive]);

  const clearEphemeral = useCallback(() => {
    ephemeralRef.current = false;
    setEphemeralActive(false);
  }, []);

  const setPreference = useCallback(
    (pref: ThemePreference) => {
      if (lockedRef.current) return;
      clearEphemeral(); // explicit action always wins over an LP override
      setPreferenceState(pref);
      setCurrentTheme(pref === "system" ? systemTheme() : prefToTheme(pref));
      writeCookie(THEME_PREF_COOKIE, pref);
    },
    [clearEphemeral]
  );

  const setTheme = useCallback(
    (theme: ThemeName) => {
      if (!isThemeName(theme)) return;
      setPreference(themeToPref(theme));
    },
    [setPreference]
  );

  const toggleTheme = useCallback(() => {
    if (lockedRef.current) return;
    clearEphemeral();
    // Side effects OUTSIDE the state updater (StrictMode double-invokes
    // updaters; cookie writes there would run twice).
    const next: ThemeName =
      themeRef.current === "blackspace" ? "lightgradient" : "blackspace";
    setPreferenceState(themeToPref(next));
    writeCookie(THEME_PREF_COOKIE, themeToPref(next));
    setCurrentTheme(next);
  }, [clearEphemeral]);

  const applyEphemeralTheme = useCallback((theme: ThemeName) => {
    if (lockedRef.current || !isThemeName(theme)) return;
    // Visual only: no cookie writes, no preference change. Pins the theme so
    // the system-sync / OS-change listener can't clobber the landing page's
    // styled moment; cleared on LP unmount or any explicit user action.
    ephemeralRef.current = true;
    setEphemeralActive(true);
    setCurrentTheme(theme);
  }, []);

  const clearEphemeralTheme = useCallback(() => {
    if (!ephemeralRef.current) return;
    clearEphemeral();
    if (lockedRef.current) return;
    // Re-resolve from the real preference (not a snapshot — the OS scheme may
    // have flipped while the override was active).
    setCurrentTheme(
      prefRef.current === "system" ? systemTheme() : prefToTheme(prefRef.current as "light" | "dark")
    );
  }, [clearEphemeral]);

  const value: ThemeContextType = {
    currentTheme,
    preference,
    setPreference,
    setTheme,
    toggleTheme,
    applyEphemeralTheme,
    clearEphemeralTheme,
    themeLocked,
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
