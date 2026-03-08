import { z } from 'zod';

/**
 * Layer 1: AI Response Processor
 *
 * Validates and sanitizes AI-generated content before using it.
 * Uses Zod for schema validation to ensure all fields meet requirements.
 */

// Validation schema for AI-generated articles
const ArticleSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(200, 'Title must be less than 200 characters'),
  excerpt: z.string().min(50, 'Excerpt must be at least 50 characters').max(300, 'Excerpt must be less than 300 characters'),
  content: z.string().min(500, 'Content must be at least 500 characters'),
  altText: z.string().min(10, 'Alt text must be at least 10 characters'),
  metaTitle: z.string().min(10, 'SEO title must be at least 10 characters').max(60, 'SEO title must be less than 60 characters'),
  metaDescription: z.string().min(50, 'SEO description must be at least 50 characters').max(160, 'SEO description must be less than 160 characters'),
  keywords: z.array(z.string()).min(3, 'At least 3 keywords required').max(10, 'Maximum 10 keywords allowed'),
});

export interface DigestedArticle {
  title: string;
  slugId: string;
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
 *
 * @param rawResponse - Raw response from AI function calling
 * @param category - Article category (used for default tags)
 * @returns Digested and validated article data
 */
export async function digestAIResponse(
  rawResponse: any,
  category: string
): Promise<DigestedArticle> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Pre-process: Auto-fix violations before validation
  const sanitized = {
    title: rawResponse.title || '',
    excerpt: rawResponse.excerpt || '',
    content: rawResponse.content || '',
    altText: rawResponse.altText || '',
    metaTitle: rawResponse.metaTitle || rawResponse.title || '',
    metaDescription: rawResponse.metaDescription || rawResponse.excerpt || '',
    keywords: Array.isArray(rawResponse.keywords) ? rawResponse.keywords : [],
  };

  // Auto-truncate metaTitle if too long (60 char limit)
  if (sanitized.metaTitle.length > 60) {
    const original = sanitized.metaTitle;
    sanitized.metaTitle = sanitized.metaTitle.substring(0, 57) + '...';
    warnings.push(`SEO title truncated from ${original.length} to 60 characters`);
  }

  // Auto-truncate metaDescription if too long (160 char limit)
  if (sanitized.metaDescription.length > 160) {
    const original = sanitized.metaDescription;
    sanitized.metaDescription = sanitized.metaDescription.substring(0, 157) + '...';
    warnings.push(`SEO description truncated from ${original.length} to 160 characters`);
  }

  // Limit keywords to 10
  if (sanitized.keywords.length > 10) {
    const original = sanitized.keywords.length;
    sanitized.keywords = sanitized.keywords.slice(0, 10);
    warnings.push(`Keywords reduced from ${original} to 10`);
  }

  try {
    // Validate with Zod (should pass now after sanitization)
    const validated = ArticleSchema.parse(sanitized);

    // Check for bold text overuse
    const boldCount = (validated.content.match(/\*\*/g) || []).length / 2;
    const paragraphCount = validated.content.split('\n\n').filter(p => p.trim().length > 0).length;

    if (boldCount > paragraphCount * 2) {
      warnings.push(`Excessive bold text detected (${boldCount} uses in ${paragraphCount} paragraphs) - consider reducing`);
    }

    // Check for proper MDX structure
    const h2Count = (validated.content.match(/^## /gm) || []).length;
    if (h2Count === 0) {
      warnings.push('No H2 headings found - article may lack structure');
    }

    // Check for labels that shouldn't be there
    const labelPattern = /(Hook|Introduction|Body|Conclusion):/gi;
    if (labelPattern.test(validated.content)) {
      warnings.push('AI included section labels (Hook:, Introduction:, etc.) - these should be removed');
    }

    // Generate slugId from title
    const slugId = validated.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return {
      ...validated,
      slugId,
      validation: {
        isValid: errors.length === 0,
        errors,
        warnings,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.issues.forEach(err => {
        errors.push(`${err.path.join('.')}: ${err.message}`);
      });
    } else {
      errors.push('Unknown validation error');
    }

    return {
      title: sanitized.title,
      slugId: '',
      excerpt: sanitized.excerpt,
      content: sanitized.content,
      altText: sanitized.altText,
      metaTitle: sanitized.metaTitle,
      metaDescription: sanitized.metaDescription,
      keywords: sanitized.keywords,
      validation: {
        isValid: false,
        errors,
        warnings,
      },
    };
  }
}

/**
 * Validate a single field value
 * Used for field regeneration validation
 */
export function validateField(
  field: 'title' | 'excerpt' | 'content' | 'seoTitle' | 'seoDescription' | 'keywords',
  value: string | string[]
): { isValid: boolean; error?: string } {
  try {
    switch (field) {
      case 'title':
        z.string().min(10).max(200).parse(value);
        break;
      case 'excerpt':
        z.string().min(50).max(300).parse(value);
        break;
      case 'content':
        z.string().min(500).parse(value);
        break;
      case 'seoTitle':
        z.string().min(10).max(60).parse(value);
        break;
      case 'seoDescription':
        z.string().min(50).max(160).parse(value);
        break;
      case 'keywords':
        z.array(z.string()).min(3).max(10).parse(value);
        break;
    }
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.issues[0].message };
    }
    return { isValid: false, error: 'Validation failed' };
  }
}
