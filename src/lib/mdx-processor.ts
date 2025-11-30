import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkStringify from 'remark-stringify';

/**
 * Layer 2: MDX Processor
 *
 * AST-based MDX ↔ HTML conversion replacing broken regex-based converter.
 * Handles nested structures, complex formatting, and maintains data integrity.
 */

export interface ProcessedMDX {
  mdx: string;
  html: string;
  isValid: boolean;
  errors: string[];
}

/**
 * Convert MDX to HTML using AST parsing
 * Handles nested structures correctly (e.g., bold inside italic)
 *
 * @param mdx - MDX markdown content
 * @returns Processed result with HTML and validation status
 */
export async function mdxToHtml(mdx: string): Promise<ProcessedMDX> {
  try {
    const file = await unified()
      .use(remarkParse)           // Parse MDX to AST
      .use(remarkGfm)              // Support tables, strikethrough, task lists
      .use(remarkRehype)           // Convert Markdown AST to HTML AST
      .use(rehypeStringify)        // Convert HTML AST to string
      .process(mdx);

    return {
      mdx,
      html: String(file),
      isValid: true,
      errors: [],
    };
  } catch (error) {
    console.error('MDX to HTML conversion error:', error);
    return {
      mdx,
      html: '',
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown conversion error'],
    };
  }
}

/**
 * Convert HTML to MDX using AST parsing
 * Handles nested structures correctly
 *
 * @param html - HTML content from TipTap editor
 * @returns Processed result with MDX and validation status
 */
export async function htmlToMdx(html: string): Promise<ProcessedMDX> {
  try {
    const file = await unified()
      .use(rehypeParse, { fragment: true })  // Parse HTML to AST (fragment mode for partial HTML)
      .use(rehypeRemark)                     // Convert HTML AST to Markdown AST
      .use(remarkGfm)                        // Support GFM features
      .use(remarkStringify, {
        bullet: '-',                          // Use - for bullet lists
        fence: '`',                           // Use ` for code fences
        fences: true,                         // Use fenced code blocks
        incrementListMarker: false,           // Keep list markers consistent
      })
      .process(html);

    const mdx = String(file);

    return {
      mdx,
      html,
      isValid: true,
      errors: [],
    };
  } catch (error) {
    console.error('HTML to MDX conversion error:', error);
    return {
      mdx: '',
      html,
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown conversion error'],
    };
  }
}

/**
 * Validate MDX structure
 * Ensures MDX can be parsed without errors
 *
 * @param mdx - MDX content to validate
 * @returns Validation result
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
    errors.push(error instanceof Error ? error.message : 'Invalid MDX structure');
    return { isValid: false, errors };
  }
}

/**
 * Clean and normalize MDX
 * Fixes common issues like excessive bold, spacing problems, etc.
 *
 * @param mdx - Raw MDX content
 * @returns Cleaned MDX content
 */
export function cleanMDX(mdx: string): string {
  let cleaned = mdx;

  // Fix triple asterisks (corrupted bold+italic: ***text*** → **text**)
  cleaned = cleaned.replace(/\*\*\*([^*]+)\*\*\*/g, '**$1**');

  // Fix quadruple asterisks (****text**** → **text**)
  cleaned = cleaned.replace(/\*{4,}([^*]+)\*{4,}/g, '**$1**');

  // Remove excessive blank lines (more than 2 consecutive newlines)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Fix list item spacing (remove extra spaces after bullet)
  cleaned = cleaned.replace(/^-\s{2,}/gm, '- ');
  cleaned = cleaned.replace(/^\d+\.\s{2,}/gm, (match) => {
    const num = match.match(/^\d+/)?.[0];
    return `${num}. `;
  });

  // Remove trailing whitespace from lines
  cleaned = cleaned.split('\n').map(line => line.trimEnd()).join('\n');

  // Ensure file ends with single newline
  cleaned = cleaned.trim() + '\n';

  return cleaned;
}

/**
 * Round-trip test: MDX → HTML → MDX
 * Tests if conversion preserves content
 *
 * @param mdx - Original MDX
 * @returns Test result with comparison
 */
export async function testRoundTrip(mdx: string): Promise<{
  success: boolean;
  originalMdx: string;
  convertedMdx: string;
  isEquivalent: boolean;
}> {
  try {
    const { html } = await mdxToHtml(mdx);
    const { mdx: convertedMdx } = await htmlToMdx(html);

    // Clean both for comparison
    const cleanedOriginal = cleanMDX(mdx);
    const cleanedConverted = cleanMDX(convertedMdx);

    return {
      success: true,
      originalMdx: cleanedOriginal,
      convertedMdx: cleanedConverted,
      isEquivalent: cleanedOriginal === cleanedConverted,
    };
  } catch (error) {
    return {
      success: false,
      originalMdx: mdx,
      convertedMdx: '',
      isEquivalent: false,
    };
  }
}
