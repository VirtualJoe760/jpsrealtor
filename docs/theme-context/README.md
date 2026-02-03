# Theme System Documentation

Complete documentation for the JPSRealtor theme system, covering light/dark modes, browser control colors, and animated transitions.

## 📚 Documentation Files

### [THEME_TRANSITIONS.md](./THEME_TRANSITIONS.md)
**Complete system architecture and implementation guide**

The primary documentation covering:
- **Initial Page Load Flow** - SSR → Inline Script → React Hydration
- **Two-Act Animation System** - EXIT → Refresh → ENTER
- **Browser Control Colors** - Meta tags + CSS `background-color` (CRITICAL!)
- **Property Showcases** - Obsidian Group listing integration
- **Animation Pairs** - 5 real estate-themed transitions
- **Troubleshooting Guide** - Common issues and solutions
- **Testing Checklist** - Verify functionality across devices

**Start here** for understanding the complete theme system.

### [THEME_TRANSITION_ANIMATIONS.md](./THEME_TRANSITION_ANIMATIONS.md)
Detailed animation specifications and timing breakdowns.

### [THEME_IMPLEMENTATION_GUIDE.md](./THEME_IMPLEMENTATION_GUIDE.md)
Step-by-step implementation guide for adding themes to components.

### [THEME_TRANSITION_IMPLEMENTATION_PLAN.md](./THEME_TRANSITION_IMPLEMENTATION_PLAN.md)
Original implementation plan and design decisions.

## 🎯 Quick Reference

### Key Files
| File | Purpose |
|------|---------|
| `src/app/contexts/ThemeContext.tsx` | Theme state, animations, browser control updates |
| `src/app/layout.tsx` | SSR theme detection, meta tags, inline scripts |
| `src/app/globals.css` | Theme CSS, **browser control colors** |
| `src/app/styles/theme-transitions.css` | Animation keyframes |
| `public/manifest-v2.json` | PWA theme color |
| `src/app/api/listings/featured/route.ts` | Obsidian Group listings API |

### Critical Color Sync Points

Browser controls require **THREE places** to match:

```typescript
// 1. Meta Tags (layout.tsx:145, 151)
<meta name="theme-color" content="#ffffff" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />

// 2. CSS Background (globals.css:190, 201)
html.theme-lightgradient {
  background-color: #ffffff; /* Safari samples THIS! */
}

// 3. Manifest (manifest-v2.json:8)
{
  "theme_color": "#ffffff"
}
```

### Animation Pairs

```typescript
{
  'french-doors': { exit: 'doors-close', enter: 'doors-open', duration: 500 },
  'garage': { exit: 'garage-down', enter: 'garage-up', duration: 450 },
  'sliding-door': { exit: 'slide-close', enter: 'slide-open', duration: 450 },
  'shutters': { exit: 'shutters-close', enter: 'shutters-open', duration: 500 },
  'curtains': { exit: 'curtains-close', enter: 'curtains-open', duration: 550 }
}
```

## 🐛 Common Issues

### Wrong Browser Control Colors
**Problem**: Blue/indigo controls on light theme
**Cause**: CSS `background-color` doesn't match meta tags
**Solution**: Update `globals.css:190, 201` to use `#ffffff` (white) fallback

### Animations Not Playing
**Problem**: No property showcase during theme toggle
**Cause**: Obsidian Group listings not loaded
**Solution**: Check `/api/listings/featured` returns data

### Flash During Transition
**Problem**: UI briefly visible during page refresh
**Cause**: Blocking script overlay timing issue
**Solution**: Verify `sessionStorage` keys and overlay `z-index: 99999`

## 🔄 Data Flow

```
User Clicks Toggle
    ↓
selectRandomAnimation() (random, no repeats)
    ↓
playExitAnimation()
  - Show listing photo + property details
  - Hold 2s
  - Cross-dissolve to solid color (600ms)
  - Buffer 300ms
    ↓
Update cookie + window.location.reload()
    ↓
Server renders HTML with new theme
    ↓
Inline blocking script creates solid overlay
    ↓
React hydrates → ThemeContext
    ↓
playEnterAnimation()
  - Cross-dissolve from solid to listing photo (600ms)
  - Show property details
  - Hold 2s
  - Animation OUT (500ms)
    ↓
User sees new theme
```

## ⏱️ Performance

**Total Duration**: ~6.5 seconds
- EXIT: 3400ms (animation 500ms + hold 2s + dissolve 600ms + buffer 300ms)
- ENTER: 3100ms (dissolve 600ms + hold 2s + animation 500ms)

**Optimizations**:
- Hardware acceleration (`transform: translateZ(0)`)
- Will-change hints
- Lazy-load listings (fetch on mount, cache in memory)
- Prevent scroll during animations

## 🚀 Future Improvements

1. **Preload Next Listing** - Load next property photo during animation
2. **More Animations** - Add real estate-themed transitions
3. **Reduced Motion** - Respect `prefers-reduced-motion` (instant fade)
4. **Service Worker** - Cache listing photos for offline
5. **Analytics** - Track which animations users see most

---

**Last Updated**: January 27, 2026
**Version**: 2.1 (CSS Background Color Fix)
