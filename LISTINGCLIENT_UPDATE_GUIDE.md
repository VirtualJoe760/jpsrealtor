# ListingClient.tsx Theme Update Guide

## Import Changes (Line 13)
ADD after line 12:
```typescript
import { useThemeClasses } from "@/app/contexts/ThemeContext";
```

## Hook Addition (After line 80)
ADD after `const daysOnMarket = calculateDaysOnMarket(listing.listingContractDate);`:
```typescript
const { textPrimary, textSecondary, textTertiary, textMuted, currentTheme } = useThemeClasses();
const isLight = currentTheme === "lightgradient";
```

## Text Color Replacements

### Line 131: Header Panel Background
REPLACE: `className="bg-black/40 backdrop-blur-xl border border-neutral-800/50 rounded-2xl p-6 md:p-8 shadow-2xl"`
WITH: `className={`${isLight ? 'bg-white/80' : 'bg-black/40'} backdrop-blur-xl ${isLight ? 'border-gray-200' : 'border border-neutral-800/50'} rounded-2xl p-6 md:p-8 shadow-2xl`}`

### Line 136: H1 Title
REPLACE: `className="text-3xl md:text-4xl font-bold text-white mb-3"`
WITH: `className={`text-3xl md:text-4xl font-bold ${textPrimary} mb-3`}`

### Line 139: MLS Info
REPLACE: `className="flex flex-wrap items-center gap-3 text-sm text-neutral-400 mb-4"`
WITH: `className={`flex flex-wrap items-center gap-3 text-sm ${textTertiary} mb-4`}`

### Line 156: Status Badge (inactive)
REPLACE: `"bg-neutral-700/50 text-neutral-300 border border-neutral-600/30"`
WITH: ``${isLight ? 'bg-gray-200 text-gray-700 border-gray-300' : 'bg-neutral-700/50 text-neutral-300 border-neutral-600/30'} border``

### Line 159: Status dot (inactive)  
REPLACE: `"bg-neutral-400"`
WITH: `isLight ? "bg-gray-500" : "bg-neutral-400"`

### Line 163: Days on market text
REPLACE: `className="flex items-center gap-1.5 text-neutral-400 text-sm"`
WITH: `className={`flex items-center gap-1.5 ${textTertiary} text-sm`}`

### Lines 185, 197, 209, 221, 233: Quick Stats Cards
REPLACE: `className="flex items-center gap-3 bg-neutral-900/50 rounded-xl p-3 border border-neutral-700/30"`
WITH: `className={`flex items-center gap-3 ${isLight ? 'bg-gray-50' : 'bg-neutral-900/50'} rounded-xl p-3 ${isLight ? 'border border-gray-200' : 'border border-neutral-700/30'}`}`

### Lines 190, 202, 214, 226, 238: Stat Values
REPLACE: `className="text-2xl font-bold text-white"`
WITH: `className={`text-2xl font-bold ${textPrimary}`}`

### Lines 191, 203, 215, 227, 239: Stat Labels
REPLACE: `className="text-xs text-neutral-400"`
WITH: `className={`text-xs ${textTertiary}`}`

### Lines 257, 267, 279: Action Buttons (non-primary)
REPLACE: `className="flex items-center justify-center gap-2 h-12 rounded-xl border border-neutral-600 bg-neutral-900/50 hover:bg-neutral-800/50 text-white font-semibold transition-all"`
WITH: `className={`flex items-center justify-center gap-2 h-12 rounded-xl ${isLight ? 'border border-gray-300 bg-gray-100 hover:bg-gray-200' : 'border border-neutral-600 bg-neutral-900/50 hover:bg-neutral-800/50'} ${textPrimary} font-semibold transition-all`}`

### Lines 295, 310, 366, 476, 489: Panel Backgrounds
REPLACE: `className="bg-black/40 backdrop-blur-xl border border-neutral-800/50 rounded-2xl p-6 shadow-2xl"`
WITH: `className={`${isLight ? 'bg-white/80' : 'bg-black/40'} backdrop-blur-xl ${isLight ? 'border-gray-200' : 'border border-neutral-800/50'} rounded-2xl p-6 shadow-2xl`}`

### Lines 297, 312, 368, 491: Section Headings
REPLACE: `className="text-2xl font-bold text-white mb-4 flex items-center gap-2"`
WITH: `className={`text-2xl font-bold ${textPrimary} mb-4 flex items-center gap-2`}`

### Line 301: Description Text
REPLACE: `className="text-lg text-neutral-300 leading-relaxed whitespace-pre-line"`
WITH: `className={`text-lg ${textSecondary} leading-relaxed whitespace-pre-line`}`

### Lines 336, 341, 346: Feature Badges  
REPLACE: `className="bg-neutral-800/70 px-4 py-2 rounded-full border border-neutral-700/30 text-sm text-white"`
WITH: `className={`${isLight ? 'bg-gray-100 border-gray-300' : 'bg-neutral-800/70 border-neutral-700/30'} px-4 py-2 rounded-full border text-sm ${textPrimary}`}`

### Lines 375-468: Property Detail Cards
REPLACE each: `className="bg-neutral-900/30 rounded-xl p-4 border border-neutral-700/20"`
WITH: `className={`${isLight ? 'bg-gray-50 border-gray-200' : 'bg-neutral-900/30 border-neutral-700/20'} rounded-xl p-4 border`}`

REPLACE each: `className="text-xs text-neutral-400 mb-1"`
WITH: `className={`text-xs ${textTertiary} mb-1`}`

REPLACE each: `className="text-white font-medium"`
WITH: `className={`${textPrimary} font-medium`}`

### Line 480: Attribution Text
REPLACE: `className="text-xs text-neutral-400"`
WITH: `className={`text-xs ${textTertiary}`}`

## Summary
- Total changes: ~60+ instances
- Pattern: Replace hardcoded Tailwind classes with theme variables
- Add conditional styling for light/dark modes
- Maintain visual hierarchy with consistent use of textPrimary > textSecondary > textTertiary > textMuted
