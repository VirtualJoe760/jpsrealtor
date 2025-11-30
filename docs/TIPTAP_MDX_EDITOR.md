# TipTap MDX Editor Integration

## Overview

The CMS article editor uses TipTap rich text editor with full MDX support. The editor displays MDX content as formatted rich text while maintaining the MDX source format for AI generation and storage.

## Architecture

### Bidirectional MDX Conversion

```
MDX (from Groq/Database) → HTML (for TipTap) → User Edits → HTML → MDX (saved)
```

**Flow:**
1. **Input**: Groq AI generates MDX content with frontmatter separated
2. **Display**: MDX is converted to HTML for visual editing in TipTap
3. **Editing**: User edits content using rich text toolbar
4. **Output**: HTML is converted back to MDX when saving

### Files Structure

```
src/
├── lib/
│   └── mdx-converter.ts          # Bidirectional MDX ↔ HTML conversion
├── app/
│   ├── components/
│   │   └── TipTapEditor.tsx      # Rich text editor component
│   ├── api/
│   │   └── articles/
│   │       └── generate/
│   │           └── route.ts      # Groq AI article generation
│   └── mdx-components.tsx        # MDX component definitions
```

## Components

### 1. MDX Converter (`src/lib/mdx-converter.ts`)

**Functions:**

#### `mdxToHtml(mdx: string): Promise<string>`
Converts MDX/Markdown to HTML for TipTap display.

**Features:**
- Parses MDX using unified/remark
- Preserves YouTube components: `<YouTube id="..." />`
- Converts to semantic HTML
- Supports GFM (GitHub Flavored Markdown)

**Example:**
```typescript
const mdx = `## Heading\n\n<YouTube id="abc123" />\n\nSome **bold** text`;
const html = await mdxToHtml(mdx);
// Output: <h2>Heading</h2><div class="youtube-embed" data-youtube-id="abc123">...</div><p>Some <strong>bold</strong> text</p>
```

#### `htmlToMdx(html: string): string`
Converts TipTap HTML back to MDX format.

**Conversions:**
- `<h1>` → `# Heading`
- `<h2>` → `## Heading`
- `<strong>` → `**text**`
- `<em>` → `*text*`
- `<a>` → `[text](url)`
- `<img>` → `![alt](url)`
- `<ul><li>` → `- item`
- `<ol><li>` → `1. item`
- YouTube iframes → `<YouTube id="..." />`

**Example:**
```typescript
const html = `<h2>Heading</h2><p>Some <strong>bold</strong> text</p>`;
const mdx = htmlToMdx(html);
// Output: ## Heading\n\nSome **bold** text
```

### 2. TipTap Editor (`src/app/components/TipTapEditor.tsx`)

**Props:**
```typescript
interface TipTapEditorProps {
  content: string;           // MDX content (input)
  onChange: (mdx: string) => void; // MDX content (output)
  placeholder?: string;
  isLight: boolean;          // Theme flag
}
```

**Extensions:**
- **StarterKit**: Headings, paragraphs, lists, bold, italic, code
- **Link**: Hyperlinks with theme-aware styling
- **Youtube**: YouTube embeds
- **Image**: Image insertion
- **Placeholder**: Empty state text

**Features:**
- Auto-converts MDX to HTML on mount
- Real-time HTML → MDX conversion on edit
- Theme-aware prose styling (blue/emerald)
- Full toolbar with formatting options
- Undo/Redo support

**Toolbar Actions:**
- **Text**: Bold, Italic
- **Headings**: H1, H2, H3
- **Lists**: Bullet, Numbered
- **Blocks**: Blockquote, Code Block
- **Media**: Links, YouTube, Images
- **History**: Undo, Redo

### 3. Groq AI Generation (`src/app/api/articles/generate/route.ts`)

**Endpoint**: `POST /api/articles/generate`

**Request:**
```json
{
  "topic": "Real Estate Market Trends",
  "category": "market-insights",
  "keywords": ["Coachella Valley", "investment"],
  "tone": "professional",
  "length": "comprehensive"
}
```

**Response:**
```json
{
  "success": true,
  "article": {
    "title": "...",
    "excerpt": "...",
    "content": "## Heading\n\n<YouTube id=\"...\" />\n\n...",
    "tags": [...],
    "seo": {...}
  }
}
```

**System Prompt Guidelines:**
- Professional yet conversational tone
- Action-oriented content
- Local market insights (Coachella Valley)
- MDX format with YouTube components
- SEO optimization
- Structured with headings and lists

**MDX Components Supported:**
```mdx
<YouTube id="VIDEO_ID" />
```

## Usage

### In CMS Page (`/admin/cms/new`)

```tsx
import TipTapEditor from "@/app/components/TipTapEditor";

<TipTapEditor
  content={formData.content}  // MDX string
  onChange={(mdx) => setFormData(prev => ({ ...prev, content: mdx }))}
  placeholder="Write your article content..."
  isLight={isLight}
/>
```

### With Groq Generation

```typescript
// 1. Generate article with Groq
const response = await fetch('/api/articles/generate', {
  method: 'POST',
  body: JSON.stringify({ topic, category, keywords })
});
const { article } = await response.json();

// 2. Set MDX content (automatically converted to HTML in editor)
setFormData({ ...formData, content: article.content });

// 3. User edits in TipTap (visual rich text)

// 4. On save, MDX is returned via onChange
// formData.content is now MDX format
```

### Preview Integration

The preview page uses ReactMarkdown to render MDX:

```tsx
// src/app/articles/preview/page.tsx
import ReactMarkdown from 'react-markdown';

<ReactMarkdown>{content}</ReactMarkdown>
```

## MDX Components

### YouTube Component

**MDX Syntax:**
```mdx
<YouTube id="dQw4w9WgXcQ" />
```

**Component Definition:**
```tsx
// src/app/components/mdx/YouTube.tsx
export default function YouTube({ id }: { id: string }) {
  return (
    <div>
      <iframe
        className="aspect-video w-full"
        src={`https://www.youtube.com/embed/${id}`}
        title="YouTube Video Player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}
```

**Registration:**
```tsx
// src/app/mdx-components.tsx
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    YouTube,
  };
}
```

## Theme Styling

### Light Mode (Blue Accents)
- Links: `text-blue-600`
- Blockquote border: `border-blue-500`
- Code: `text-blue-600 bg-gray-100`

### Dark Mode (Emerald Accents)
- Links: `text-emerald-400`
- Blockquote border: `border-emerald-500`
- Code: `text-emerald-400 bg-gray-800`

## Dependencies

```json
{
  "@tiptap/react": "^2.x",
  "@tiptap/starter-kit": "^2.x",
  "@tiptap/extension-link": "^2.x",
  "@tiptap/extension-youtube": "^2.x",
  "@tiptap/extension-placeholder": "^2.x",
  "@tiptap/extension-image": "^2.x",
  "remark": "^latest",
  "remark-parse": "^latest",
  "remark-html": "^latest",
  "remark-gfm": "^latest",
  "unified": "^latest",
  "unist-util-visit": "^latest",
  "react-markdown": "^latest"
}
```

## Future Enhancements

### Planned Features
- [ ] Twitter/X embed component
- [ ] Code syntax highlighting
- [ ] Table support
- [ ] Image upload with Cloudinary
- [ ] Callout/Alert boxes
- [ ] Internal link autocomplete

### MDX Component Ideas
```mdx
<Tweet id="..." />
<Callout type="info|warning|success">...</Callout>
<PropertyCard listingKey="..." />
<CommunityStats city="Palm Desert" />
```

## Troubleshooting

### Issue: Editor shows HTML tags instead of formatted text
**Solution**: Ensure `mdxToHtml()` is being called. Check console for conversion errors.

### Issue: YouTube embeds not rendering
**Solution**: Verify MDX syntax: `<YouTube id="VIDEO_ID" />` (self-closing tag required)

### Issue: Content not updating after Groq generation
**Solution**: Check `useEffect` dependencies in TipTapEditor. Ensure `content` prop changes trigger conversion.

### Issue: Build errors with regex
**Solution**: Use `[\s\S]` instead of `.` with `s` flag. TypeScript target doesn't support ES2018+ regex flags.

## Best Practices

1. **Always separate frontmatter from content** - Use separate form fields
2. **Use MDX components for embeds** - Don't paste raw HTML
3. **Test conversions** - Check MDX → HTML → MDX round-trip
4. **Preview before publishing** - Use live preview iframe
5. **Keep MDX clean** - Avoid mixing HTML and MDX syntax
6. **Use semantic headings** - H2 for sections, H3 for subsections
7. **Include alt text** - For images: `![Description](url)`

## Examples

### Full Article MDX
```mdx
## The Coachella Valley Real Estate Market in 2025

The real estate market in **Palm Desert**, **La Quinta**, and **Indian Wells** continues to thrive. Here's what you need to know:

### Market Trends

- ✅ Inventory levels rising
- ✅ Interest rates stabilizing
- ✅ Strong buyer demand

<YouTube id="abc123xyz" />

### Investment Opportunities

1. **Vacation rentals** - High ROI in resort communities
2. **Golf course properties** - Premium locations
3. **New developments** - Modern amenities

> "The Coachella Valley offers unparalleled lifestyle and investment potential."

For expert guidance, contact us:

📞 Call or Text: **+1 (760) 833-6334**
📧 Email: **josephsardella@gmail.com**
```

### Rendered Output
The above MDX renders as a fully formatted article with:
- Proper heading hierarchy
- Styled lists with checkmarks
- Embedded YouTube video
- Blockquote with border accent
- Contact information with emojis
