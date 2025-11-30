# CMS Integration Action Plan

**Goal:** Link all architectural layers together to create one fully functioning CMS system

**Timeline:** 5 weeks (with parallel tracks to accelerate delivery)

**Last Updated:** 2025-11-30

---

## Executive Summary

### Current State
- ✅ CMS UI exists (create/edit pages)
- ✅ AI generation works (full articles)
- ✅ TipTap editor integrated
- ✅ MongoDB models defined
- ✅ File structure in place (src/posts/)
- ❌ **BROKEN:** MDX conversion (regex-based)
- ❌ **MISSING:** Publishing pipeline
- ❌ **MISSING:** Field regeneration
- ❌ **MISSING:** Edit page validation
- ❌ **BROKEN:** Toolbar buttons don't work

### End State
A complete CMS where users can:
1. Generate articles with AI (full or per-field)
2. Edit in rich text editor with working toolbar
3. Preview articles before publishing
4. Publish to filesystem as MDX files
5. Edit published articles safely
6. Unpublish articles

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMPLETE CMS SYSTEM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  USER INTERFACES:                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  /admin/cms  │  │ /admin/cms/  │  │  /admin/     │         │
│  │              │  │ articles/    │  │  articles    │         │
│  │  (Create)    │  │ [id]         │  │              │         │
│  │              │  │ (Edit)       │  │  (List)      │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                   │
│         └─────────────────┴─────────────────┘                   │
│                          │                                       │
│                          ▼                                       │
│              ┌───────────────────────┐                          │
│              │   CORE ENGINE         │                          │
│              ├───────────────────────┤                          │
│              │ Layer 1: AI Response  │ ← Validate AI output    │
│              │          Processor    │                          │
│              ├───────────────────────┤                          │
│              │ Layer 2: MDX          │ ← AST-based conversion  │
│              │          Processor    │                          │
│              ├───────────────────────┤                          │
│              │ Layer 3: Editor State │ ← Single source truth   │
│              │          Manager      │                          │
│              ├───────────────────────┤                          │
│              │ Layer 4: Field        │ ← Per-field AI regen    │
│              │          Regenerator  │                          │
│              ├───────────────────────┤                          │
│              │ Layer 5: Publishing   │ ← Write MDX files       │
│              │          Pipeline     │                          │
│              └───────────────────────┘                          │
│                          │                                       │
│         ┌────────────────┴────────────────┐                     │
│         ▼                                 ▼                     │
│  ┌─────────────┐                   ┌─────────────┐            │
│  │  MongoDB    │                   │ Filesystem  │            │
│  │  (Drafts)   │                   │ src/posts/  │            │
│  └─────────────┘                   └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation (Week 1)

### Goal: Build core processing layers that everything else depends on

### Task 1.1: Layer 1 - AI Response Processor
**File:** `src/lib/article-digester.ts` (NEW)

**Purpose:** Validate and sanitize AI-generated content before using it

**Implementation:**
```typescript
import { z } from 'zod';

// Validation schema for AI-generated articles
const ArticleSchema = z.object({
  title: z.string().min(10).max(200),
  excerpt: z.string().min(50).max(300),
  content: z.string().min(500),
  altText: z.string().min(10),
  metaTitle: z.string().min(10).max(60),
  metaDescription: z.string().min(50).max(160),
  keywords: z.array(z.string()).min(3).max(10),
});

export interface DigestedArticle {
  title: string;
  excerpt: string;
  content: string;
  altText: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

/**
 * Process AI response and validate all fields
 */
export async function digestAIResponse(
  rawResponse: any,
  category: string
): Promise<DigestedArticle> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Validate with Zod
    const validated = ArticleSchema.parse(rawResponse);

    // Check for bold text overuse
    const boldCount = (validated.content.match(/\*\*/g) || []).length / 2;
    const paragraphCount = validated.content.split('\n\n').length;

    if (boldCount > paragraphCount * 2) {
      warnings.push('Excessive bold text detected - consider reducing');
    }

    // Check for proper MDX structure
    if (!validated.content.includes('##')) {
      warnings.push('No H2 headings found - article may lack structure');
    }

    // Generate slugId
    const slugId = validated.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return {
      ...validated,
      validation: {
        isValid: errors.length === 0,
        errors,
        warnings,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        errors.push(`${err.path.join('.')}: ${err.message}`);
      });
    } else {
      errors.push('Unknown validation error');
    }

    return {
      title: '',
      excerpt: '',
      content: '',
      altText: '',
      metaTitle: '',
      metaDescription: '',
      keywords: [],
      validation: {
        isValid: false,
        errors,
        warnings,
      },
    };
  }
}
```

**Dependencies to install:**
```bash
npm install zod
```

**Integration Points:**
- Used by: `/api/articles/generate/route.ts`
- Used by: `/api/articles/regenerate-field/route.ts`

---

### Task 1.2: Layer 2 - MDX Processor (AST-Based)
**File:** `src/lib/mdx-processor.ts` (NEW)

**Purpose:** Replace broken regex-based converter with proper AST parsing

**Implementation:**
```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkStringify from 'remark-stringify';

export interface ProcessedMDX {
  mdx: string;
  html: string;
  isValid: boolean;
  errors: string[];
}

/**
 * Convert MDX to HTML using AST parsing
 * Handles nested structures correctly
 */
export async function mdxToHtml(mdx: string): Promise<ProcessedMDX> {
  try {
    const file = await unified()
      .use(remarkParse)           // Parse MDX to AST
      .use(remarkGfm)              // Support tables, strikethrough, etc.
      .use(remarkRehype)           // Convert to HTML AST
      .use(rehypeStringify)        // Convert to HTML string
      .process(mdx);

    return {
      mdx,
      html: String(file),
      isValid: true,
      errors: [],
    };
  } catch (error) {
    return {
      mdx,
      html: '',
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Convert HTML to MDX using AST parsing
 * Handles nested structures correctly
 */
export async function htmlToMdx(html: string): Promise<ProcessedMDX> {
  try {
    const file = await unified()
      .use(rehypeParse, { fragment: true })  // Parse HTML to AST
      .use(rehypeRemark)                     // Convert to Markdown AST
      .use(remarkGfm)                        // Support GFM features
      .use(remarkStringify)                  // Convert to Markdown string
      .process(html);

    return {
      mdx: String(file),
      html,
      isValid: true,
      errors: [],
    };
  } catch (error) {
    return {
      mdx: '',
      html,
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Validate MDX structure
 */
export async function validateMDX(mdx: string): Promise<{
  isValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    // Try to parse the MDX
    await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .parse(mdx);

    return { isValid: true, errors: [] };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Invalid MDX');
    return { isValid: false, errors };
  }
}

/**
 * Clean and normalize MDX
 * Removes excessive bold, fixes spacing, etc.
 */
export function cleanMDX(mdx: string): string {
  let cleaned = mdx;

  // Fix triple asterisks (corrupted bold+italic)
  cleaned = cleaned.replace(/\*\*\*([^*]+)\*\*\*/g, '**$1**');

  // Remove excessive blank lines (more than 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Fix list item spacing
  cleaned = cleaned.replace(/^-\s\s+/gm, '- ');

  return cleaned;
}
```

**Dependencies to install:**
```bash
npm install unified remark-parse remark-gfm remark-rehype rehype-stringify rehype-parse rehype-remark remark-stringify
```

**Integration Points:**
- Used by: `TipTapEditor.tsx` (conversion between MDX and HTML)
- Used by: `/admin/articles/[id]/page.tsx` (load existing articles)
- Replaces: `src/lib/mdx-converter.ts` (deprecate old file)

---

### Task 1.3: Layer 3 - Editor State Manager
**File:** `src/hooks/useEditorState.ts` (NEW)

**Purpose:** Single source of truth for editor state, prevents race conditions

**Implementation:**
```typescript
import { useState, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { mdxToHtml, htmlToMdx, cleanMDX } from '@/lib/mdx-processor';

export interface EditorState {
  mdx: string;
  html: string;
  isDirty: boolean;
  isSyncing: boolean;
  lastSaved: Date | null;
}

export function useEditorState(initialMdx: string) {
  const [state, setState] = useState<EditorState>({
    mdx: initialMdx,
    html: '',
    isDirty: false,
    isSyncing: false,
    lastSaved: null,
  });

  const editorRef = useRef<Editor | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Initialize editor with MDX content
   */
  const initializeEditor = useCallback(async (editor: Editor) => {
    editorRef.current = editor;

    // Convert MDX to HTML
    const { html } = await mdxToHtml(state.mdx);

    // Set HTML in editor
    editor.commands.setContent(html);

    setState(prev => ({ ...prev, html }));
  }, [state.mdx]);

  /**
   * Handle editor content changes
   * Debounced to prevent excessive conversions
   */
  const handleEditorChange = useCallback((editor: Editor) => {
    // Clear existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Get HTML from editor
    const html = editor.getHTML();

    setState(prev => ({ ...prev, html, isDirty: true, isSyncing: true }));

    // Debounce MDX conversion (wait 500ms after user stops typing)
    syncTimeoutRef.current = setTimeout(async () => {
      const { mdx } = await htmlToMdx(html);
      const cleaned = cleanMDX(mdx);

      setState(prev => ({
        ...prev,
        mdx: cleaned,
        isSyncing: false,
      }));
    }, 500);
  }, []);

  /**
   * Update MDX directly (e.g., from AI regeneration)
   */
  const setMdx = useCallback(async (newMdx: string) => {
    const cleaned = cleanMDX(newMdx);
    const { html } = await mdxToHtml(cleaned);

    // Update editor content
    if (editorRef.current && !editorRef.current.isFocused) {
      editorRef.current.commands.setContent(html);
    }

    setState(prev => ({
      ...prev,
      mdx: cleaned,
      html,
      isDirty: true,
    }));
  }, []);

  /**
   * Mark as saved
   */
  const markSaved = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDirty: false,
      lastSaved: new Date(),
    }));
  }, []);

  return {
    state,
    initializeEditor,
    handleEditorChange,
    setMdx,
    markSaved,
  };
}
```

**Integration Points:**
- Used by: `TipTapEditor.tsx`
- Used by: `/admin/cms/new/page.tsx`
- Used by: `/admin/articles/[id]/page.tsx`

---

### Task 1.4: Update TipTap Editor to Use New Architecture
**File:** `src/app/components/TipTapEditor.tsx` (REFACTOR)

**Changes Required:**
1. Remove all useEffect hooks (causing race conditions)
2. Use `useEditorState` hook instead
3. Remove manual conversion logic
4. Fix toolbar buttons

**Key Changes:**
```typescript
export default function TipTapEditor({ content, onChange, isLight }: Props) {
  const { state, initializeEditor, handleEditorChange, setMdx } = useEditorState(content);
  const [viewMode, setViewMode] = useState<"rich" | "mdx">("rich");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] }, // Only H2 and H3
      }),
      Bold,
      Italic,
      BulletList,
      OrderedList,
      ListItem,
      Link,
    ],
    editorProps: {
      attributes: {
        class: `prose max-w-none ${isLight ? 'prose-gray' : 'prose-invert'} focus:outline-none min-h-[400px] p-4`,
      },
    },
    onUpdate: ({ editor }) => {
      handleEditorChange(editor);
    },
  });

  // Initialize editor once
  useEffect(() => {
    if (editor) {
      initializeEditor(editor);
    }
  }, [editor, initializeEditor]);

  // Sync MDX back to parent
  useEffect(() => {
    if (!state.isSyncing && state.mdx !== content) {
      onChange(state.mdx);
    }
  }, [state.mdx, state.isSyncing]);

  // Toggle between Rich and MDX view
  const toggleView = () => {
    if (viewMode === "rich") {
      setViewMode("mdx");
    } else {
      setMdx(state.mdx); // Re-sync when switching back to rich
      setViewMode("rich");
    }
  };

  // Toolbar buttons now work because editor is properly initialized
  const ToolbarButton = ({ onClick, icon: Icon, label, isActive }: any) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`p-2 rounded transition-colors ${
        isActive
          ? isLight
            ? 'bg-blue-200 text-blue-700'
            : 'bg-emerald-600 text-white'
          : isLight
          ? 'hover:bg-gray-200 text-gray-700'
          : 'hover:bg-gray-700 text-gray-300'
      }`}
      title={label}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className={`border rounded-lg ${isLight ? 'border-gray-300 bg-white' : 'border-gray-700 bg-gray-900'}`}>
      {/* Toolbar */}
      <div className={`flex items-center gap-1 p-2 border-b ${isLight ? 'border-gray-300' : 'border-gray-700'}`}>
        {/* View toggle */}
        <button
          onClick={toggleView}
          className={`p-2 rounded flex items-center gap-2 ${
            isLight ? 'hover:bg-gray-200 text-gray-700' : 'hover:bg-gray-700 text-gray-300'
          }`}
        >
          {viewMode === "rich" ? (
            <>
              <Eye className="w-4 h-4" />
              Rich
            </>
          ) : (
            <>
              <FileCode className="w-4 h-4" />
              MDX
            </>
          )}
        </button>

        <div className={`w-px h-6 ${isLight ? 'bg-gray-300' : 'bg-gray-700'}`} />

        {/* Formatting buttons - now they work! */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          icon={Bold}
          label="Bold"
          isActive={editor.isActive('bold')}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          icon={Italic}
          label="Italic"
          isActive={editor.isActive('italic')}
        />

        {/* More toolbar buttons... */}
      </div>

      {/* Editor content */}
      {viewMode === "rich" ? (
        <EditorContent editor={editor} />
      ) : (
        <textarea
          value={state.mdx}
          onChange={(e) => setMdx(e.target.value)}
          className={`w-full min-h-[400px] p-4 font-mono text-sm ${
            isLight ? 'bg-gray-50 text-gray-900' : 'bg-gray-800 text-gray-100'
          } focus:outline-none`}
        />
      )}

      {/* Status indicator */}
      {state.isSyncing && (
        <div className="text-xs text-gray-500 p-2">
          Syncing...
        </div>
      )}
    </div>
  );
}
```

**Testing Checklist:**
- [ ] Editor loads without errors
- [ ] Toolbar buttons work (bold, italic, lists)
- [ ] MDX/Rich toggle works without data loss
- [ ] No scroll-to-bottom issues
- [ ] Round-trip conversion preserves formatting

---

## Phase 2: AI Integration (Week 2)

### Goal: Complete AI generation system with validation

### Task 2.1: Update Article Generation Endpoint
**File:** `src/app/api/articles/generate/route.ts` (UPDATE)

**Changes:**
```typescript
import { digestAIResponse } from '@/lib/article-digester';

export async function POST(req: Request) {
  // ... existing Groq API call ...

  // NEW: Digest AI response
  const digested = await digestAIResponse(articleData, category);

  if (!digested.validation.isValid) {
    return NextResponse.json({
      success: false,
      errors: digested.validation.errors,
    }, { status: 400 });
  }

  // Show warnings to user
  if (digested.validation.warnings.length > 0) {
    console.warn('AI generation warnings:', digested.validation.warnings);
  }

  // Generate slugId
  const slugId = digested.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return NextResponse.json({
    success: true,
    article: {
      title: digested.title,
      slugId,
      excerpt: digested.excerpt,
      content: digested.content,
      category,
      tags: [category],
      featuredImage: {
        url: "",
        publicId: "",
        alt: digested.altText,
      },
      seo: {
        title: digested.metaTitle,
        description: digested.metaDescription,
        keywords: digested.keywords,
      },
    },
    warnings: digested.validation.warnings,
  });
}
```

---

### Task 2.2: Layer 4 - Field Regeneration Service
**File:** `src/lib/field-regenerator.ts` (NEW)

**Purpose:** Regenerate individual fields with AI while maintaining article context

**Implementation:**
```typescript
import { createChatCompletion } from '@/lib/groq';

export type RegenerableField =
  | 'title'
  | 'excerpt'
  | 'content'
  | 'seoTitle'
  | 'seoDescription'
  | 'keywords';

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
  userPrompt?: string;
}

export interface RegenerationResult {
  field: RegenerableField;
  newValue: string | string[];
  success: boolean;
  error?: string;
}

export async function regenerateField(
  context: RegenerationContext
): Promise<RegenerationResult> {
  try {
    const systemPrompt = buildSystemPrompt(context.field);
    const userPrompt = buildUserPrompt(context);

    const response = await createChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: context.field === 'content' ? 4000 : 500,
    });

    const newValue = extractFieldValue(response, context.field);

    return {
      field: context.field,
      newValue,
      success: true,
    };
  } catch (error) {
    return {
      field: context.field,
      newValue: context.currentValue,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function buildSystemPrompt(field: RegenerableField): string {
  const prompts = {
    title: `You are an expert headline writer for real estate articles.
Generate compelling, SEO-optimized titles that:
- Are 50-200 characters long
- Include location keywords (Coachella Valley, Palm Desert, etc.)
- Use action-oriented language
- Create curiosity without clickbait

Return ONLY the title, nothing else.`,

    excerpt: `You are an expert at writing compelling article excerpts.
Generate excerpts that:
- Are 150-300 characters long
- Summarize the article's main value
- Include a benefit or call-to-action
- Use active voice

Return ONLY the excerpt, nothing else.`,

    content: `You are an expert real estate content writer for jpsrealtor.com.
Write professional, informative content about Coachella Valley real estate.

CRITICAL FORMATTING RULES:
- Use ## for main headings (H2), ### for subheadings (H3)
- Use bold (**text**) SPARINGLY - max 1-2 times per section for critical emphasis
- ZERO bold in bullet points
- Professional yet conversational tone
- Include contact info at end

Return ONLY the MDX content, nothing else.`,

    seoTitle: `Generate SEO meta titles that:
- Are 50-60 characters (strict limit)
- Include primary keyword first
- Avoid filler words
- Create urgency or value

Return ONLY the SEO title, nothing else.`,

    seoDescription: `Generate SEO meta descriptions that:
- Are 150-160 characters (strict limit)
- Include primary and secondary keywords
- Have a clear call-to-action
- Avoid special characters

Return ONLY the SEO description, nothing else.`,

    keywords: `Generate 5-8 SEO keywords for this real estate article.
Focus on:
- Location-specific terms (Coachella Valley, cities)
- Topic-specific terms
- Long-tail keywords

Return keywords as a comma-separated list, nothing else.`,
  };

  return prompts[field];
}

function buildUserPrompt(context: RegenerationContext): string {
  let prompt = `Article Context:\n`;

  if (context.articleContext.title) {
    prompt += `Title: ${context.articleContext.title}\n`;
  }
  if (context.articleContext.excerpt) {
    prompt += `Excerpt: ${context.articleContext.excerpt}\n`;
  }
  if (context.articleContext.category) {
    prompt += `Category: ${context.articleContext.category}\n`;
  }

  prompt += `\nCurrent ${context.field}:\n${context.currentValue}\n`;

  if (context.userPrompt) {
    prompt += `\nUser Instructions: ${context.userPrompt}\n`;
  }

  prompt += `\nGenerate a new ${context.field} for this article.`;

  return prompt;
}

function extractFieldValue(response: string, field: RegenerableField): string | string[] {
  const cleaned = response.trim();

  if (field === 'keywords') {
    return cleaned.split(',').map(k => k.trim());
  }

  return cleaned;
}
```

---

### Task 2.3: Field Regeneration API Endpoint
**File:** `src/app/api/articles/regenerate-field/route.ts` (NEW)

```typescript
import { NextResponse } from 'next/server';
import { regenerateField, RegenerationContext } from '@/lib/field-regenerator';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: Request) {
  // Check auth
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const context: RegenerationContext = await req.json();

    const result = await regenerateField(context);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      field: result.field,
      newValue: result.newValue,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
```

---

### Task 2.4: Regeneration UI Components
**File:** `src/app/components/RegenerateButton.tsx` (NEW)

```typescript
'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { RegenerableField } from '@/lib/field-regenerator';
import RegenerateModal from './RegenerateModal';

interface Props {
  field: RegenerableField;
  currentValue: string | string[];
  articleContext: {
    title?: string;
    excerpt?: string;
    content?: string;
    category: string;
    keywords: string[];
  };
  onRegenerate: (newValue: string | string[]) => void;
  isLight: boolean;
}

export default function RegenerateButton({
  field,
  currentValue,
  articleContext,
  onRegenerate,
  isLight,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setIsRegenerating(true);

    try {
      const response = await fetch('/api/articles/regenerate-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          currentValue: Array.isArray(currentValue) ? currentValue.join(', ') : currentValue,
          articleContext,
          userPrompt,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onRegenerate(data.newValue);
        setShowModal(false);
        setUserPrompt('');
      } else {
        alert(`Failed to regenerate: ${data.error}`);
      }
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

**File:** `src/app/components/RegenerateModal.tsx` (NEW)

```typescript
'use client';

import { Sparkles, Loader2, X } from 'lucide-react';
import { RegenerableField } from '@/lib/field-regenerator';

interface Props {
  field: RegenerableField;
  currentValue: string | string[];
  userPrompt: string;
  setUserPrompt: (value: string) => void;
  isRegenerating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLight: boolean;
}

export default function RegenerateModal({
  field,
  currentValue,
  userPrompt,
  setUserPrompt,
  isRegenerating,
  onConfirm,
  onCancel,
  isLight,
}: Props) {
  const fieldLabels: Record<RegenerableField, string> = {
    title: 'Title',
    excerpt: 'Excerpt',
    content: 'Content',
    seoTitle: 'SEO Title',
    seoDescription: 'SEO Description',
    keywords: 'Keywords',
  };

  const displayValue = Array.isArray(currentValue)
    ? currentValue.join(', ')
    : currentValue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`${isLight ? 'bg-white' : 'bg-gray-900'} rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            <Sparkles className="inline w-6 h-6 mr-2" />
            Regenerate {fieldLabels[field]}
          </h2>
          <button
            onClick={onCancel}
            className={`p-2 rounded hover:bg-gray-200 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current value */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
            Current {fieldLabels[field]}:
          </label>
          <div className={`p-3 rounded border ${isLight ? 'bg-gray-50 border-gray-300' : 'bg-gray-800 border-gray-700'}`}>
            <p className={`${isLight ? 'text-gray-800' : 'text-gray-200'} text-sm whitespace-pre-wrap`}>
              {displayValue || `No ${fieldLabels[field].toLowerCase()} yet`}
            </p>
          </div>
        </div>

        {/* User prompt */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
            Instructions for AI (optional):
          </label>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder={`e.g., "Make it more engaging" or "Focus on investment opportunities"`}
            className={`w-full p-3 rounded border ${
              isLight
                ? 'bg-white border-gray-300 text-gray-900'
                : 'bg-gray-800 border-gray-700 text-white'
            } focus:ring-2 focus:ring-blue-500`}
            rows={3}
          />
        </div>

        {/* Actions */}
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

---

## Phase 3: Publishing System (Week 3)

### Goal: Complete file-based publishing pipeline

### Task 3.1: Layer 5 - Publishing Pipeline
**File:** `src/lib/publishing-pipeline.ts` (NEW)

**Implementation:** [Use code from architecture document Section 7]

Key functions:
- `validateForPublish()` - Pre-publish validation
- `publishArticle()` - Main publish function
- `writeArticleToFilesystem()` - Write MDX file
- `formatFrontmatter()` - Format YAML frontmatter
- `updateArticleStatus()` - Update MongoDB

---

### Task 3.2: Publish API Endpoint
**File:** `src/app/api/articles/publish/route.ts` (NEW)

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { publishArticle } from '@/lib/publishing-pipeline';
import Article from '@/models/article';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { articleId } = await req.json();

    // Fetch article from MongoDB
    const article = await Article.findById(articleId);
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Publish (writes to filesystem)
    await publishArticle(article.toObject(), article.slugId);

    return NextResponse.json({
      success: true,
      url: `/insights/${article.category}/${article.slugId}`,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
```

---

### Task 3.3: Unpublish API Endpoint
**File:** `src/app/api/articles/unpublish/route.ts` (NEW)

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Article from '@/models/article';
import fs from 'fs/promises';
import path from 'path';

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { articleId } = await req.json();

    const article = await Article.findById(articleId);
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Delete MDX file
    const filePath = path.join(process.cwd(), 'src/posts', `${article.slugId}.mdx`);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('File not found or already deleted:', filePath);
    }

    // Update MongoDB status to draft
    await Article.findByIdAndUpdate(articleId, {
      status: 'draft',
      publishedAt: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
```

---

## Phase 4: Edit Flow (Week 4)

### Goal: Fix edit page and integrate regeneration

### Task 4.1: Update Edit Page
**File:** `src/app/admin/articles/[id]/page.tsx` (REFACTOR)

**Changes:**
1. Add all regenerate buttons
2. Use `useEditorState` hook
3. Add MDX validation on load
4. Add publish/unpublish buttons

**Key Integration:**
```typescript
export default function EditArticlePage({ params }: { params: { id: string } }) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [formData, setFormData] = useState<ArticleFormData>({...});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load article
  useEffect(() => {
    fetchArticle();
  }, [params.id]);

  const fetchArticle = async () => {
    try {
      const response = await fetch(`/api/articles/${params.id}`);
      const data = await response.json();

      // Validate MDX
      const validation = await validateMDX(data.content);
      if (!validation.isValid) {
        alert(`MDX validation errors:\n${validation.errors.join('\n')}\n\nThe editor will attempt to load the content, but you may need to fix formatting issues.`);
      }

      setFormData(data);
    } catch (error) {
      alert('Failed to load article');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!confirm('Publish this article? It will be live on the site.')) return;

    try {
      const response = await fetch('/api/articles/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: params.id }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Article published successfully!');
        window.open(data.url, '_blank');
      } else {
        alert(`Failed to publish: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to publish article');
    }
  };

  const handleUnpublish = async () => {
    if (!confirm('Unpublish this article? It will be removed from the site.')) return;

    try {
      const response = await fetch('/api/articles/unpublish', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: params.id }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Article unpublished successfully!');
        fetchArticle(); // Reload to show updated status
      } else {
        alert(`Failed to unpublish: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to unpublish article');
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <AdminNav />

      {/* Title with Regenerate Button */}
      <div className="mb-6">
        <label>Title</label>
        <div className="flex gap-2">
          <input
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
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
            onRegenerate={(newValue) => setFormData(prev => ({ ...prev, title: newValue as string }))}
            isLight={isLight}
          />
        </div>
      </div>

      {/* Repeat for all fields... */}

      {/* Publish Buttons */}
      <div className="flex gap-4">
        <button onClick={handleSave}>Save Draft</button>
        {formData.status === 'draft' ? (
          <button onClick={handlePublish}>Publish Now</button>
        ) : (
          <button onClick={handleUnpublish}>Unpublish</button>
        )}
      </div>
    </div>
  );
}
```

---

## Phase 5: Testing & Polish (Week 5)

### Goal: Ensure everything works end-to-end

### Task 5.1: End-to-End Testing

**Test Scenario 1: Create New Article**
1. Navigate to `/admin/cms/new`
2. Enter topic and category
3. Click "Generate with AI"
4. Verify all fields populated
5. Test regenerate button on title
6. Edit content in TipTap editor
7. Test toolbar buttons (bold, italic, lists)
8. Toggle to MDX view and back
9. Save as draft
10. Publish
11. Verify article appears at `/insights/{category}/{slugId}`

**Test Scenario 2: Edit Existing Article**
1. Navigate to `/admin/articles`
2. Click edit on published article
3. Verify content loads correctly
4. Make changes
5. Test regenerate on excerpt
6. Re-publish
7. Verify changes appear on site

**Test Scenario 3: Unpublish Article**
1. Edit published article
2. Click "Unpublish"
3. Verify MDX file deleted from src/posts/
4. Verify article no longer accessible at URL
5. Verify status changed to "draft" in CMS

---

### Task 5.2: Performance Testing

**Metrics to Measure:**
- MDX → HTML conversion time (target: <100ms)
- HTML → MDX conversion time (target: <100ms)
- AI generation time (expected: 5-10 seconds)
- Field regeneration time (expected: 2-5 seconds)
- Publish time (target: <500ms)

**Tools:**
```typescript
// Add to mdx-processor.ts
console.time('mdx-to-html');
const result = await mdxToHtml(mdx);
console.timeEnd('mdx-to-html');
```

---

### Task 5.3: Error Handling

**Add comprehensive error handling:**
1. Network failures (show retry button)
2. AI API failures (fallback to manual entry)
3. File system errors (show clear error message)
4. Validation errors (highlight problematic fields)
5. Conflict errors (duplicate slugId)

---

## Dependencies Summary

**New NPM Packages to Install:**
```bash
npm install \
  zod \
  unified \
  remark-parse \
  remark-gfm \
  remark-rehype \
  rehype-stringify \
  rehype-parse \
  rehype-remark \
  remark-stringify
```

**Total:** 9 new packages

---

## File Changes Summary

### New Files (18)
1. `src/lib/article-digester.ts`
2. `src/lib/mdx-processor.ts`
3. `src/lib/field-regenerator.ts`
4. `src/lib/publishing-pipeline.ts`
5. `src/hooks/useEditorState.ts`
6. `src/app/components/RegenerateButton.tsx`
7. `src/app/components/RegenerateModal.tsx`
8. `src/app/api/articles/regenerate-field/route.ts`
9. `src/app/api/articles/publish/route.ts`
10. `src/app/api/articles/unpublish/route.ts`
11. `src/types/regeneration.ts`
12. `docs/CMS_INTEGRATION_ACTION_PLAN.md` (this document)

### Modified Files (5)
1. `src/app/components/TipTapEditor.tsx` - Complete refactor
2. `src/app/api/articles/generate/route.ts` - Add digestion
3. `src/app/admin/cms/new/page.tsx` - Add regenerate buttons
4. `src/app/admin/articles/[id]/page.tsx` - Complete refactor
5. `src/app/admin/articles/page.tsx` - Add publish/unpublish actions

### Deprecated Files (1)
1. `src/lib/mdx-converter.ts` - Replace with mdx-processor.ts

---

## Success Criteria

### Week 1 ✅
- [ ] MDX processor works with complex nested structures
- [ ] Round-trip conversion (MDX → HTML → MDX) preserves formatting
- [ ] TipTap toolbar buttons work
- [ ] No scroll-to-bottom issues
- [ ] No race conditions

### Week 2 ✅
- [ ] AI generation validates output
- [ ] Field regeneration works for all fields
- [ ] Regeneration modal shows current value
- [ ] AI maintains context when regenerating

### Week 3 ✅
- [ ] Publishing writes MDX file to src/posts/
- [ ] Frontmatter formatted correctly
- [ ] Published articles appear on site
- [ ] Unpublishing removes MDX file

### Week 4 ✅
- [ ] Edit page loads published articles
- [ ] All fields have regenerate buttons
- [ ] Can edit and republish articles
- [ ] Validation errors shown clearly

### Week 5 ✅
- [ ] All tests pass
- [ ] Performance meets targets
- [ ] Error handling comprehensive
- [ ] Documentation complete

---

## Rollout Strategy

### Option A: Big Bang (Not Recommended)
- Implement all phases at once
- High risk of breakage
- Difficult to debug

### Option B: Incremental (Recommended)
1. **Week 1:** Deploy Layers 1-3 to staging
2. **Week 2:** Test editor improvements, deploy Layer 4
3. **Week 3:** Deploy Layer 5 publishing to staging
4. **Week 4:** Deploy edit flow improvements
5. **Week 5:** Final testing, deploy to production

### Option C: Feature Flags
- Deploy all code with feature flags
- Enable features one by one
- Easy rollback if issues found

**Recommendation:** Use Option B (Incremental) with Git branches:
- `feature/layers-1-3` → Merge to `main` after Week 1 testing
- `feature/layer-4` → Merge after Week 2 testing
- `feature/layer-5` → Merge after Week 3 testing
- `feature/edit-flow` → Merge after Week 4 testing
- `main` → Deploy to production after Week 5

---

## Risk Mitigation

### Risk 1: Breaking Existing Articles
**Mitigation:**
- Test with copies of existing MDX files
- Add MDX validation before processing
- Create backup of src/posts/ before first publish

### Risk 2: AI API Failures
**Mitigation:**
- Add retry logic with exponential backoff
- Show clear error messages
- Allow manual entry if AI fails

### Risk 3: Performance Issues
**Mitigation:**
- Profile MDX conversion early
- Add loading indicators
- Debounce conversions (already in useEditorState)

### Risk 4: Data Loss
**Mitigation:**
- Auto-save drafts every 30 seconds
- Show "unsaved changes" warning
- Keep MongoDB as backup even after publish

---

## Next Steps

1. **Review this plan** - Approve or request changes
2. **Install dependencies** - `npm install` packages
3. **Create feature branch** - `git checkout -b feature/layers-1-3`
4. **Start Week 1 tasks** - Build foundational layers
5. **Test incrementally** - Don't move to next phase until current works

**Estimated Total Time:** 5 weeks for complete system
**Estimated Lines of Code:** ~3,000 new lines
**Estimated Files Changed:** 18 new, 5 modified

---

## Questions for Review

1. Does the phased approach make sense?
2. Are there any missing features?
3. Should we add auto-save for drafts?
4. Should we add article versioning (git integration)?
5. Should we add preview mode before publishing?

Ready to proceed? Let's start with Phase 1, Task 1.1! 🚀
