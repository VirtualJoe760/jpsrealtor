# Complete MDX Editor & Article Management Architecture

**Last Updated:** 2025-11-30
**Status:** 🔴 Critical - Full System Redesign Required

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current System Problems](#current-system-problems)
3. [Proposed Complete Architecture](#proposed-complete-architecture)
4. [Article Lifecycle](#article-lifecycle)
5. [AI Regeneration System](#ai-regeneration-system)
6. [Edit Flow Architecture](#edit-flow-architecture)
7. [Publishing & Preview System](#publishing--preview-system)
8. [File-Based Publishing System](#file-based-publishing-system)
9. [Implementation Plan](#implementation-plan)

---

## Executive Summary

### Scope Expansion

The original MDX deep dive identified 5 critical issues with the editor. This expanded analysis adds:

- **Article Edit Flow** - Load, edit, and update existing articles
- **AI Field Regeneration** - Per-field AI buttons for title, excerpt, content, etc.
- **Publishing Pipeline** - Draft → Review → Publish workflow
- **Preview System** - Real-time article preview with theme support

### Critical Issues (Updated)

| # | Issue | Impact | Status |
|---|-------|--------|--------|
| 1 | No MDX digestion layer | Critical | 🔴 Unresolved |
| 2 | Broken HTML/MDX converter | Critical | 🔴 Unresolved |
| 3 | TipTap toolbar buttons fail | High | 🔴 Unresolved |
| 4 | Race conditions in state | High | 🔴 Unresolved |
| 5 | No bidirectional validation | High | 🔴 Unresolved |
| 6 | **Edit page rendering broken** | Critical | 🔴 NEW |
| 7 | **No per-field AI regeneration** | Medium | 🔴 NEW |
| 8 | **Publishing flow incomplete** | Medium | 🟡 Partial |

---

## Current System Problems

### Problem 6: Edit Page Rendering Broken

**File:** `src/app/admin/articles/[id]/page.tsx`

#### Current Flow
```typescript
// 1. Fetch article from API
const data = await fetch(`/api/articles/${articleId}`);

// 2. Set form data
setFormData({
  content: data.content,  // ❌ This is stored as MDX in DB
});

// 3. Pass to TipTap Editor
<TipTapEditor content={formData.content} onChange={...} />
  ↓
// 4. TipTap tries to convert MDX → HTML
useEffect(() => {
  const html = await mdxToHtml(content);  // ❌ BROKEN CONVERTER
  setHtmlContent(html);
}, [content]);
```

#### Why It Fails

1. **Stored MDX might be corrupted** - If article was previously saved through broken converter, MDX in database is malformed
2. **Converter can't handle complex structures** - Regex-based converter fails on nested formatting
3. **No error handling** - If conversion fails, editor shows blank or crashes

**Example:**

Article stored in DB:
```markdown
## Heading

Text with **bold *italic* together**.

- ✅ List item
```

After broken round-trip, stored as:
```markdown
## Heading

Text with ***bold italic together***.

-  List item
```

On edit page load → Converter fails → Blank editor

### Problem 7: No Per-Field AI Regeneration

**What's Missing:**

Users want to regenerate individual fields without regenerating the entire article:

```
┌─────────────────────────────────────────┐
│ Title: [                  ] [🤖 Regen] │ ← Click to regenerate just title
│ Excerpt: [                ] [🤖 Regen] │ ← Click to regenerate just excerpt
│ Content: [TipTap Editor   ] [🤖 Regen] │ ← Click to regenerate just content
│ SEO Title: [              ] [🤖 Regen] │ ← Click to regenerate SEO fields
└─────────────────────────────────────────┘
```

**Current State:**
- ✅ Can generate full article with AI (`handleGenerate`)
- ❌ Cannot regenerate individual fields
- ❌ No AI context about existing article when regenerating
- ❌ No prompt modal for user instructions

---

## Proposed Complete Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    ARTICLE MANAGEMENT SYSTEM                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐             │
│  │   CREATE   │   │    EDIT    │   │  PUBLISH   │             │
│  │  New Flow  │──▶│  Edit Flow │──▶│   Review   │             │
│  └────────────┘   └────────────┘   └────────────┘             │
│        │                 │                 │                     │
│        └─────────────────┴─────────────────┘                     │
│                          │                                       │
│                          ▼                                       │
│              ┌───────────────────────┐                          │
│              │  CORE ENGINE LAYERS   │                          │
│              ├───────────────────────┤                          │
│              │ 1. AI Response        │                          │
│              │    Processor          │                          │
│              ├───────────────────────┤                          │
│              │ 2. MDX Processor      │                          │
│              ├───────────────────────┤                          │
│              │ 3. Editor State       │                          │
│              │    Manager            │                          │
│              ├───────────────────────┤                          │
│              │ 4. Field Regeneration │ ← NEW                    │
│              │    Service            │                          │
│              ├───────────────────────┤                          │
│              │ 5. Publishing         │ ← NEW                    │
│              │    Pipeline           │                          │
│              └───────────────────────┘                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Article Lifecycle

### Complete Article Journey

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: CREATION                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ User: "Generate article about Coachella Valley market"         │
│    ↓                                                            │
│ AI generates full article (title, excerpt, content, SEO)       │
│    ↓                                                            │
│ ✅ LAYER 1: Digest & validate AI response                      │
│    ↓                                                            │
│ ✅ LAYER 2: Process MDX → HTML for editor                      │
│    ↓                                                            │
│ ✅ LAYER 3: Load into editor state manager                     │
│    ↓                                                            │
│ User edits in TipTap (toolbar buttons work!)                   │
│    ↓                                                            │
│ User clicks "Regenerate Title" → Modal opens                   │
│    ↓                                                            │
│ ✅ LAYER 4: Field regeneration with AI                         │
│    ↓                                                            │
│ User clicks "Save Draft"                                        │
│    ↓                                                            │
│ Article saved to MongoDB (status: "draft")                     │
│                                                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: EDITING                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ User clicks "Edit" from articles list                          │
│    ↓                                                            │
│ Fetch article from MongoDB                                     │
│    ↓                                                            │
│ ✅ LAYER 2: Process stored MDX → HTML                          │
│    ↓                                                            │
│ ⚠️  VALIDATE: Check for corrupted MDX                          │
│    ↓ (if corrupted, show recovery modal)                       │
│ ✅ LAYER 3: Load into editor state manager                     │
│    ↓                                                            │
│ User edits content                                              │
│    ↓                                                            │
│ User clicks "Regenerate Excerpt" → Modal opens                 │
│    ↓                                                            │
│ ✅ LAYER 4: Regenerate with context of existing article        │
│    ↓                                                            │
│ User clicks "Save Draft" or "Publish"                          │
│    ↓                                                            │
│ ✅ LAYER 5: Validate before publish                            │
│    ↓                                                            │
│ Update MongoDB                                                  │
│                                                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: PUBLISHING                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ User clicks "Preview" → Opens preview in new tab               │
│    ↓                                                            │
│ ✅ Render article with theme (light/dark)                      │
│    ↓                                                            │
│ User clicks "Publish Now"                                       │
│    ↓                                                            │
│ ✅ LAYER 5: Pre-publish validation checklist:                  │
│   - Title length < 200 chars                                   │
│   - Excerpt length < 300 chars                                 │
│   - SEO title < 60 chars                                       │
│   - SEO description < 160 chars                                │
│   - Featured image uploaded                                    │
│   - At least 1 tag                                             │
│   - Content > 500 words                                        │
│    ↓                                                            │
│ ✅ Set status: "published"                                     │
│ ✅ Set publishedAt: Date.now()                                 │
│ ✅ Generate RSS feed entry                                     │
│ ✅ Create sitemap entry                                        │
│    ↓                                                            │
│ Article live at /insights/{category}/{slugId}                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## AI Regeneration System

### Layer 4: Field Regeneration Service

**File:** `src/lib/field-regenerator.ts`

```typescript
export type RegenerableField =
  | 'title'
  | 'excerpt'
  | 'content'
  | 'seoTitle'
  | 'seoDescription'
  | 'all';

export interface RegenerationContext {
  field: RegenerableField;
  currentValue: string;
  articleContext: {
    title?: string;
    excerpt?: string;
    content?: string;
    category: string;
    keywords: string[];
  };
  userPrompt: string;
}

export interface RegenerationResult {
  field: RegenerableField;
  newValue: string;
  confidence: number;
  reasoning: string;
}

/**
 * Regenerate a specific field using AI
 * Maintains context of existing article
 */
export async function regenerateField(
  context: RegenerationContext
): Promise<RegenerationResult> {

  const systemPrompt = buildSystemPrompt(context.field);
  const userPrompt = buildUserPrompt(context);

  const response = await createChatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    model: GROQ_MODELS.PREMIUM,
    temperature: 0.7,
    tools: [buildToolForField(context.field)],
  });

  return parseRegenerationResponse(response);
}
```

### UI Component: Regeneration Button

**File:** `src/app/components/RegenerateButton.tsx`

```typescript
interface RegenerateButtonProps {
  field: RegenerableField;
  currentValue: string;
  articleContext: ArticleContext;
  onRegenerate: (newValue: string) => void;
  isLight: boolean;
}

export function RegenerateButton({
  field,
  currentValue,
  articleContext,
  onRegenerate,
  isLight,
}: RegenerateButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setIsRegenerating(true);

    try {
      const result = await regenerateField({
        field,
        currentValue,
        articleContext,
        userPrompt,
      });

      onRegenerate(result.newValue);
      setShowModal(false);
      setUserPrompt('');
    } catch (error) {
      alert('Failed to regenerate. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`p-2 rounded transition-colors ${
          isLight
            ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
        }`}
        title={`Regenerate ${field} with AI`}
      >
        <Sparkles className="w-4 h-4" />
      </button>

      {showModal && (
        <RegenerateModal
          field={field}
          currentValue={currentValue}
          userPrompt={userPrompt}
          setUserPrompt={setUserPrompt}
          isRegenerating={isRegenerating}
          onConfirm={handleRegenerate}
          onCancel={() => setShowModal(false)}
          isLight={isLight}
        />
      )}
    </>
  );
}
```

### Regeneration Modal Component

```typescript
function RegenerateModal({
  field,
  currentValue,
  userPrompt,
  setUserPrompt,
  isRegenerating,
  onConfirm,
  onCancel,
  isLight,
}: RegenerateModalProps) {
  const fieldLabels = {
    title: 'Title',
    excerpt: 'Excerpt',
    content: 'Content',
    seoTitle: 'SEO Title',
    seoDescription: 'SEO Description',
    all: 'Entire Article',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`${isLight ? 'bg-white' : 'bg-gray-900'} rounded-xl p-6 max-w-2xl w-full mx-4`}>
        <h2 className={`text-2xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
          <Sparkles className="inline w-6 h-6 mr-2" />
          Regenerate {fieldLabels[field]}
        </h2>

        {/* Show current value */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
            Current {fieldLabels[field]}:
          </label>
          <div className={`p-3 rounded border ${isLight ? 'bg-gray-50 border-gray-300' : 'bg-gray-800 border-gray-700'}`}>
            <p className={`${isLight ? 'text-gray-800' : 'text-gray-200'} text-sm`}>
              {currentValue || `No ${fieldLabels[field].toLowerCase()} yet`}
            </p>
          </div>
        </div>

        {/* User instructions */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
            Instructions for AI (optional):
          </label>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder={`e.g., "Make it more engaging" or "Focus on investment opportunities" or leave blank for AI to improve automatically`}
            className={`w-full p-3 rounded border ${
              isLight
                ? 'bg-white border-gray-300 text-gray-900'
                : 'bg-gray-800 border-gray-700 text-white'
            } focus:ring-2 focus:ring-blue-500`}
            rows={3}
          />
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isRegenerating}
            className={`px-4 py-2 rounded transition-colors ${
              isLight
                ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isRegenerating}
            className={`px-4 py-2 rounded transition-colors flex items-center gap-2 ${
              isLight
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isRegenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Regenerate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Field-Specific System Prompts

```typescript
function buildSystemPrompt(field: RegenerableField): string {
  const prompts = {
    title: `You are an expert headline writer for real estate articles.

Generate compelling, SEO-optimized titles that:
- Are 50-200 characters long
- Include location keywords (Coachella Valley, Palm Desert, etc.)
- Use action-oriented language
- Create curiosity without clickbait
- Follow AP style capitalization

Examples:
✅ "Why Coachella Valley Real Estate is Booming in 2025"
✅ "Palm Desert Investment Opportunities: A Complete Guide"
❌ "You Won't Believe These Real Estate Secrets!" (too clickbaity)
❌ "real estate market trends" (not capitalized, boring)`,

    excerpt: `You are an expert at writing compelling article excerpts.

Generate excerpts that:
- Are 150-300 characters long
- Summarize the article's main value
- Include a call-to-action or benefit
- Use active voice
- Avoid redundancy with the title

Example:
"Discover the latest market trends, investment hotspots, and expert insights for buying or selling property in the Coachella Valley. Your guide to making smart real estate decisions in 2025."`,

    content: `You are an expert real estate content writer for jpsrealtor.com.

[Same as current system prompt in generate/route.ts]
- Professional yet conversational
- NO bold text overuse
- Proper MDX formatting
- Include contact info at end`,

    seoTitle: `Generate SEO meta titles that:
- Are 50-60 characters (strict limit)
- Include primary keyword first
- Avoid filler words
- Create urgency or value proposition

Example:
"Coachella Valley Real Estate Guide 2025 | JPSRealtor"`,

    seoDescription: `Generate SEO meta descriptions that:
- Are 150-160 characters (strict limit)
- Include primary and secondary keywords naturally
- Have a clear call-to-action
- Avoid special characters that break SERP display

Example:
"Expert insights on Coachella Valley real estate. Find investment opportunities, market trends, and local expertise. Contact Joseph Sardella today!"`,
  };

  return prompts[field] || prompts.content;
}
```

---

## Edit Flow Architecture

### Updated Edit Page Structure

**File:** `src/app/admin/articles/[id]/page.tsx`

```typescript
export default function EditArticlePage() {
  // ... existing state ...

  // NEW: Track which field is being regenerated
  const [regeneratingField, setRegeneratingField] = useState<RegenerableField | null>(null);

  // IMPROVED: Load article with error handling
  const fetchArticle = async () => {
    try {
      setIsLoadingArticle(true);
      const response = await fetch(`/api/articles/${articleId}`);

      if (!response.ok) throw new Error("Article not found");

      const data = await response.json();

      // ✅ NEW: Validate MDX before loading
      const validationResult = await validateMDX(data.content);

      if (!validationResult.isValid) {
        // Show recovery modal
        setShowRecoveryModal(true);
        setRecoveryErrors(validationResult.errors);
        return;
      }

      // ✅ NEW: Process MDX through Layer 2
      const processed = await processMDXForEditor(data.content);

      setFormData({
        title: data.title || "",
        excerpt: data.excerpt || "",
        content: processed.mdx,  // ← Cleaned MDX
        // ... rest of fields
      });

    } catch (error) {
      console.error("Failed to fetch article:", error);
      alert("Failed to load article");
      router.push("/admin/articles");
    } finally {
      setIsLoadingArticle(false);
    }
  };

  // NEW: Handle field regeneration
  const handleFieldRegenerate = async (
    field: RegenerableField,
    newValue: string
  ) => {
    setFormData(prev => {
      switch (field) {
        case 'title':
          return { ...prev, title: newValue };
        case 'excerpt':
          return { ...prev, excerpt: newValue };
        case 'content':
          return { ...prev, content: newValue };
        case 'seoTitle':
          return { ...prev, seo: { ...prev.seo, title: newValue } };
        case 'seoDescription':
          return { ...prev, seo: { ...prev.seo, description: newValue } };
        default:
          return prev;
      }
    });
  };

  // IMPROVED: Save with validation
  const handleSave = async (publish: boolean = false) => {
    setIsSaving(true);

    try {
      // ✅ Validate before saving
      if (publish) {
        const validation = await validateForPublish(formData);
        if (!validation.isValid) {
          alert(`Cannot publish:\n${validation.errors.join('\n')}`);
          return;
        }
      }

      const articleData = {
        ...formData,
        status: publish ? "published" : formData.status,
        publishedAt: publish ? new Date().toISOString() : undefined,
      };

      const response = await fetch(`/api/articles/${articleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(articleData),
      });

      if (!response.ok) throw new Error("Failed to save");

      alert(publish ? "Article published!" : "Article saved!");
      router.push("/admin/articles");
    } catch (error) {
      alert("Failed to save article");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* ... Header ... */}

        {/* Title with Regenerate Button */}
        <div className="mb-6">
          <label className={`block mb-2 font-semibold ${textPrimary}`}>
            Title
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={`flex-1 p-3 rounded border ${cardBg} ${cardBorder}`}
              placeholder="Enter article title..."
            />
            <RegenerateButton
              field="title"
              currentValue={formData.title}
              articleContext={{
                excerpt: formData.excerpt,
                content: formData.content,
                category: formData.category,
                keywords: formData.seo.keywords,
              }}
              onRegenerate={(newValue) => handleFieldRegenerate('title', newValue)}
              isLight={isLight}
            />
          </div>
        </div>

        {/* Excerpt with Regenerate Button */}
        <div className="mb-6">
          <label className={`block mb-2 font-semibold ${textPrimary}`}>
            Excerpt
          </label>
          <div className="flex gap-2">
            <textarea
              value={formData.excerpt}
              onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
              className={`flex-1 p-3 rounded border ${cardBg} ${cardBorder}`}
              rows={3}
              placeholder="Enter article excerpt..."
            />
            <RegenerateButton
              field="excerpt"
              currentValue={formData.excerpt}
              articleContext={{
                title: formData.title,
                content: formData.content,
                category: formData.category,
                keywords: formData.seo.keywords,
              }}
              onRegenerate={(newValue) => handleFieldRegenerate('excerpt', newValue)}
              isLight={isLight}
            />
          </div>
        </div>

        {/* Content with Regenerate Button */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className={`font-semibold ${textPrimary}`}>
              Content
            </label>
            <RegenerateButton
              field="content"
              currentValue={formData.content}
              articleContext={{
                title: formData.title,
                excerpt: formData.excerpt,
                category: formData.category,
                keywords: formData.seo.keywords,
              }}
              onRegenerate={(newValue) => handleFieldRegenerate('content', newValue)}
              isLight={isLight}
            />
          </div>
          <TipTapEditor
            content={formData.content}
            onChange={(mdx) => setFormData(prev => ({ ...prev, content: mdx }))}
            isLight={isLight}
          />
        </div>

        {/* SEO Fields with Regenerate Buttons */}
        <div className="mb-6">
          <h3 className={`text-lg font-semibold mb-4 ${textPrimary}`}>
            SEO Settings
          </h3>

          <div className="mb-4">
            <label className={`block mb-2 ${textSecondary}`}>
              SEO Title ({formData.seo.title.length}/60 chars)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.seo.title}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  seo: { ...prev.seo, title: e.target.value.slice(0, 60) }
                }))}
                className={`flex-1 p-3 rounded border ${cardBg} ${cardBorder}`}
                maxLength={60}
              />
              <RegenerateButton
                field="seoTitle"
                currentValue={formData.seo.title}
                articleContext={{
                  title: formData.title,
                  excerpt: formData.excerpt,
                  category: formData.category,
                  keywords: formData.seo.keywords,
                }}
                onRegenerate={(newValue) => handleFieldRegenerate('seoTitle', newValue)}
                isLight={isLight}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className={`block mb-2 ${textSecondary}`}>
              SEO Description ({formData.seo.description.length}/160 chars)
            </label>
            <div className="flex gap-2">
              <textarea
                value={formData.seo.description}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  seo: { ...prev.seo, description: e.target.value.slice(0, 160) }
                }))}
                className={`flex-1 p-3 rounded border ${cardBg} ${cardBorder}`}
                rows={2}
                maxLength={160}
              />
              <RegenerateButton
                field="seoDescription"
                currentValue={formData.seo.description}
                articleContext={{
                  title: formData.title,
                  excerpt: formData.excerpt,
                  category: formData.category,
                  keywords: formData.seo.keywords,
                }}
                onRegenerate={(newValue) => handleFieldRegenerate('seoDescription', newValue)}
                isLight={isLight}
              />
            </div>
          </div>
        </div>

        {/* Save Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className={`px-6 py-3 rounded ${buttonSecondary}`}
          >
            <Save className="inline w-5 h-5 mr-2" />
            Save Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className={`px-6 py-3 rounded ${buttonPrimary}`}
          >
            <Monitor className="inline w-5 h-5 mr-2" />
            Publish Now
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Publishing & Preview System

### Layer 5: Publishing Pipeline

**File:** `src/lib/publishing-pipeline.ts`

```typescript
import fs from 'fs/promises';
import path from 'path';

export interface PublishValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateForPublish(
  article: ArticleFormData
): Promise<PublishValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!article.title || article.title.length < 10) {
    errors.push("Title must be at least 10 characters");
  }
  if (article.title.length > 200) {
    errors.push("Title must be less than 200 characters");
  }

  if (!article.excerpt || article.excerpt.length < 50) {
    errors.push("Excerpt must be at least 50 characters");
  }
  if (article.excerpt.length > 300) {
    errors.push("Excerpt must be less than 300 characters");
  }

  if (!article.content || article.content.length < 500) {
    errors.push("Content must be at least 500 characters (~100 words)");
  }

  if (!article.featuredImage?.url) {
    errors.push("Featured image is required");
  }

  if (!article.tags || article.tags.length === 0) {
    errors.push("At least one tag is required");
  }

  // SEO validation
  if (!article.seo.title) {
    warnings.push("SEO title is empty (will use article title)");
  }
  if (article.seo.title.length > 60) {
    errors.push("SEO title must be less than 60 characters");
  }

  if (!article.seo.description) {
    warnings.push("SEO description is empty (will use excerpt)");
  }
  if (article.seo.description.length > 160) {
    errors.push("SEO description must be less than 160 characters");
  }

  if (article.seo.keywords.length < 3) {
    warnings.push("Add at least 3 keywords for better SEO");
  }

  // MDX validation
  const mdxValidation = await validateMDX(article.content);
  if (!mdxValidation.isValid) {
    errors.push(...mdxValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Publish article by writing MDX file to filesystem
 * Articles are stored in src/posts/ directory, NOT MongoDB
 */
export async function publishArticle(
  article: ArticleFormData,
  slugId: string
): Promise<void> {
  // Validate before publishing
  const validation = await validateForPublish(article);
  if (!validation.isValid) {
    throw new Error(`Cannot publish: ${validation.errors.join(', ')}`);
  }

  // Write MDX file to filesystem
  await writeArticleToFilesystem(article, slugId);

  // Update MongoDB status (for CMS tracking only)
  await updateArticleStatus(slugId, 'published');
}

/**
 * Write article as MDX file to src/posts/ directory
 * This is how articles get "posted" to the insights page
 */
export async function writeArticleToFilesystem(
  article: ArticleFormData,
  slugId: string
): Promise<void> {
  // Format frontmatter to match existing structure
  const frontmatter = formatFrontmatter(article, slugId);

  // Combine frontmatter + content
  const fullContent = `---
${frontmatter}
---

${article.content}`;

  // Define file path: src/posts/{slugId}.mdx
  const postsDirectory = path.join(process.cwd(), 'src/posts');
  const filePath = path.join(postsDirectory, `${slugId}.mdx`);

  // Check if file already exists
  try {
    await fs.access(filePath);
    // File exists - we're updating
    console.log(`Updating existing article: ${slugId}.mdx`);
  } catch {
    // File doesn't exist - we're creating new
    console.log(`Creating new article: ${slugId}.mdx`);
  }

  // Ensure directory exists
  await fs.mkdir(postsDirectory, { recursive: true });

  // Write file
  await fs.writeFile(filePath, fullContent, 'utf-8');

  console.log(`✅ Article published to: ${filePath}`);
}

/**
 * Format article data into YAML frontmatter
 * Matches structure from existing posts like coachella-valley-energy-costs.mdx
 */
function formatFrontmatter(article: ArticleFormData, slugId: string): string {
  const now = new Date();
  const date = now.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  }); // Format: MM/DD/YYYY

  // Build frontmatter YAML
  const lines = [
    `title: "${escapeYAML(article.title)}"`,
    `slugId: "${slugId}"`,
    `date: "${date}"`,
    `section: "${article.category}"`, // category → section mapping
    `image: "${article.featuredImage.url}"`,
    `metaTitle: "${escapeYAML(article.seo.title || article.title)}"`,
    `metaDescription: "${escapeYAML(article.seo.description || article.excerpt)}"`,
    `ogImage: "${article.featuredImage.url}"`,
    `altText: "${escapeYAML(article.featuredImage.alt || article.title)}"`,
    `keywords:`,
  ];

  // Add keywords as YAML array
  article.seo.keywords.forEach(keyword => {
    lines.push(`  - ${keyword}`);
  });

  return lines.join('\n');
}

/**
 * Escape special characters in YAML strings
 */
function escapeYAML(str: string): string {
  return str
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/"/g, '\\"');    // Escape quotes
}

/**
 * Update article status in MongoDB (for CMS tracking)
 * Note: The actual article content is stored in filesystem, not MongoDB
 */
async function updateArticleStatus(
  slugId: string,
  status: 'draft' | 'published'
): Promise<void> {
  await fetch(`/api/articles/${slugId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status,
      publishedAt: status === 'published' ? new Date().toISOString() : null,
    }),
  });
}
```

### Preview System

**File:** `src/app/components/ArticlePreview.tsx`

```typescript
export function ArticlePreview({
  article,
  isLight,
}: {
  article: ArticleFormData;
  isLight: boolean;
}) {
  const [processedHTML, setProcessedHTML] = useState('');

  useEffect(() => {
    const processContent = async () => {
      const { html } = await processMDXForEditor(article.content);
      setProcessedHTML(html);
    };
    processContent();
  }, [article.content]);

  return (
    <article className={`max-w-4xl mx-auto p-8 ${isLight ? 'bg-white' : 'bg-gray-900'}`}>
      {/* Featured Image */}
      {article.featuredImage.url && (
        <img
          src={article.featuredImage.url}
          alt={article.featuredImage.alt}
          className="w-full h-96 object-cover rounded-xl mb-8"
        />
      )}

      {/* Title */}
      <h1 className={`text-4xl font-bold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
        {article.title}
      </h1>

      {/* Meta */}
      <div className={`flex items-center gap-4 mb-8 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
        <span>{new Date().toLocaleDateString()}</span>
        <span>•</span>
        <span className="capitalize">{article.category.replace('-', ' ')}</span>
      </div>

      {/* Excerpt */}
      <p className={`text-xl mb-8 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
        {article.excerpt}
      </p>

      {/* Content */}
      <div
        className={`prose ${isLight ? 'prose-lg' : 'prose-invert prose-lg'} max-w-none`}
        dangerouslySetInnerHTML={{ __html: processedHTML }}
      />

      {/* Tags */}
      <div className="mt-12 pt-8 border-t">
        <div className="flex flex-wrap gap-2">
          {article.tags.map(tag => (
            <span
              key={tag}
              className={`px-3 py-1 rounded-full text-sm ${
                isLight
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
```

---

## File-Based Publishing System

### Overview: How Articles Get "Posted"

**Critical Understanding:** Articles in this system are NOT stored primarily in MongoDB. They are stored as MDX files in the `src/posts/` directory on the filesystem.

```
User Creates Article in CMS
         ↓
MongoDB (Draft Storage - Temporary)
         ↓
User Clicks "Publish"
         ↓
src/posts/{slugId}.mdx (Published - Permanent)
         ↓
/insights/{category}/{slugId} (Live on Site)
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ CREATION PHASE                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ CMS Form → MongoDB (status: "draft")                       │
│   - Used for CMS management only                           │
│   - Allows editing before publishing                       │
│   - NOT used for rendering on site                         │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ PUBLISHING PHASE                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Layer 5: Publishing Pipeline                               │
│   ↓                                                         │
│ 1. Validate article (length, SEO, images)                  │
│   ↓                                                         │
│ 2. Format frontmatter (YAML)                               │
│   ↓                                                         │
│ 3. Write to src/posts/{slugId}.mdx                         │
│   ↓                                                         │
│ 4. Update MongoDB status to "published"                    │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ RENDERING PHASE                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ User visits: /insights/{category}/{slugId}                 │
│   ↓                                                         │
│ getPostBySlug(slugId)                                       │
│   - Reads from src/posts/{slugId}.mdx                      │
│   - Parses frontmatter with gray-matter                    │
│   - Compiles MDX with next-mdx-remote                      │
│   ↓                                                         │
│ Renders article on site                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Example: Complete Publishing Flow

**Scenario:** User creates article "Coachella Valley Market Trends 2025"

#### Step 1: Draft Creation
```typescript
// User fills CMS form and clicks "Save Draft"
const articleData = {
  title: "Coachella Valley Market Trends 2025",
  excerpt: "Discover the latest real estate trends...",
  content: "## Introduction\n\nThe Coachella Valley...",
  category: "market-insights",
  tags: ["market-insights", "coachella-valley"],
  featuredImage: {
    url: "https://res.cloudinary.com/.../market-trends.jpg",
    alt: "Graph showing market trends"
  },
  seo: {
    title: "Coachella Valley Market Trends 2025 | JPSRealtor",
    description: "Expert analysis of real estate market trends...",
    keywords: ["coachella valley", "market trends", "real estate"]
  }
};

// Saved to MongoDB with status: "draft"
// slugId auto-generated: "coachella-valley-market-trends-2025"
```

#### Step 2: Publishing
```typescript
// User clicks "Publish Now"
await publishArticle(articleData, "coachella-valley-market-trends-2025");

// This triggers writeArticleToFilesystem() which creates:
```

**File Created:** `src/posts/coachella-valley-market-trends-2025.mdx`

```markdown
---
title: "Coachella Valley Market Trends 2025"
slugId: "coachella-valley-market-trends-2025"
date: "11/30/2025"
section: "market-insights"
image: "https://res.cloudinary.com/.../market-trends.jpg"
metaTitle: "Coachella Valley Market Trends 2025 | JPSRealtor"
metaDescription: "Expert analysis of real estate market trends..."
ogImage: "https://res.cloudinary.com/.../market-trends.jpg"
altText: "Graph showing market trends"
keywords:
  - coachella valley
  - market trends
  - real estate
---

## Introduction

The Coachella Valley real estate market continues to show strong growth in 2025...
```

#### Step 3: Rendering on Site
```typescript
// User visits: /insights/market-insights/coachella-valley-market-trends-2025

// In src/app/insights/[category]/[slugId]/page.tsx:
const post = await getPostBySlug("coachella-valley-market-trends-2025");

// getPostBySlug() from src/app/utils/fetchPosts.ts:
// 1. Reads src/posts/coachella-valley-market-trends-2025.mdx
// 2. Parses frontmatter with gray-matter
// 3. Returns Post object

// MDXRemote renders the content with custom components
<MDXRemote source={post.content} components={components} />
```

### Edit Flow for Published Articles

**Scenario:** User wants to edit a published article

```typescript
// 1. User clicks "Edit" in CMS article list
// 2. Fetch article from MongoDB (has status: "published")
const article = await fetch(`/api/articles/${articleId}`);

// 3. Load into edit form with all regeneration buttons
// 4. User makes changes (e.g., regenerates title)
// 5. User clicks "Save Draft" or "Publish Now"

if (clickedPublish) {
  // Re-write MDX file with updated content
  await writeArticleToFilesystem(updatedArticle, slugId);

  // Since slugId stays the same, it overwrites existing file
  // src/posts/coachella-valley-market-trends-2025.mdx ← Updated!
}
```

### Handling Conflicts

**Problem:** What if two articles have the same slugId?

```typescript
// In writeArticleToFilesystem():
const filePath = path.join(postsDirectory, `${slugId}.mdx`);

try {
  await fs.access(filePath);
  // File exists

  // Check if it's the same article (editing) or different (conflict)
  const existingContent = await fs.readFile(filePath, 'utf-8');
  const matter = grayMatter(existingContent);

  if (matter.data.slugId === slugId) {
    // Same article - we're updating
    console.log("Updating existing article");
  } else {
    // Conflict! Different article with same slugId
    throw new Error("Article with this slug already exists");
  }
} catch (error) {
  // File doesn't exist - new article
  console.log("Creating new article");
}
```

### MongoDB vs Filesystem: Roles

**MongoDB:**
- Stores drafts before publishing
- Tracks article status (draft/published)
- Used by CMS for article management
- Stores metadata for search/filtering
- **NOT** used for rendering articles on site

**Filesystem (src/posts/):**
- Stores published articles as MDX files
- **IS** used for rendering articles on site
- Permanent storage after publishing
- Read by getPostBySlug() in fetchPosts.ts
- Compiled by next-mdx-remote

### API Endpoints Needed

#### POST /api/articles/publish
```typescript
export async function POST(req: Request) {
  const { articleId } = await req.json();

  // 1. Fetch article from MongoDB
  const article = await Article.findById(articleId);

  // 2. Validate for publishing
  const validation = await validateForPublish(article);
  if (!validation.isValid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  // 3. Write MDX file
  await writeArticleToFilesystem(article, article.slugId);

  // 4. Update status in MongoDB
  await Article.findByIdAndUpdate(articleId, {
    status: 'published',
    publishedAt: new Date(),
  });

  return NextResponse.json({
    success: true,
    url: `/insights/${article.category}/${article.slugId}`
  });
}
```

#### DELETE /api/articles/unpublish
```typescript
export async function DELETE(req: Request) {
  const { articleId } = await req.json();

  const article = await Article.findById(articleId);

  // 1. Delete MDX file from filesystem
  const filePath = path.join(process.cwd(), 'src/posts', `${article.slugId}.mdx`);
  await fs.unlink(filePath);

  // 2. Update status in MongoDB (keep as draft for re-editing)
  await Article.findByIdAndUpdate(articleId, {
    status: 'draft',
    publishedAt: null,
  });

  return NextResponse.json({ success: true });
}
```

### Frontmatter Field Mapping

**CMS Form → Frontmatter:**

| CMS Field | Frontmatter Field | Notes |
|-----------|------------------|-------|
| `title` | `title` | Direct mapping |
| `slugId` | `slugId` | Auto-generated from title |
| `category` | `section` | **Important: category → section** |
| `featuredImage.url` | `image` | Cloudinary URL |
| `featuredImage.url` | `ogImage` | Same as image |
| `featuredImage.alt` | `altText` | Image alt text |
| `seo.title` | `metaTitle` | SEO meta title |
| `seo.description` | `metaDescription` | SEO meta description |
| `seo.keywords` | `keywords` | Array of keywords |
| (auto-generated) | `date` | MM/DD/YYYY format |

### Dependencies Required

```json
{
  "dependencies": {
    "gray-matter": "^4.0.3",      // Parse frontmatter
    "next-mdx-remote": "^4.4.1",  // Server-side MDX compilation
    "fs": "built-in",              // Node.js filesystem
    "path": "built-in"             // Node.js path utilities
  }
}
```

Already installed - no additional packages needed!

---

## Implementation Plan (Updated)

### Phase 1: Foundation (Week 1)
- [x] Layer 1: AI Response Processor
- [x] Layer 2: MDX Processor (AST-based)
- [ ] **NEW:** MDX Recovery System (handle corrupted articles)

### Phase 2: Editor & State (Week 2)
- [x] Layer 3: Editor State Manager
- [x] Refactor TipTap Editor
- [ ] **NEW:** Edit page MDX validation
- [ ] **NEW:** Error recovery modal

### Phase 3: AI Regeneration (Week 3)
- [ ] **NEW:** Layer 4: Field Regeneration Service
- [ ] **NEW:** Regeneration modal component
- [ ] **NEW:** Per-field system prompts
- [ ] **NEW:** Integrate into create & edit pages

### Phase 4: Publishing & Preview (Week 4)
- [ ] **NEW:** Layer 5: Publishing Pipeline
- [ ] **NEW:** Pre-publish validation
- [ ] **NEW:** File-based publishing system (write to src/posts/)
- [ ] **NEW:** Frontmatter formatting (category → section mapping)
- [ ] **NEW:** POST /api/articles/publish endpoint
- [ ] **NEW:** DELETE /api/articles/unpublish endpoint
- [ ] **NEW:** Article preview component
- [ ] **NEW:** Conflict resolution for duplicate slugIds

### Phase 5: Testing (Week 5)
- [ ] Unit tests for all layers
- [ ] Integration tests
- [ ] End-to-end tests
- [ ] **NEW:** Test field regeneration
- [ ] **NEW:** Test corrupted article recovery

---

## File Structure (Complete)

```
src/
├── lib/
│   ├── article-digester.ts          # Layer 1: AI response validation
│   ├── mdx-processor.ts              # Layer 2: AST-based conversion
│   ├── field-regenerator.ts          # Layer 4: AI field regeneration
│   ├── publishing-pipeline.ts        # Layer 5: Publish validation
│   ├── mdx-recovery.ts               # NEW: Recover corrupted MDX
│   └── mdx-converter.ts              # DEPRECATE
│
├── hooks/
│   └── useEditorState.ts             # Layer 3: Editor state manager
│
├── app/
│   ├── components/
│   │   ├── TipTapEditor.tsx          # REFACTOR: Use useEditorState
│   │   ├── RegenerateButton.tsx      # NEW: Per-field AI button
│   │   ├── RegenerateModal.tsx       # NEW: AI regeneration modal
│   │   ├── ArticlePreview.tsx        # NEW: Preview component
│   │   └── RecoveryModal.tsx         # NEW: Corrupted MDX recovery
│   │
│   ├── admin/
│   │   ├── cms/
│   │   │   └── new/
│   │   │       └── page.tsx          # REFACTOR: Use all layers
│   │   └── articles/
│   │       └── [id]/
│   │           └── page.tsx          # REFACTOR: Edit with regeneration
│   │
│   └── api/
│       └── articles/
│           ├── generate/
│           │   └── route.ts          # Existing full article generation
│           ├── regenerate-field/
│           │   └── route.ts          # NEW: Single field regeneration
│           ├── publish/
│           │   └── route.ts          # NEW: Write MDX to filesystem
│           └── unpublish/
│               └── route.ts          # NEW: Delete MDX from filesystem
│
└── types/
    ├── article.ts                     # Type definitions
    └── regeneration.ts                # NEW: Regeneration types
```

---

## Success Criteria (Complete)

### ✅ Phase 1-2 (Weeks 1-2)
- [ ] AI responses validated and sanitized
- [ ] AST-based MDX conversion (no regex)
- [ ] Round-trip conversion preserves formatting
- [ ] Edit page loads existing articles correctly
- [ ] Corrupted MDX triggers recovery modal

### ✅ Phase 3 (Week 3)
- [ ] Regenerate button on every field
- [ ] Modal shows current value + accepts user prompt
- [ ] AI maintains context of existing article
- [ ] Regenerated content integrates smoothly
- [ ] No race conditions when regenerating

### ✅ Phase 4 (Week 4)
- [ ] Pre-publish validation checklist works
- [ ] Preview shows article exactly as it will appear
- [ ] Publishing updates RSS and sitemap
- [ ] Unpublish functionality available

### ✅ Phase 5 (Week 5)
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Performance: <300ms conversions
- [ ] No memory leaks in editor

---

## Timeline (Complete)

- **Week 1:** Layers 1-2 + MDX Recovery
- **Week 2:** Layer 3 + Edit Page Fixes
- **Week 3:** Layer 4 (AI Regeneration)
- **Week 4:** Layer 5 (Publishing)
- **Week 5:** Testing + Bug Fixes

**Total:** 5 weeks for complete system

---

## Conclusion

This expanded architecture addresses all critical issues:

1. ✅ **MDX Digestion** - Layer 1 validates and sanitizes AI output
2. ✅ **Proper Conversion** - Layer 2 uses AST parsing (no regex)
3. ✅ **Editor State** - Layer 3 prevents race conditions with single source of truth
4. ✅ **Field Regeneration** - Layer 4 enables per-field AI regeneration with context
5. ✅ **Publishing Pipeline** - Layer 5 validates before publish
6. ✅ **File-Based Publishing** - Writes MDX files to src/posts/ directory
7. ✅ **Edit Flow** - Handles existing articles with MDX recovery
8. ✅ **Preview System** - Shows accurate theme-aware rendering
9. ✅ **Frontmatter Mapping** - Correct category → section field mapping
10. ✅ **MongoDB/Filesystem Separation** - Clear roles for each storage layer

### Key Architectural Decisions

**Storage Strategy:**
- **MongoDB** = CMS management, drafts, article metadata, status tracking
- **Filesystem (src/posts/)** = Published articles, rendered on site via getPostBySlug()

**Publishing Flow:**
1. User creates/edits article in CMS (stored in MongoDB as draft)
2. User clicks "Publish" → validation runs
3. MDX file written to `src/posts/{slugId}.mdx` with proper frontmatter
4. MongoDB status updated to "published" for CMS tracking
5. Article appears live at `/insights/{category}/{slugId}`

**Edit Flow:**
1. User clicks "Edit" on published article
2. Load from MongoDB (has latest edits)
3. Validate MDX, show recovery modal if corrupted
4. Allow per-field AI regeneration with context
5. On publish, overwrite MDX file in src/posts/

**Why This Works:**
- ✅ Separates CMS management from content delivery
- ✅ Uses Next.js best practices (MDX in filesystem)
- ✅ Enables easy git versioning of published content
- ✅ Allows drafts without affecting live site
- ✅ Makes articles portable (just MDX files)

**Next Steps:** Review and approve for implementation.
