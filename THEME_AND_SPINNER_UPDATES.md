# Theme and Spinner Updates - Implementation Guide

## 1. PageTransition.tsx - Full Overlay Spinner

**File**: `src/app/components/PageTransition.tsx`

### Changes Needed:

Replace the return statement (lines 49-84) with:

```tsx
  return (
    <>
      {/* Globe Loader Overlay - Full screen overlay that covers everything */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999]"
          >
            <GlobeLoader text="Loading page..." subtext="Just a moment" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Content - Only animate in AFTER loader completes */}
      <AnimatePresence mode="wait" initial={false}>
        {!isLoading && (
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{
              duration: 0.4,
              ease: "easeOut",
              delay: 0.1
            }}
            className="w-full h-full"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
```

**Key Changes**:
- Added `fixed inset-0 z-[9999]` to loader container for true full-screen overlay
- Content now only renders when `!isLoading` to prevent showing content behind spinner
- Increased animation duration to 0.4s with 0.1s delay for smoother entry

---

## 2. CategoryPageClient.tsx - Theme Support

**File**: `src/app/insights/[category]/CategoryPageClient.tsx`

### Import Changes (line 8):
```tsx
import { useTheme } from "@/app/contexts/ThemeContext";
```

### Component Changes:

Add after line 25 (inside component):
```tsx
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
```

### Replace entire return statement (lines 26-81) with:

```tsx
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <Link
            href="/insights"
            className={`inline-flex items-center gap-2 transition-colors ${
              isLight
                ? 'text-gray-600 hover:text-gray-900'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Insights</span>
          </Link>
        </motion.div>

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12"
        >
          <div className={`flex items-center gap-2 mb-4 ${
            isLight ? 'text-gray-600' : 'text-gray-400'
          }`}>
            <BookOpen className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider">Category</span>
          </div>
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 drop-shadow-2xl ${
            isLight ? 'text-gray-900' : 'text-white'
          }`}>
            {categoriesPageContent.title(formattedCategory)}
          </h1>
          <p className={`text-xl max-w-3xl leading-relaxed ${
            isLight ? 'text-gray-700' : 'text-gray-300'
          }`}>
            {categoriesPageContent.description(formattedCategory)}
          </p>
        </motion.div>

        {/* Articles List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`rounded-2xl p-6 md:p-8 ${
            isLight
              ? 'bg-white/80 backdrop-blur-sm border border-gray-300 shadow-md'
              : 'bg-gray-900/50 backdrop-blur-sm border border-gray-800'
          }`}
          style={isLight ? {
            backdropFilter: "blur(10px) saturate(150%)",
            WebkitBackdropFilter: "blur(10px) saturate(150%)",
          } : {}}
        >
          <InsightsList
            posts={posts}
            totalPages={totalPages}
            currentPage={currentPage}
            category={category}
          />
        </motion.div>
      </div>
    </div>
  );
```

---

## 3. ArticlePageClient.tsx - Theme Support

**File**: `src/app/insights/[category]/[slugId]/ArticlePageClient.tsx`

### Import Changes (line 9):
```tsx
import { useTheme } from "@/app/contexts/ThemeContext";
```

### Component Changes:

Add after line 17 (inside component):
```tsx
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
```

### Replace entire return statement (lines 18-122) with:

```tsx
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <Link
            href={`/insights/${category}`}
            className={`inline-flex items-center gap-2 transition-colors ${
              isLight
                ? 'text-gray-600 hover:text-gray-900'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {category.replace("-", " ")}</span>
          </Link>
        </motion.div>

        {/* Article Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8"
        >
          <div className={`flex items-center gap-2 mb-4 ${
            isLight ? 'text-gray-600' : 'text-gray-400'
          }`}>
            <BookOpen className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider">Article</span>
          </div>
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 drop-shadow-2xl ${
            isLight ? 'text-gray-900' : 'text-white'
          }`}>
            {post.title || "Untitled Post"}
          </h1>
          <div className={`flex items-center gap-2 ${
            isLight ? 'text-gray-600' : 'text-gray-400'
          }`}>
            <Calendar className="w-4 h-4" />
            <span className="text-sm">
              Published on {new Date(post.date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </motion.div>

        {/* Featured Image */}
        {post.image && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`mb-12 rounded-2xl overflow-hidden border ${
              isLight ? 'border-gray-300' : 'border-gray-800'
            }`}
          >
            <div className="relative w-full h-[400px]">
              <Image
                src={post.image}
                alt={post.altText || post.title || "Article image"}
                fill
                className="object-cover"
                priority
              />
            </div>
          </motion.div>
        )}

        {/* Article Content */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className={`rounded-2xl p-6 md:p-12 mb-12 ${
            isLight
              ? 'bg-white/80 backdrop-blur-sm border border-gray-300 shadow-md'
              : 'bg-gray-900/50 backdrop-blur-sm border border-gray-800'
          }`}
          style={isLight ? {
            backdropFilter: "blur(10px) saturate(150%)",
            WebkitBackdropFilter: "blur(10px) saturate(150%)",
          } : {}}
        >
          <div className={`max-w-none ${
            isLight
              ? `prose prose-lg
                 prose-headings:text-gray-900
                 prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-6
                 prose-h2:text-3xl prose-h2:font-bold prose-h2:mb-4 prose-h2:mt-8
                 prose-h3:text-2xl prose-h3:font-semibold prose-h3:mb-3 prose-h3:mt-6
                 prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
                 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:text-blue-700 hover:prose-a:underline
                 prose-strong:text-gray-900 prose-strong:font-semibold
                 prose-ul:text-gray-700 prose-ul:my-6
                 prose-ol:text-gray-700 prose-ol:my-6
                 prose-li:my-2
                 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600
                 prose-code:text-blue-600 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                 prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-300 prose-pre:rounded-xl
                 prose-img:rounded-xl prose-img:border prose-img:border-gray-300
                 prose-hr:border-gray-300 prose-hr:my-8`
              : `prose prose-invert prose-lg
                 prose-headings:text-white
                 prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-6
                 prose-h2:text-3xl prose-h2:font-bold prose-h2:mb-4 prose-h2:mt-8
                 prose-h3:text-2xl prose-h3:font-semibold prose-h3:mb-3 prose-h3:mt-6
                 prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4
                 prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:text-emerald-300 hover:prose-a:underline
                 prose-strong:text-white prose-strong:font-semibold
                 prose-ul:text-gray-300 prose-ul:my-6
                 prose-ol:text-gray-300 prose-ol:my-6
                 prose-li:my-2
                 prose-blockquote:border-l-4 prose-blockquote:border-emerald-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-400
                 prose-code:text-emerald-400 prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                 prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700 prose-pre:rounded-xl
                 prose-img:rounded-xl prose-img:border prose-img:border-gray-700
                 prose-hr:border-gray-700 prose-hr:my-8`
          }`}>
            {mdxContent}
          </div>
        </motion.article>

        {/* Call-to-Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Contact />
        </motion.div>
      </div>
    </div>
  );
```

---

## 4. IntegratedChatWidget.tsx - Fix Centering

**File**: `src/app/components/chatwidget/IntegratedChatWidget.tsx`

### Line 1384 Change:
```tsx
// OLD:
<div className="absolute inset-0 flex items-center justify-center z-10 px-4 pb-48 md:pb-0">

// NEW:
<div className="absolute inset-0 flex items-center justify-center z-10 px-4">
```

### Line 1395 Change:
```tsx
// OLD:
className="w-full max-w-[90%] md:max-w-4xl flex flex-col items-center gap-6 md:gap-8"

// NEW:
className="w-full max-w-2xl md:max-w-4xl flex flex-col items-center gap-6 md:gap-8"
```

**Explanation**:
- Removed `pb-48` (192px bottom padding) that was pushing content way up on mobile
- Changed `max-w-[90%]` to `max-w-2xl` for better centering on 13-inch displays

---

## Summary of Changes

1. **PageTransition**: Full overlay spinner that blocks content until animation completes
2. **CategoryPageClient**: Full theme support with glassmorphism in light mode
3. **ArticlePageClient**: Full theme support with conditional prose styling
4. **IntegratedChatWidget**: Fixed centering issues on mobile and small displays

## Theme Colors Reference

### Light Mode
- Backgrounds: `white/80`, `gray-50`, `gray-100`
- Borders: `gray-300`, `gray-200`
- Text Primary: `gray-900`
- Text Secondary: `gray-700`
- Text Muted: `gray-600`
- Accents: `blue-600`, `blue-500`

### Dark Mode
- Backgrounds: `gray-900`, `black`
- Borders: `gray-800`, `gray-700`
- Text Primary: `white`
- Text Secondary: `gray-300`
- Text Muted: `gray-400`
- Accents: `emerald-400`, `emerald-500`
