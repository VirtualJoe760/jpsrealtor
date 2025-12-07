# Responsive Design Guide

## Overview

This guide documents the screen size optimization standards for the jpsrealtor.com website. Our design system is optimized for four primary device categories: **iPhone**, **iPad**, **MacBook Pro 13-inch**, and **Desktop 2XL**.

---

## Breakpoint Strategy

Our responsive design follows a mobile-first approach using Tailwind CSS breakpoints:

```typescript
// Breakpoint Reference
const breakpoints = {
  sm: "640px",   // Small tablets and larger phones
  md: "768px",   // Tablets (iPad)
  lg: "1024px",  // MacBook Pro 13" and smaller laptops
  xl: "1280px",  // Desktop and MacBook Pro 15"+
  "2xl": "1536px" // Large desktop displays
};
```

### Device Mapping

| Device Category | Screen Size | Breakpoint Range | Key Characteristics |
|----------------|-------------|------------------|---------------------|
| **iPhone** | 375px - 428px | `< sm (640px)` | Single column, stacked layout, modal overlays |
| **iPad** | 768px - 1024px | `md` to `lg` | Two-column layouts, condensed tables, sidebar navigation |
| **MacBook 13"** | 1280px - 1440px | `lg` to `xl` | Multi-column grids, sidebar previews, full table views |
| **Desktop 2XL** | 1536px+ | `xl` and `2xl` | Maximum width containers, advanced layouts, fixed sidebars |

---

## Core Responsive Patterns

### 1. Container Widths

All pages follow this container pattern:

```tsx
// Page wrapper - NO bgPrimary (background from root layout)
<div className="min-h-screen py-12 px-4" data-page="page-name">
  {/* Inner container with responsive max-width */}
  <div className="max-w-7xl mx-auto">
    {/* Content */}
  </div>
</div>
```

**Responsive Container Sizes:**
- Mobile (`< sm`): Full width with `px-4` padding
- Tablet (`md`): `max-w-3xl` or `max-w-5xl`
- Laptop (`lg`): `max-w-6xl`
- Desktop (`xl`+): `max-w-7xl`

### 2. Typography Scaling

```tsx
// Headings
<h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl">
  {/* Scales from 24px (mobile) to 48px (desktop) */}
</h1>

<h2 className="text-xl md:text-2xl lg:text-3xl">
  {/* Scales from 20px (mobile) to 30px (desktop) */}
</h2>

<p className="text-sm md:text-base lg:text-lg">
  {/* Body text: 14px → 16px → 18px */}
</p>
```

### 3. Touch Target Standards

All interactive elements must meet **minimum 44px touch targets** on mobile:

```tsx
// ✅ CORRECT: Adequate touch target
<button className="px-4 py-3 min-h-[44px]">
  Click Me
</button>

// ❌ INCORRECT: Too small for touch
<button className="px-2 py-1">
  Click Me
</button>
```

**Icon-only buttons:**
```tsx
<button className="w-11 h-11 flex items-center justify-center">
  <Icon className="w-5 h-5" />
</button>
```

---

## Layout Patterns by Component Type

### Admin Pages

#### Header Section
```tsx
<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
  {/* Title */}
  <div className="flex items-center gap-3">
    <Icon className="w-8 h-8 md:w-10 md:h-10" />
    <h1 className="text-2xl md:text-4xl font-bold">
      Page Title
    </h1>
  </div>

  {/* Action Buttons */}
  <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full sm:w-auto">
    <button className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3">
      Action 1
    </button>
    <button className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3">
      Action 2
    </button>
  </div>
</div>
```

**Responsive Behavior:**
- **Mobile**: Stacked vertically, full-width buttons
- **Tablet**: Horizontal layout begins, buttons side-by-side
- **Desktop**: Full horizontal layout with proper spacing

#### Filters and Search
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  {/* Search Input */}
  <div className="sm:col-span-2">
    <input
      type="text"
      placeholder="Search..."
      className="w-full px-4 py-3"
    />
  </div>

  {/* Filter Dropdowns */}
  <select className="w-full px-4 py-3">
    <option>Category</option>
  </select>

  <select className="w-full px-4 py-3">
    <option>Status</option>
  </select>
</div>
```

**Responsive Behavior:**
- **Mobile**: Single column, full width
- **Tablet**: 2 columns, search spans both
- **Desktop**: 4 columns, search spans 2

#### Data Display: Table vs Cards

**Desktop Table (lg+):**
```tsx
<div className="hidden lg:block overflow-x-auto">
  <table className="w-full">
    <thead>
      <tr>
        <th>Column 1</th>
        <th>Column 2</th>
        <th>Column 3</th>
      </tr>
    </thead>
    <tbody>
      {data.map(item => (
        <tr key={item.id}>
          <td>{item.field1}</td>
          <td>{item.field2}</td>
          <td>{item.field3}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Mobile Card View (< lg):**
```tsx
<div className="lg:hidden divide-y divide-gray-700">
  {data.map(item => (
    <div key={item.id} className="p-4 space-y-3">
      <h3 className="font-semibold text-lg">{item.title}</h3>
      <div className="flex flex-wrap gap-2 text-sm">
        <span>{item.category}</span>
        <span>{item.date}</span>
      </div>
      <div className="flex gap-2 pt-2">
        <button className="flex-1 py-2">
          <Eye className="w-4 h-4 mx-auto" />
        </button>
        <button className="flex-1 py-2">
          <Edit className="w-4 h-4 mx-auto" />
        </button>
        <button className="flex-1 py-2">
          <Trash2 className="w-4 h-4 mx-auto" />
        </button>
      </div>
    </div>
  ))}
</div>
```

**Responsive Behavior:**
- **Mobile/Tablet**: Card view with vertical stacking
- **Laptop/Desktop**: Full table view with horizontal scrolling

### Forms and Editors

#### Article Editor Layout
```tsx
<div className="grid gap-8 grid-cols-1">
  {/* Form Container with dynamic margin for preview */}
  <div className={`max-w-6xl mx-auto w-full transition-all ${
    showPreview ? "xl:mr-[25rem]" : ""
  }`}>
    {/* Form fields */}
  </div>
</div>
```

#### Preview Panel: Modal vs Sidebar

**Mobile Preview (< xl): Full-Screen Modal**
```tsx
{showPreview && (
  <div className="xl:hidden fixed inset-0 bg-black/95 z-50 overflow-y-auto">
    <div className="min-h-screen p-4">
      {/* Header with Close button */}
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-black/95 py-4 z-10">
        <h3>Article Preview</h3>
        <div className="flex items-center gap-2">
          <button onClick={refreshPreview}>Refresh</button>
          <button onClick={() => setShowPreview(false)}>Close</button>
        </div>
      </div>

      {/* Preview Frame */}
      <div className="relative mx-auto max-w-md">
        <iframe src="/preview-url" className="w-full h-screen" />
      </div>
    </div>
  </div>
)}
```

**Desktop Preview (xl+): Fixed Sidebar**
```tsx
{showPreview && (
  <div className="hidden xl:block fixed right-8 top-24 bottom-8 w-96 z-40">
    <div className={`${cardBg} ${cardBorder} rounded-xl p-6 h-full flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3>Mobile Preview</h3>
        <button onClick={refreshPreview}>Refresh</button>
      </div>

      {/* iPhone-style Preview Frame */}
      <div className="flex-1 flex items-center justify-center overflow-auto">
        <div className="relative" style={{ width: '375px', height: '667px' }}>
          {/* Notch */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 rounded-b-3xl z-10"></div>

          {/* Preview iframe */}
          <div className="w-full h-full rounded-3xl overflow-hidden border-8 border-gray-800 shadow-2xl bg-white">
            <iframe src="/preview-url" className="w-full h-full" />
          </div>

          {/* Home Indicator */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 rounded-full z-10"></div>
        </div>
      </div>
    </div>
  </div>
)}
```

**Responsive Behavior:**
- **Mobile/Tablet**: Toggle button shows full-screen modal preview
- **Laptop (< xl)**: Same mobile behavior
- **Desktop (xl+)**: Toggle button shows fixed right sidebar with iPhone frame

---

## Navigation Patterns

### Mobile Navigation (< lg)
```tsx
<nav className="lg:hidden">
  {/* Hamburger Menu */}
  <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
    <Menu className="w-6 h-6" />
  </button>

  {/* Slide-out Menu */}
  <div className={`fixed inset-y-0 left-0 w-64 bg-black transform transition-transform ${
    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
  }`}>
    {/* Menu Items */}
  </div>
</nav>
```

### Desktop Navigation (lg+)
```tsx
<nav className="hidden lg:flex items-center gap-6">
  <a href="/dashboard">Dashboard</a>
  <a href="/articles">Articles</a>
  <a href="/listings">Listings</a>
</nav>
```

---

## Image Optimization

### Responsive Images
```tsx
<img
  src={imageUrl}
  alt={altText}
  className="w-full h-auto object-cover"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
/>
```

### Hero Images
```tsx
<div className="relative w-full h-48 sm:h-64 md:h-80 lg:h-96 xl:h-[500px]">
  <img
    src={heroImage}
    alt="Hero"
    className="w-full h-full object-cover"
  />
</div>
```

**Responsive Behavior:**
- **Mobile**: 192px height
- **Tablet**: 256px - 320px
- **Laptop**: 384px
- **Desktop**: 500px

---

## Spacing and Padding

### Consistent Spacing Scale
```tsx
// Section Spacing
<section className="py-8 md:py-12 lg:py-16 xl:py-20">
  {/* 32px → 48px → 64px → 80px */}
</section>

// Container Padding
<div className="px-4 sm:px-6 md:px-8 lg:px-12">
  {/* 16px → 24px → 32px → 48px */}
</div>

// Gap Between Elements
<div className="flex gap-2 sm:gap-3 md:gap-4 lg:gap-6">
  {/* 8px → 12px → 16px → 24px */}
</div>
```

---

## Performance Considerations

### Mobile-First Loading
1. **Critical CSS**: Load base styles first
2. **Lazy Load Images**: Use `loading="lazy"` for below-fold images
3. **Code Splitting**: Separate mobile and desktop components when significantly different

### Touch Optimization
- All buttons: `min-h-[44px]` and `min-w-[44px]`
- Adequate spacing between touch targets: minimum `8px` gap
- Larger hit areas for icon buttons

### Viewport Meta Tag
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
```

---

## Testing Checklist

### Device Testing
- [ ] iPhone SE (375px)
- [ ] iPhone 12/13/14 (390px)
- [ ] iPhone 12/13/14 Pro Max (428px)
- [ ] iPad (768px)
- [ ] iPad Pro (1024px)
- [ ] MacBook Pro 13" (1280px - 1440px)
- [ ] Desktop 2XL (1536px+)

### Functionality Testing
- [ ] Touch targets are adequate (44px minimum)
- [ ] Text is readable without zoom
- [ ] Forms are usable on mobile
- [ ] Navigation works across all breakpoints
- [ ] Images load and scale properly
- [ ] Tables adapt to card view on mobile
- [ ] Modals and overlays are accessible
- [ ] Preview panels work correctly

### Performance Testing
- [ ] Lighthouse Mobile Score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] No layout shifts (CLS < 0.1)

---

## Reference Implementations

### Example: Admin Articles Page
**File:** `/src/app/admin/articles/page.tsx`

**Key Features:**
- Responsive header with stacked/horizontal layout
- Mobile card view / Desktop table view
- Theme-aware components
- Touch-friendly buttons

### Example: Article Editor
**File:** `/src/app/admin/articles/new/page.tsx`

**Key Features:**
- Modal preview on mobile (< xl)
- Fixed sidebar preview on desktop (xl+)
- Responsive form layout
- Dynamic margin adjustment when preview is open

---

## Common Patterns Quick Reference

```tsx
// Responsive Grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

// Responsive Flexbox
<div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">

// Conditional Display
<div className="block lg:hidden">{/* Mobile Only */}</div>
<div className="hidden lg:block">{/* Desktop Only */}</div>

// Responsive Text Size
<p className="text-sm sm:text-base md:text-lg lg:text-xl">

// Responsive Padding
<div className="p-4 sm:p-6 md:p-8 lg:p-12">

// Responsive Width
<div className="w-full lg:w-1/2 xl:w-1/3">
```

---

## Conclusion

Following these responsive design patterns ensures a consistent, accessible, and performant experience across all device categories. Always test on actual devices when possible, and prioritize mobile users without compromising desktop functionality.

For theme implementation details, see [THEME_IMPLEMENTATION_GUIDE.md](./THEME_IMPLEMENTATION_GUIDE.md).
