---
title: Theming
status: current
last_verified: 2026-07-24
---

# Theming

> Two themes, three-state preference, zero reloads. The visible theme is
> `lightgradient` or `blackspace`; the *preference* is `system | light | dark`,
> default **system** (follow the device). Rewritten 2026-07-24 — the old
> reload-based transition system, 25-color theme objects, and `--color-*`
> variables are gone (a full audit found zero consumers).

## The model

| Layer | Values | Where |
|---|---|---|
| Preference | `system` (default) \| `light` \| `dark` | `site-theme-pref` cookie — written ONLY on explicit user action. VERSIONED name: long-cached old bundles (immutable page HTML) auto-write legacy values into the old `site-theme` cookie forever; new code never reads it once `-pref` exists, so they can't corrupt the preference |
| Resolved theme | `lightgradient` \| `blackspace` | `currentTheme` in React; `theme-{name}` (+ `dark`) classes on `<html>`/`<body>` |
| Device echo | `light` \| `dark` | `site-theme-resolved` cookie — the client's `prefers-color-scheme`, written pre-paint so the SERVER can render system-preference visitors correctly from visit 2 onward |

Resolution order: **tenant lock** (`agentProfile.themeMode` light/dark) →
**explicit preference** → **system** (echo cookie on the server, `matchMedia`
on the client) → light.

Legacy cookie migration (head script writes `site-theme-pref` once, only when
absent; server read mirrors it): `blackspace` → explicit `dark` (only reachable
via a real toggle historically); `lightgradient` → `system` (the old code
auto-wrote it for every visitor, so it signaled nothing). The head script also
deletes the legacy localStorage keys old bundles fed on.

An LP `themeOverride` uses `applyEphemeralTheme`: it PINS the theme (system
sync + OS-change listener leave it alone, chrome metas match the pin, not the
device) and `clearEphemeralTheme` reverts it on LP unmount — soft navigation
can't leak the override site-wide. Never mount a second `<ThemeProvider>`
below the root one; a nested bare provider stomps document state (that bug
lived on /test until 2026-07-24).

## Key files

- `src/app/contexts/ThemeContext.tsx` — provider. `useTheme()` returns
  `{ currentTheme, preference, setPreference, setTheme, toggleTheme,
  applyEphemeralTheme, themeLocked }`. `useThemeClasses()` wraps
  `getThemeClasses` (the class-string vocabulary ~132 files use).
- `src/app/layout.tsx` — server resolution (`getServerThemeState`), SSR theme
  classes + chrome metas, and the tiny pre-paint script (legacy migration +
  echo-cookie write — it deliberately does NOT flip classes).
- `src/app/themes/themes.ts` — `ThemeName` + `getThemeClasses` only.
- `src/app/globals.css` — the real styling: `html.theme-*` background blocks,
  `color-scheme`, the `.dark, .theme-blackspace` shadcn HSL variables.

## First-paint guarantees (the old "dark flash" class of bugs)

- SSR classes come from cookies, so returning visitors paint their theme from
  byte one — both explicit and system (via the echo cookie).
- First-ever visit on a dark device renders a **consistent light page**, then
  morphs to dark right after hydration (0.3s background transition). Never a
  half-themed frame; every later visit SSRs dark directly.
- NEVER gate theme rendering on a `mounted` flag — `currentTheme` is
  hydration-safe (seeded from the SSR cookie). The `mounted ? x : darkDefault`
  pattern WAS the dark-flash bug (SpaticalBackground, fixed 2026-07-23).

## Dynamic Island / browser chrome ("all one color")

Load-bearing pieces — keep them intact:

1. `viewport-fit=cover` in the viewport meta (`layout.tsx`).
2. `html.theme-*` AND `html.theme-* body` backgrounds in `globals.css` with
   `background-attachment: fixed`, `min-height: calc(100dvh +
   env(safe-area-inset-top))`, and solid `#ffffff`/`#000000` fallbacks —
   this is what paints under the island / home indicator.
3. `<meta name="theme-color">` + `<meta name="apple-mobile-web-app-status-bar-style">`:
   SSR'd from the resolved theme; ThemeContext re-creates them (remove +
   append — Safari reliably notices a fresh tag) on every theme change. In
   system mode it installs **dual theme-color metas with media attributes**,
   so Safari flips the chrome natively and in sync when the OS theme changes.
4. Do NOT add an `appleWebApp` block to `generateMetadata` — Next emits its
   own static `apple-mobile-web-app-*` metas that land first and beat the
   theme-aware ones (this bug shipped for a long time; fixed 2026-07-24).

## Theme switching is instant

`toggleTheme()` / `setPreference()` are plain state changes — classes, metas,
and every reactive consumer update in place, smoothed by `body`'s
`transition: background 0.3s ease`. The old `window.location.reload()` +
two-act cinematic overlay existed to mask the reload; with all consumers
reactive there is nothing to mask. Don't reintroduce reloads.

`applyEphemeralTheme()` (landing-page `themeOverride`) is visual-only: no
cookie writes, no preference change, no-ops when tenant-locked. The old
`setTheme` call here silently overwrote the visitor's preference — bug.

## Control surfaces

- `TopToggles` (mobile, /chap), `EnhancedSidebar` footer, `EnhancedNavbar`
  icon — two-way toggles that set an explicit override. Hidden when locked.
- Dashboard `ProfileCard` — tri-state segmented control (Auto / Light / Dark),
  hidden when locked. "Auto" is how a user returns to device-following.

## Consumer patterns (status quo, not gospel)

~255 files branch on `currentTheme === "lightgradient"`; ~132 use
`useThemeClasses()`; chat-v3 has `chatThemeClasses(isLight)`; CRM prop-drills
`isLight`. **Known debt:** `tailwind.config.ts` has `darkMode: ["class",
"class"]`, which compiles every `dark:` variant to a dead selector — all ~332
`dark:` usages (mostly CRM) are inert CSS. Fixing it to `"class"` activates
them sight-unseen, so that's a deliberate, separate visual-review pass
("Phase 3"). The `dark` class IS already applied (SSR + client) in
anticipation.
