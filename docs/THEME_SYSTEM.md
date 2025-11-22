# Theme System Documentation

## Overview

The JPS Realtor website now features a comprehensive theme system that allows users to switch between different visual styles. The system supports two themes:

1. **Black Space** - Deep space aesthetic with starfield backgrounds (default)
2. **Light Gradient** - Clean, bright interface with soft gradients

## Features

✅ **Persistent Theme Selection** - Theme choice saved to localStorage
✅ **Seamless Switching** - Smooth transitions between themes
✅ **CSS Variables** - Dynamic theming with custom CSS properties
✅ **Theme-Aware Components** - All components automatically adapt
✅ **Dashboard Control** - Users can switch themes from `/dashboard`

---

## Architecture

### 1. **Theme Definitions** (`src/app/themes/themes.ts`)

**This is the single source of truth for all themes!** This centralized file contains:
- Theme type definitions
- All theme configurations
- Helper functions for theme classes

**To add a new theme:**
1. Add the theme name to the `ThemeName` type
2. Create a new theme object following the `Theme` interface
3. Add it to the `themes` object

```typescript
// Example: Adding a new "Ocean Blue" theme
export type ThemeName = "blackspace" | "lightgradient" | "oceanblue";

export const themes: Record<ThemeName, Theme> = {
  // ... existing themes ...
  oceanblue: {
    name: "oceanblue",
    displayName: "Ocean Blue",
    colors: {
      bgPrimary: "#001f3f",
      bgSecondary: "#003366",
      // ... more colors ...
    },
  },
};
```

### 2. Theme Context (`src/app/contexts/ThemeContext.tsx`)

The React context that manages theme state. Provides:
- Theme state management
- localStorage persistence
- CSS variable injection
- Theme switching functions

**Usage:**
```typescript
import { useTheme } from "@/app/contexts/ThemeContext";

function MyComponent() {
  const { currentTheme, theme, setTheme, toggleTheme } = useTheme();

  return (
    <div>
      Current theme: {currentTheme}
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}
```

### 3. Theme Components

#### ThemeToggle (`src/app/components/ThemeToggle.tsx`)
Simple toggle switch for quick theme switching.

```tsx
import ThemeToggle from "@/app/components/ThemeToggle";

<ThemeToggle />
```

#### ThemeSelector (`src/app/components/ThemeToggle.tsx`)
Full theme selector with previews (used in dashboard).

```tsx
import { ThemeSelector } from "@/app/components/ThemeToggle";

<ThemeSelector />
```

### 4. Theme-Aware Background (`src/app/components/backgrounds/SpaticalBackground.tsx`)

The spatial background component automatically switches between:
- **Black Space**: Animated starfield with deep space colors
- **Light Gradient**: Soft blue/white gradients with subtle pattern overlay

---

## Theme Definitions

### Black Space Theme
```typescript
{
  name: "blackspace",
  colors: {
    bgPrimary: "#000000",
    bgSecondary: "#0a0a0a",
    textPrimary: "#ffffff",
    textSecondary: "#e5e7eb",
    surfaceGlass: "rgba(17, 24, 39, 0.5)",
    accentPrimary: "#10b981", // emerald
    // ... more colors
  }
}
```

### Light Gradient Theme
```typescript
{
  name: "lightgradient",
  colors: {
    bgPrimary: "#ffffff",
    bgSecondary: "#f9fafb",
    textPrimary: "#111827",
    textSecondary: "#374151",
    surfaceGlass: "rgba(255, 255, 255, 0.8)",
    accentPrimary: "#10b981", // same emerald for consistency
    // ... more colors
  }
}
```

---

## Adding Theme Support to Components

### Option 1: Use Theme Classes Helper (Recommended)

The `useThemeClasses()` hook provides pre-computed Tailwind classes that automatically adapt to the current theme.

```tsx
import { useThemeClasses } from "@/app/contexts/ThemeContext";

function MyComponent() {
  const { bgPrimary, textPrimary, cardBg, cardBorder, border } = useThemeClasses();

  return (
    <div className={`${cardBg} ${border} ${cardBorder} p-4 rounded`}>
      <h1 className={`${textPrimary} text-2xl font-bold`}>
        Heading adapts to theme!
      </h1>
      <p className={`${textSecondary} mt-2`}>
        Content automatically changes with theme
      </p>
    </div>
  );
}
```

**Available Classes from `useThemeClasses()`:**
- `bgPrimary`, `bgSecondary`, `bgTertiary` - Background colors
- `textPrimary`, `textSecondary`, `textTertiary`, `textMuted` - Text colors
- `cardBg`, `cardBorder`, `cardHover` - Card styling
- `border`, `borderLight`, `borderDark` - Border colors
- `buttonPrimary`, `buttonSecondary` - Button styles
- `shadow`, `shadowSm` - Shadow utilities
- `hover`, `active` - Interactive states

### Option 2: Use Theme Object Directly

```tsx
import { useTheme } from "@/app/contexts/ThemeContext";

function MyComponent() {
  const { theme, currentTheme } = useTheme();

  return (
    <div
      style={{
        backgroundColor: theme.colors.bgPrimary,
        color: theme.colors.textPrimary
      }}
    >
      Content with inline styles
    </div>
  );
}
```

### Option 3: Use CSS Variables

When themes load, CSS variables are injected into `:root`. Use them in your CSS:

```css
.my-component {
  background: var(--color-bgPrimary);
  color: var(--color-textPrimary);
  border: 1px solid var(--color-surfaceBorder);
}
```

---

## Recommended Migration Pattern

To make existing components theme-aware:

1. **Import the theme hook** at the top of your component
2. **Replace hardcoded colors** with theme classes
3. **Test both themes** to ensure readability
4. **Use semantic class names** (cardBg, textPrimary) instead of specific colors

### Before:
```tsx
<div className="bg-black text-white border-gray-800">
  <h1 className="text-white">Title</h1>
  <p className="text-gray-300">Description</p>
</div>
```

### After:
```tsx
import { useThemeClasses } from "@/app/contexts/ThemeContext";

function Component() {
  const { bgPrimary, textPrimary, textSecondary, border } = useThemeClasses();

  return (
    <div className={`${bgPrimary} ${border}`}>
      <h1 className={`${textPrimary}`}>Title</h1>
      <p className={`${textSecondary}`}>Description</p>
    </div>
  );
}
```

---

## Available CSS Variables

All theme colors are available as CSS variables:

- `--color-bgPrimary`
- `--color-bgSecondary`
- `--color-bgTertiary`
- `--color-textPrimary`
- `--color-textSecondary`
- `--color-textTertiary`
- `--color-surfaceGlass`
- `--color-surfaceCard`
- `--color-surfaceBorder`
- `--color-accentPrimary`
- `--color-accentSecondary`
- `--color-hoverBg`
- `--color-activeBg`
- `--color-shadowSm`, `--color-shadowMd`, `--color-shadowLg`

---

## Theme Body Classes

The theme system also adds a class to `<body>`:
- `theme-blackspace`
- `theme-lightgradient`

Use these for theme-specific styling:

```css
.theme-blackspace .my-component {
  /* Styles for black space theme */
}

.theme-lightgradient .my-component {
  /* Styles for light theme */
}
```

---

## Future Enhancements

Potential additions to the theme system:

- [ ] Additional themes (e.g., "Ocean Blue", "Sunset Gradient")
- [ ] Custom theme builder for users
- [ ] System preference detection (`prefers-color-scheme`)
- [ ] Per-page theme overrides
- [ ] Theme transition animations
- [ ] High contrast mode for accessibility

---

## Troubleshooting

### Theme not persisting
- Check localStorage is enabled in browser
- Verify `ThemeProvider` wraps your app in `ClientLayoutWrapper.tsx`

### Components not updating on theme change
- Ensure component uses `useTheme()` hook or theme classes
- Check that hardcoded colors aren't overriding theme values

### Flash of wrong theme on load
- This is normal - theme loads from localStorage after mount
- Can be improved with SSR theme detection (future enhancement)

---

## Files Modified/Created

### New Files:
- `src/app/themes/themes.ts` - **Centralized theme definitions (SINGLE SOURCE OF TRUTH)**
- `src/app/contexts/ThemeContext.tsx` - Theme context and provider
- `src/app/components/ThemeToggle.tsx` - Toggle and selector components
- `docs/THEME_SYSTEM.md` - This documentation

### Modified Files:
- `src/app/components/ClientLayoutWrapper.tsx` - Added ThemeProvider
- `src/app/components/backgrounds/SpaticalBackground.tsx` - Made theme-aware
- `src/app/dashboard/page.tsx` - Added ThemeSelector
- `src/app/components/EnhancedSidebar.tsx` - Theme-aware sidebar
- Plus many neighborhood/city/subdivision pages (ongoing migration)

---

## Questions?

For questions or issues with the theme system, please check:
1. This documentation
2. The theme context file for available methods
3. Example usage in the dashboard page

Happy theming! 🎨
