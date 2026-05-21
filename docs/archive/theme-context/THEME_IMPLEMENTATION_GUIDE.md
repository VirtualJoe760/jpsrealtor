# Theme Implementation Guide
**JPSRealtor.com - Correct Theme Usage Patterns**
**Last Updated:** January 29, 2025

---

## ⚠️ CRITICAL: Background Implementation Pattern

**DO NOT** set `bgPrimary` or background colors on page containers. The theme background comes from the root layout (`src/app/layout.tsx`), NOT from individual pages.

---

## 🚨 CRITICAL: Padding & Background Bleed Issue

**Last Updated:** January 23, 2026

### The Problem

Per **MDN CSS Box Model**: _"Background colors extend through the padding area."_

This means when you apply padding to a container that sits directly against the body's gradient background, the gradient **will show through** the padded area, creating unwanted "white space" or gradient bleed on the sides of the page.

### ❌ INCORRECT Pattern - Padding on Main Container

```tsx
// ❌ WRONG - Gradient will show through padding creating white space
<div className="max-w-7xl mx-auto w-full h-full flex flex-col pt-16 md:pt-0 px-4 sm:px-6 lg:px-8">
  <YourHeader />
  <YourToolbar />
  <YourContent />
</div>
```

**Why This Breaks:**
1. Body has gradient background (defined in `globals.css` lines 139-150)
2. Container has `px-4 sm:px-6 lg:px-8` padding
3. Background fills that padding space
4. Result: Visible gradient "white space" on sides that looks like a layout bug

### ✅ CORRECT Pattern - Parent Wrapper with Padding

```tsx
// ✅ CORRECT - No padding on main container
<div className="max-w-7xl mx-auto w-full h-full flex flex-col pt-16 md:pt-0">

  {/* Wrap each section individually with padding */}
  <div className="px-4 sm:px-6 lg:px-8">
    <YourHeader />
  </div>

  <div className="px-4 sm:px-6 lg:px-8">
    <YourToolbar />
  </div>

  <div className="px-4 sm:px-6 lg:px-8">
    <YourContent />
  </div>
</div>
```

**Why This Works:**
1. Main container has NO padding → no background bleed
2. Individual sections wrapped in parent divs with padding
3. Content properly spaced from edges WITHOUT exposing background
4. Background gradient never shows in unwanted areas

### Real-World Implementation Example

See **`src/app/agent/contacts/page.tsx`** (lines 19-87):

```tsx
// Main container - NO PADDING
<div className="max-w-7xl mx-auto w-full h-full flex flex-col overflow-x-hidden pt-16 md:pt-0">

  {/* Navigation - No padding needed (fixed positioned buttons) */}
  <div className="flex-shrink-0">
    <AgentNav />
  </div>

  {/* Header - Wrapped with padding */}
  <div className="px-4 sm:px-6 lg:px-8">
    <div className="mb-4 sm:mb-6 flex-shrink-0 flex items-start justify-between">
      <h1>Contacts</h1>
      {/* ... */}
    </div>
  </div>

  {/* Content - Wrapped with padding */}
  <div className="flex-1 overflow-hidden">
    <ContactsTab /> {/* This component also uses wrapper pattern internally */}
  </div>
</div>
```

Also see **`src/app/components/crm/ContactsTab.tsx`** (lines 244-306):

```tsx
{/* Toolbar - Wrapped with padding */}
{showToolbar && (
  <div className="px-4 sm:px-6 lg:px-8">
    <div className="flex-shrink-0 mb-4">
      <ContactToolbar {...props} />
    </div>
  </div>
)}

{/* List View - Wrapped with padding */}
{viewMode === ViewMode.LIST && (
  <div className="px-4 sm:px-6 lg:px-8 h-full">
    <ContactList {...props} />
  </div>
)}
```

### Quick Decision Tree

**Question:** "Should I add padding to this container?"

1. **Does the container sit directly against the body gradient?**
   - YES → ❌ **DO NOT** add padding. Use parent wrapper pattern instead.
   - NO → ✅ Safe to add padding (it's nested inside another element with background)

2. **Is this a card/modal component?**
   - YES → ✅ Safe to add padding (cards have their own backgrounds via `cardBg`)
   - NO → See #1

3. **Is this a section inside a page?**
   - YES → ✅ Use parent wrapper: `<div className="px-4 sm:px-6 lg:px-8"><YourSection /></div>`

### Files with Comprehensive Documentation

- **`src/app/contexts/ThemeContext.tsx`** (lines 3-61) - Full technical explanation
- **`src/app/globals.css`** (lines 123-138) - Warning at gradient definition
- **`src/app/agent/contacts/page.tsx`** - Reference implementation
- **`src/app/components/crm/ContactsTab.tsx`** - Nested wrapper examples

### ✅ Padding Pattern Checklist

Before committing code with padding:

- [ ] Main page container has NO `px-*` classes
- [ ] Each section (header, toolbar, content) wrapped in `<div className="px-4 sm:px-6 lg:px-8">`
- [ ] No visible gradient/white space on page sides
- [ ] Content properly spaced from edges
- [ ] Responsive padding preserved across breakpoints

**Remember:** When in doubt, use the parent wrapper pattern. It's always safe and prevents background bleed.

### ✅ CORRECT Pattern (Dashboard/Admin Pages)

```tsx
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { useTheme } from "@/app/contexts/ThemeContext";

export default function MyPage() {
  const {
    cardBg,
    cardBorder,
    cardHover,
    textPrimary,
    textSecondary,
    textMuted,
    border,
    bgSecondary,
    buttonPrimary,
    buttonSecondary,
    shadow,
  } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // ✅ CORRECT: No bgPrimary on page container
  return (
    <div className="min-h-screen py-12 px-4" data-page="my-page">
      <div className="max-w-7xl mx-auto">

        {/* ✅ CORRECT: Cards use cardBg, NOT bgPrimary */}
        <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
          <h1 className={`${textPrimary} text-2xl font-bold`}>Title</h1>
          <p className={`${textSecondary} mt-2`}>Description</p>
        </div>

        {/* ✅ CORRECT: Inputs use bgSecondary */}
        <input
          className={`${bgSecondary} ${border} ${textPrimary} px-4 py-3 rounded-lg`}
          placeholder="Search..."
        />

        {/* ✅ CORRECT: Buttons use buttonPrimary */}
        <button className={`${buttonPrimary} px-6 py-3 rounded-lg`}>
          Save
        </button>

        {/* ✅ CORRECT: Table rows use border and cardHover */}
        <tr className={`border-t ${border} ${cardHover} transition-colors`}>
          <td className={`${textPrimary} px-6 py-4`}>Cell content</td>
        </tr>

      </div>
    </div>
  );
}
```

### ❌ INCORRECT Pattern (DO NOT USE)

```tsx
// ❌ DO NOT set bgPrimary on page container
export default function MyPage() {
  const { bgPrimary } = useThemeClasses(); // ❌ Don't even destructure it for pages

  return (
    <div className={`min-h-screen ${bgPrimary}`}>  {/* ❌ WRONG! */}
      <div className="container mx-auto">
        ...
      </div>
    </div>
  );
}
```

**Why is this wrong?**

The gradient/starfield backgrounds are managed by the root layout (`src/app/layout.tsx`). Setting `bgPrimary` on pages will:
- ✗ Block the gradient/starfield background
- ✗ Break theme consistency
- ✗ Prevent proper light mode gradients from showing
- ✗ Remove the spatial background (ThreeStars) in dark mode

---

## 📖 Complete Implementation Examples

### Example 1: Admin Page with Stats Cards

```tsx
"use client";

import { useThemeClasses, useTheme } from "@/app/contexts/ThemeContext";
import { BarChart, Users, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  const {
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
    shadow,
  } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className="min-h-screen py-12 px-4" data-page="admin-dashboard">
      <div className="max-w-7xl mx-auto">

        <h1 className={`text-4xl font-bold ${textPrimary} mb-8`}>
          Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stats Card 1 */}
          <div className={`${cardBg} ${cardBorder} ${shadow} rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <BarChart className={`w-8 h-8 ${isLight ? "text-blue-500" : "text-emerald-400"}`} />
            </div>
            <h3 className={`${textSecondary} text-sm mb-1`}>Total Users</h3>
            <p className={`text-3xl font-bold ${textPrimary}`}>1,234</p>
          </div>

          {/* Stats Card 2 */}
          <div className={`${cardBg} ${cardBorder} ${shadow} rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-green-500" />
            </div>
            <h3 className={`${textSecondary} text-sm mb-1`}>Active Now</h3>
            <p className={`text-3xl font-bold ${textPrimary}`}>567</p>
          </div>

          {/* Stats Card 3 */}
          <div className={`${cardBg} ${cardBorder} ${shadow} rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className={`${textSecondary} text-sm mb-1`}>Growth</h3>
            <p className={`text-3xl font-bold ${textPrimary}`}>+23%</p>
          </div>
        </div>

      </div>
    </div>
  );
}
```

### Example 2: Form with Filters

```tsx
"use client";

import { useThemeClasses, useTheme } from "@/app/contexts/ThemeContext";
import { Search } from "lucide-react";

export default function ArticlesPage() {
  const {
    cardBg,
    cardBorder,
    bgSecondary,
    border,
    textPrimary,
    textSecondary,
    textMuted,
    buttonPrimary,
  } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className="min-h-screen py-12 px-4" data-page="articles">
      <div className="max-w-7xl mx-auto">

        {/* Filters Card */}
        <div className={`${cardBg} ${cardBorder} rounded-xl p-6 mb-6`}>
          <form className="flex flex-col md:flex-row gap-4">

            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textMuted}`} />
              <input
                type="text"
                placeholder="Search articles..."
                className={`w-full pl-10 pr-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-${textMuted} focus:outline-none focus:border-${isLight ? "blue" : "emerald"}-500`}
              />
            </div>

            {/* Category Dropdown */}
            <select className={`px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary}`}>
              <option>All Categories</option>
              <option>Market Insights</option>
              <option>Real Estate Tips</option>
            </select>

            {/* Submit Button */}
            <button type="submit" className={`${buttonPrimary} px-6 py-3 rounded-lg`}>
              Search
            </button>

          </form>
        </div>

      </div>
    </div>
  );
}
```

### Example 3: Data Table

```tsx
"use client";

import { useThemeClasses, useTheme } from "@/app/contexts/ThemeContext";
import { Eye, Edit, Trash2 } from "lucide-react";

export default function DataTable() {
  const {
    cardBg,
    cardBorder,
    bgSecondary,
    border,
    cardHover,
    textPrimary,
    textSecondary,
  } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className="min-h-screen py-12 px-4" data-page="table">
      <div className="max-w-7xl mx-auto">

        {/* Table Container */}
        <div className={`${cardBg} ${cardBorder} rounded-xl overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">

              {/* Table Header */}
              <thead className={`${bgSecondary}/50`}>
                <tr>
                  <th className={`text-left text-sm font-semibold ${textSecondary} px-6 py-4`}>
                    Name
                  </th>
                  <th className={`text-left text-sm font-semibold ${textSecondary} px-6 py-4`}>
                    Status
                  </th>
                  <th className={`text-right text-sm font-semibold ${textSecondary} px-6 py-4`}>
                    Actions
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                <tr className={`border-t ${border} ${cardHover} transition-colors`}>
                  <td className="px-6 py-4">
                    <p className={`${textPrimary} font-medium`}>Article Title</p>
                    <p className={`text-sm ${textSecondary} mt-1`}>Subtitle here</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                      Published
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className={`p-2 rounded-lg transition-colors ${textSecondary} ${
                        isLight ? "hover:bg-gray-100 hover:text-gray-900" : "hover:bg-gray-700 hover:text-white"
                      }`}>
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className={`p-2 rounded-lg transition-colors ${textSecondary} ${
                        isLight ? "hover:bg-gray-100 hover:text-blue-600" : "hover:bg-gray-700 hover:text-blue-400"
                      }`}>
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className={`p-2 rounded-lg transition-colors ${textSecondary} ${
                        isLight ? "hover:bg-gray-100 hover:text-red-600" : "hover:bg-gray-700 hover:text-red-400"
                      }`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>

            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
```

### Example 4: Modal Dialog

```tsx
"use client";

import { useThemeClasses, useTheme } from "@/app/contexts/ThemeContext";
import { X } from "lucide-react";

export default function ModalExample() {
  const {
    cardBg,
    cardBorder,
    bgSecondary,
    border,
    textPrimary,
    textSecondary,
    buttonPrimary,
    buttonSecondary,
  } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Modal Overlay */}
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">

          {/* Modal Container */}
          <div className={`${cardBg} ${cardBorder} rounded-xl p-8 max-w-2xl w-full`}>

            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${textPrimary}`}>
                Modal Title
              </h2>
              <button className={`p-2 rounded-lg ${textSecondary} ${
                isLight ? "hover:bg-gray-100" : "hover:bg-gray-700"
              }`}>
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <p className={`${textSecondary} mb-6`}>
              This is the modal content. Notice how it uses cardBg for the modal background.
            </p>

            {/* Form Input */}
            <textarea
              rows={6}
              placeholder="Enter text..."
              className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none mb-6`}
            />

            {/* Modal Actions */}
            <div className="flex justify-end gap-3">
              <button className={`${buttonSecondary} px-6 py-3 rounded-lg font-semibold`}>
                Cancel
              </button>
              <button className={`${buttonPrimary} px-6 py-3 rounded-lg font-semibold`}>
                Confirm
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
```

---

## 🎨 Available Theme Classes Reference

### Background Classes
- **`cardBg`** - Card/container background (use for cards, modals, panels)
- **`bgSecondary`** - Secondary backgrounds (inputs, selects, textareas)
- **DON'T USE: `bgPrimary`** - Reserved for root layout only

### Text Classes
- **`textPrimary`** - Primary text (headings, important text)
- **`textSecondary`** - Secondary text (descriptions, labels)
- **`textMuted`** - Muted text (placeholders, disabled)

### Border Classes
- **`border`** - Standard border color
- **`cardBorder`** - Card border (use with cardBg)
- **`cardHover`** - Hover state for cards/rows

### Button Classes
- **`buttonPrimary`** - Primary action buttons
- **`buttonSecondary`** - Secondary/cancel buttons

### Effect Classes
- **`shadow`** - Box shadow
- **`shadowSm`** - Smaller box shadow

---

## 🔍 When to Use Conditional Logic

Use conditional `isLight` logic when theme classes don't cover your specific use case:

```tsx
const { currentTheme } = useTheme();
const { textPrimary, cardBg } = useThemeClasses();
const isLight = currentTheme === "lightgradient";

// ✅ Use for accent colors not covered by theme classes
<button className={`px-4 py-2 rounded-lg ${
  isLight
    ? "bg-blue-600 hover:bg-blue-700 text-white"  // Light mode: blue
    : "bg-emerald-600 hover:bg-emerald-700 text-white"  // Dark mode: emerald
}`}>
  Custom Accent Button
</button>

// ✅ Use for icon colors
<Icon className={`w-6 h-6 ${isLight ? "text-blue-500" : "text-emerald-400"}`} />

// ✅ Use for hover states with specific colors
<button className={`p-2 rounded-lg ${textSecondary} ${
  isLight
    ? "hover:bg-gray-100 hover:text-red-600"  // Light: gray bg, red text
    : "hover:bg-gray-700 hover:text-red-400"  // Dark: darker bg, lighter red
}`}>
  <Trash2 className="w-4 h-4" />
</button>
```

---

## ✅ Quick Checklist

Before submitting code, verify:

- [ ] Page container uses `className="min-h-screen py-12 px-4"` (NO `bgPrimary`)
- [ ] Inner container uses `className="max-w-7xl mx-auto"` (NOT `container mx-auto`)
- [ ] Cards use `${cardBg} ${cardBorder}`
- [ ] Text uses `${textPrimary}`, `${textSecondary}`, or `${textMuted}`
- [ ] Inputs use `${bgSecondary} ${border}`
- [ ] Buttons use `${buttonPrimary}` or `${buttonSecondary}`
- [ ] Table rows use `${border} ${cardHover}`
- [ ] Modals use `${cardBg} ${cardBorder}`
- [ ] Icons use conditional `${isLight ? "text-blue-500" : "text-emerald-400"}`

---

## 📚 Reference Implementation

See these files for perfect examples:
- `/src/app/dashboard/page.tsx` - Main dashboard (REFERENCE IMPLEMENTATION)
- `/src/app/admin/articles/page.tsx` - Admin articles page with table
- `/src/app/admin/[articleId]/page.tsx` - Article editor with form

**Last Updated:** January 29, 2025

## 🎨 Theme Color Swap Rule

**CRITICAL COLOR CONVENTION:**

**Emerald ↔ Blue Color Swap Between Themes**

- **Dark Mode (blackspace):** Primary accent is **EMERALD** (`emerald-500`, `emerald-600`)
- **Light Mode (lightgradient):** Primary accent is **BLUE** (`blue-500`, `blue-600`)

**Rule:** Anything that is emerald/green in dark mode should be blue in light mode, and vice versa.

### Examples:

```tsx
// ✅ CORRECT: Primary action buttons
<button className={`px-6 py-3 ${
  isLight 
    ? "bg-blue-600 hover:bg-blue-700"      // Light mode: Blue
    : "bg-emerald-600 hover:bg-emerald-700" // Dark mode: Emerald
} text-white rounded-lg`}>
  Save
</button>

// ✅ CORRECT: Icons with primary accent
<TrendingUp className={`w-6 h-6 ${
  isLight ? "text-blue-500" : "text-emerald-400"
}`} />

// ✅ CORRECT: Borders and accents
<div className={`border-2 ${
  isLight ? "border-blue-500" : "border-emerald-500"
}`}>
  Content
</div>
```

### Status Badge Colors (Consistent Across Themes)

Some colors should remain consistent across both themes:

```tsx
// ✅ Published status: ALWAYS BLUE (both themes)
<span className="bg-blue-500/20 text-blue-400">Published</span>

// ✅ Draft status: ALWAYS RED (both themes)
<span className="bg-red-500/20 text-red-400">Draft</span>

// ✅ Success states: ALWAYS GREEN (both themes)
<span className="bg-green-500/20 text-green-400">Success</span>

// ✅ Warning states: ALWAYS YELLOW (both themes)
<span className="bg-yellow-500/20 text-yellow-400">Warning</span>
```

### Special Cases

**Purple** is reserved for special features (like VPS/AI integrations):
- Light mode: Use emerald or blue (depending on context)
- Dark mode: Purple is acceptable for distinctive features

```tsx
// ✅ Special AI/VPS features can use purple in dark mode
<button className={`${
  isLight
    ? "bg-emerald-600 hover:bg-emerald-700"  // Light: emerald (special)
    : "bg-purple-600 hover:bg-purple-700"     // Dark: purple (special)
} text-white`}>
</button>
```

